import os
import shutil
import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.database import get_db
from app import models, schemas, auth
from app.services.maps_service import calculate_live_distance

router = APIRouter(prefix="/api/patient", tags=["Patient Services"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.get("/search", response_model=schemas.PatientSearchResponse)
def search_medicines(
    q: str = Query(..., min_length=1, description="Medicine brand name or salt/generic name"),
    lat: float = Query(12.9716, description="Patient current latitude"),
    lng: float = Query(77.5946, description="Patient current longitude"),
    db: Session = Depends(get_db)
):
    clean_q = q.strip().lower()

    # Step 1: Find matching medicines (fuzzy/partial match on name or generic_name)
    matching_medicines = db.query(models.Medicine).filter(
        or_(
            func.lower(models.Medicine.name).contains(clean_q),
            func.lower(models.Medicine.generic_name).contains(clean_q)
        )
    ).all()

    if not matching_medicines:
        return {
            "query": q,
            "exact_matches": [],
            "generic_alternatives": [],
            "total_found": 0
        }

    # Identify exact/primary matching medicine IDs and their associated salt names
    primary_med_ids = [m.id for m in matching_medicines]
    generic_salts = list(set([m.generic_name.lower() for m in matching_medicines]))

    # Step 2: Query live stock from single source database
    stocks = db.query(models.Stock).join(models.Pharmacy).join(models.Medicine).filter(
        models.Stock.medicine_id.in_(primary_med_ids)
    ).all()

    # Build result cards for primary matches
    exact_cards = []
    for stock in stocks:
        pharmacy = stock.pharmacy
        med = stock.medicine

        # Compute live distance
        dist_info = calculate_live_distance(lat, lng, pharmacy.latitude, pharmacy.longitude)

        # Compute stock badge status
        if stock.quantity > 10:
            status_badge = "In Stock"
        elif stock.quantity > 0:
            status_badge = "Low Stock"
        else:
            status_badge = "Out of Stock"

        exact_cards.append(schemas.MedicineSearchResultCard(
            stock_id=stock.id,
            pharmacy_id=pharmacy.id,
            pharmacy_name=pharmacy.name,
            pharmacy_address=f"{pharmacy.address}, {pharmacy.city} - {pharmacy.pincode}",
            pharmacy_phone=pharmacy.phone,
            pharmacy_whatsapp=pharmacy.whatsapp_number,
            latitude=pharmacy.latitude,
            longitude=pharmacy.longitude,
            medicine_id=med.id,
            medicine_name=med.name,
            generic_name=med.generic_name,
            category=med.category,
            price=stock.price,
            quantity=stock.quantity,
            stock_status=status_badge,
            batch_id=stock.batch_id,
            expiry_date=stock.expiry_date,
            last_updated=stock.last_updated,
            distance_km=dist_info["distance_km"],
            estimated_time_mins=dist_info["estimated_time_mins"],
            is_exact_match=True
        ))

    # Sort exact cards by distance
    exact_cards.sort(key=lambda x: x.distance_km)

    # Step 3: Generic / Same-Salt Alternatives
    # Find other medicines sharing the same generic salt that were not in the primary query set
    alt_medicines = db.query(models.Medicine).filter(
        func.lower(models.Medicine.generic_name).in_(generic_salts),
        models.Medicine.id.not_in(primary_med_ids)
    ).all()

    alt_med_ids = [m.id for m in alt_medicines]
    alt_cards = []
    if alt_med_ids:
        alt_stocks = db.query(models.Stock).join(models.Pharmacy).join(models.Medicine).filter(
            models.Stock.medicine_id.in_(alt_med_ids),
            models.Stock.quantity > 0
        ).all()

        for stock in alt_stocks:
            pharmacy = stock.pharmacy
            med = stock.medicine
            dist_info = calculate_live_distance(lat, lng, pharmacy.latitude, pharmacy.longitude)

            status_badge = "In Stock" if stock.quantity > 10 else "Low Stock"

            alt_cards.append(schemas.MedicineSearchResultCard(
                stock_id=stock.id,
                pharmacy_id=pharmacy.id,
                pharmacy_name=pharmacy.name,
                pharmacy_address=f"{pharmacy.address}, {pharmacy.city} - {pharmacy.pincode}",
                pharmacy_phone=pharmacy.phone,
                pharmacy_whatsapp=pharmacy.whatsapp_number,
                latitude=pharmacy.latitude,
                longitude=pharmacy.longitude,
                medicine_id=med.id,
                medicine_name=med.name,
                generic_name=med.generic_name,
                category=med.category,
                price=stock.price,
                quantity=stock.quantity,
                stock_status=status_badge,
                batch_id=stock.batch_id,
                expiry_date=stock.expiry_date,
                last_updated=stock.last_updated,
                distance_km=dist_info["distance_km"],
                estimated_time_mins=dist_info["estimated_time_mins"],
                is_exact_match=False
            ))
        alt_cards.sort(key=lambda x: x.distance_km)

    return {
        "query": q,
        "exact_matches": exact_cards,
        "generic_alternatives": alt_cards,
        "total_found": len(exact_cards) + len(alt_cards)
    }

@router.get("/categories")
def get_categories(db: Session = Depends(get_db)):
    categories = [
        {"name": "Fever & Pain", "icon": "Thermometer", "description": "Paracetamol, Crocin, Dolo 650, Combiflam"},
        {"name": "Diabetes", "icon": "Activity", "description": "Metformin, Glimepiride, Insulin, Januvia"},
        {"name": "BP & Heart", "icon": "Heart", "description": "Telmisartan, Amlodipine, Atorvastatin"},
        {"name": "Antibiotics", "icon": "ShieldAlert", "description": "Azithromycin, Amoxicillin, Augmentin"},
        {"name": "Baby Care", "icon": "Baby", "description": "Calpol drops, Gripe Water, Infant Formula"},
        {"name": "Skin Care", "icon": "Sparkles", "description": "Panderm, Betnovate, Antifungal Cream"},
        {"name": "Digestive & Acidity", "icon": "Pill", "description": "Pantocid 40, Gelusil, Digene, Omez"}
    ]
    return categories

@router.post("/prescriptions/upload", response_model=schemas.PrescriptionResponse)
def upload_prescription(
    pharmacy_id: int = Form(...),
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    pharmacy = db.query(models.Pharmacy).filter(models.Pharmacy.id == pharmacy_id).first()
    if not pharmacy:
        raise HTTPException(status_code=404, detail="Pharmacy not found")

    file_ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    unique_filename = f"prescription_{uuid.uuid4().hex}.{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    image_url = f"/uploads/{unique_filename}"

    # Structured extension point for future OCR/AI auto-parsing
    ocr_stub = {
        "status": "pending_ai_processing",
        "detected_medicines_stub": [],
        "confidence_score": 0.0,
        "extension_note": "Future AI OCR pipeline will inject parsed medicine/dosage tuples here"
    }

    presc = models.PrescriptionUpload(
        patient_id=current_user.id,
        pharmacy_id=pharmacy.id,
        image_url=image_url,
        status="pending",
        ocr_parsed_data=str(ocr_stub)
    )
    db.add(presc)
    db.commit()
    db.refresh(presc)

    return schemas.PrescriptionResponse(
        id=presc.id,
        patient_id=presc.patient_id,
        pharmacy_id=presc.pharmacy_id,
        pharmacy_name=pharmacy.name,
        image_url=presc.image_url,
        status=presc.status,
        notes=presc.notes,
        timestamp=presc.timestamp
    )

@router.get("/faqs", response_model=List[schemas.FAQResponse])
def get_faqs(db: Session = Depends(get_db)):
    faqs = db.query(models.FAQ).order_by(models.FAQ.order_index.asc()).all()
    return faqs

@router.post("/feedback", response_model=schemas.FeedbackResponse)
def submit_feedback(
    feedback_data: schemas.FeedbackCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    pharmacy_name = None
    if feedback_data.pharmacy_id:
        pharmacy = db.query(models.Pharmacy).filter(models.Pharmacy.id == feedback_data.pharmacy_id).first()
        if pharmacy:
            pharmacy_name = pharmacy.name

    fb = models.Feedback(
        patient_id=current_user.id,
        pharmacy_id=feedback_data.pharmacy_id,
        rating=feedback_data.rating,
        comment=feedback_data.comment
    )
    db.add(fb)
    db.commit()
    db.refresh(fb)

    return schemas.FeedbackResponse(
        id=fb.id,
        patient_id=fb.patient_id,
        patient_name=current_user.full_name,
        pharmacy_id=fb.pharmacy_id,
        pharmacy_name=pharmacy_name,
        rating=fb.rating,
        comment=fb.comment,
        timestamp=fb.timestamp
    )
