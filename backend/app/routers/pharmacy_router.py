import io
import datetime
from typing import List, Optional
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app import models, schemas, auth

router = APIRouter(prefix="/api/pharmacy", tags=["Pharmacy Inventory & Operations"])

def get_current_pharmacy(current_user: models.User = Depends(auth.require_role("pharmacy")), db: Session = Depends(get_db)) -> models.Pharmacy:
    pharmacy = db.query(models.Pharmacy).filter(models.Pharmacy.user_id == current_user.id).first()
    if not pharmacy:
        raise HTTPException(status_code=404, detail="Pharmacy profile not found for this user account")
    return pharmacy

@router.get("/stock", response_model=List[schemas.StockResponse])
def get_pharmacy_stock(
    pharmacy: models.Pharmacy = Depends(get_current_pharmacy),
    db: Session = Depends(get_db)
):
    stocks = db.query(models.Stock).filter(models.Stock.pharmacy_id == pharmacy.id).all()
    result = []
    for s in stocks:
        result.append(schemas.StockResponse(
            id=s.id,
            pharmacy_id=s.pharmacy_id,
            medicine_id=s.medicine_id,
            medicine_name=s.medicine.name,
            generic_name=s.medicine.generic_name,
            category=s.medicine.category,
            batch_id=s.batch_id,
            quantity=s.quantity,
            price=s.price,
            expiry_date=s.expiry_date,
            last_updated=s.last_updated
        ))
    return result

@router.post("/stock", response_model=schemas.StockResponse)
def add_or_update_stock_item(
    stock_data: schemas.StockCreate,
    pharmacy: models.Pharmacy = Depends(get_current_pharmacy),
    db: Session = Depends(get_db)
):
    clean_med_name = stock_data.medicine_name.strip()
    clean_generic_name = stock_data.generic_name.strip()

    # Find or create medicine entry in master catalog
    medicine = db.query(models.Medicine).filter(
        func.lower(models.Medicine.name) == clean_med_name.lower()
    ).first()

    if not medicine:
        medicine = models.Medicine(
            name=clean_med_name,
            generic_name=clean_generic_name,
            category=stock_data.category or "General"
        )
        db.add(medicine)
        db.commit()
        db.refresh(medicine)

    # Check for existing stock row for this pharmacy + medicine + batch_id/expiry
    existing_stock = db.query(models.Stock).filter(
        models.Stock.pharmacy_id == pharmacy.id,
        models.Stock.medicine_id == medicine.id,
        models.Stock.batch_id == stock_data.batch_id
    ).first()

    if existing_stock:
        # Increment existing stock quantity (NEVER silently replace)
        existing_stock.quantity += stock_data.quantity
        existing_stock.price = stock_data.price
        existing_stock.expiry_date = stock_data.expiry_date
        existing_stock.last_updated = datetime.datetime.utcnow()
        db.commit()
        db.refresh(existing_stock)
        stock_record = existing_stock
    else:
        # Create new batch row
        stock_record = models.Stock(
            pharmacy_id=pharmacy.id,
            medicine_id=medicine.id,
            batch_id=stock_data.batch_id,
            quantity=stock_data.quantity,
            price=stock_data.price,
            expiry_date=stock_data.expiry_date,
            last_updated=datetime.datetime.utcnow()
        )
        db.add(stock_record)
        db.commit()
        db.refresh(stock_record)

    return schemas.StockResponse(
        id=stock_record.id,
        pharmacy_id=stock_record.pharmacy_id,
        medicine_id=stock_record.medicine_id,
        medicine_name=medicine.name,
        generic_name=medicine.generic_name,
        category=medicine.category,
        batch_id=stock_record.batch_id,
        quantity=stock_record.quantity,
        price=stock_record.price,
        expiry_date=stock_record.expiry_date,
        last_updated=stock_record.last_updated
    )

@router.put("/stock/{stock_id}", response_model=schemas.StockResponse)
def update_stock_inline(
    stock_id: int,
    update_data: schemas.StockUpdate,
    pharmacy: models.Pharmacy = Depends(get_current_pharmacy),
    db: Session = Depends(get_db)
):
    stock_record = db.query(models.Stock).filter(
        models.Stock.id == stock_id,
        models.Stock.pharmacy_id == pharmacy.id
    ).first()

    if not stock_record:
        raise HTTPException(status_code=404, detail="Stock item not found")

    stock_record.quantity = update_data.quantity
    if update_data.price is not None:
        stock_record.price = update_data.price
    stock_record.last_updated = datetime.datetime.utcnow()
    db.commit()
    db.refresh(stock_record)

    return schemas.StockResponse(
        id=stock_record.id,
        pharmacy_id=stock_record.pharmacy_id,
        medicine_id=stock_record.medicine_id,
        medicine_name=stock_record.medicine.name,
        generic_name=stock_record.medicine.generic_name,
        category=stock_record.medicine.category,
        batch_id=stock_record.batch_id,
        quantity=stock_record.quantity,
        price=stock_record.price,
        expiry_date=stock_record.expiry_date,
        last_updated=stock_record.last_updated
    )

@router.post("/stock/upload-csv")
def bulk_upload_csv(
    file: UploadFile = File(...),
    pharmacy: models.Pharmacy = Depends(get_current_pharmacy),
    db: Session = Depends(get_db)
):
    """
    Bulk upload current stock via CSV or Excel file.
    Expected headers: medicine_name, generic_name, category, batch_id, quantity, price, expiry_date
    """
    try:
        contents = file.file.read()
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid file format or corrupt CSV/Excel: {str(e)}")

    required_cols = ["medicine_name", "generic_name", "category", "batch_id", "quantity", "price", "expiry_date"]
    for col in required_cols:
        if col not in df.columns:
            raise HTTPException(status_code=400, detail=f"Missing required CSV column: {col}")

    processed_count = 0
    for _, row in df.iterrows():
        med_name = str(row["medicine_name"]).strip()
        gen_name = str(row["generic_name"]).strip()
        cat = str(row["category"]).strip()
        batch = str(row["batch_id"]).strip()
        qty = int(row["quantity"])
        price = float(row["price"])
        exp = str(row["expiry_date"]).strip()

        # Find or create medicine
        med = db.query(models.Medicine).filter(func.lower(models.Medicine.name) == med_name.lower()).first()
        if not med:
            med = models.Medicine(name=med_name, generic_name=gen_name, category=cat)
            db.add(med)
            db.commit()
            db.refresh(med)

        # Check existing stock
        stk = db.query(models.Stock).filter(
            models.Stock.pharmacy_id == pharmacy.id,
            models.Stock.medicine_id == med.id,
            models.Stock.batch_id == batch
        ).first()

        if stk:
            stk.quantity += qty # Increment existing quantity
            stk.price = price
            stk.expiry_date = exp
            stk.last_updated = datetime.datetime.utcnow()
        else:
            stk = models.Stock(
                pharmacy_id=pharmacy.id,
                medicine_id=med.id,
                batch_id=batch,
                quantity=qty,
                price=price,
                expiry_date=exp,
                last_updated=datetime.datetime.utcnow()
            )
            db.add(stk)
        processed_count += 1

    db.commit()
    return {"message": f"Successfully processed {processed_count} stock records"}

# Schema extension point for future POS / Billing Barcode Scanner integration
@router.post("/stock/pos-decrement")
def pos_barcode_decrement(
    barcode_id: str,
    sold_quantity: int = 1,
    pharmacy: models.Pharmacy = Depends(get_current_pharmacy),
    db: Session = Depends(get_db)
):
    """
    Schema-ready extension point: Decrements stock matching batch/barcode on invoice generation.
    """
    stk = db.query(models.Stock).filter(
        models.Stock.pharmacy_id == pharmacy.id,
        models.Stock.batch_id == barcode_id
    ).first()

    if not stk:
        raise HTTPException(status_code=404, detail="Barcode/Batch ID not found in pharmacy inventory")

    if stk.quantity < sold_quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock quantity available")

    stk.quantity -= sold_quantity
    stk.last_updated = datetime.datetime.utcnow()
    db.commit()
    db.refresh(stk)
    return {"message": "Stock decremented successfully via POS interface", "new_quantity": stk.quantity}

@router.get("/prescriptions", response_model=List[schemas.PrescriptionResponse])
def get_pharmacy_prescriptions(
    pharmacy: models.Pharmacy = Depends(get_current_pharmacy),
    db: Session = Depends(get_db)
):
    prescs = db.query(models.PrescriptionUpload).filter(models.PrescriptionUpload.pharmacy_id == pharmacy.id).all()
    result = []
    for p in prescs:
        result.append(schemas.PrescriptionResponse(
            id=p.id,
            patient_id=p.patient_id,
            pharmacy_id=p.pharmacy_id,
            pharmacy_name=pharmacy.name,
            image_url=p.image_url,
            status=p.status,
            notes=p.notes,
            timestamp=p.timestamp
        ))
    return result

@router.put("/prescriptions/{presc_id}/status")
def update_prescription_status(
    presc_id: int,
    status_update: schemas.PrescriptionStatusUpdate,
    pharmacy: models.Pharmacy = Depends(get_current_pharmacy),
    db: Session = Depends(get_db)
):
    presc = db.query(models.PrescriptionUpload).filter(
        models.PrescriptionUpload.id == presc_id,
        models.PrescriptionUpload.pharmacy_id == pharmacy.id
    ).first()

    if not presc:
        raise HTTPException(status_code=404, detail="Prescription entry not found")

    presc.status = status_update.status
    if status_update.notes:
        presc.notes = status_update.notes
    db.commit()
    return {"message": "Prescription status updated successfully", "status": presc.status}

@router.get("/feedback", response_model=List[schemas.FeedbackResponse])
def get_store_feedback(
    pharmacy: models.Pharmacy = Depends(get_current_pharmacy),
    db: Session = Depends(get_db)
):
    feedbacks = db.query(models.Feedback).filter(models.Feedback.pharmacy_id == pharmacy.id).all()
    res = []
    for f in feedbacks:
        res.append(schemas.FeedbackResponse(
            id=f.id,
            patient_id=f.patient_id,
            patient_name=f.patient.full_name if f.patient else "Patient",
            pharmacy_id=f.pharmacy_id,
            pharmacy_name=pharmacy.name,
            rating=f.rating,
            comment=f.comment,
            timestamp=f.timestamp
        ))
    return res
