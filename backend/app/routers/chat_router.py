import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Form
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth
from app.services.twilio_service import send_whatsapp_message

router = APIRouter(prefix="/api/chat", tags=["WhatsApp Messaging"])

@router.post("/send", response_model=schemas.ChatMessageResponse)
def send_chat_message(
    msg_data: schemas.SendChatMessage,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    pharmacy = db.query(models.Pharmacy).filter(models.Pharmacy.id == msg_data.pharmacy_id).first()
    if not pharmacy:
        raise HTTPException(status_code=404, detail="Pharmacy not found")

    # Determine direction
    direction = "outbound" if current_user.role == "patient" else "inbound"

    # Send outbound WhatsApp message via Twilio API
    recipient_phone = pharmacy.whatsapp_number if current_user.role == "patient" else (current_user.phone or "+919876543210")
    twilio_res = send_whatsapp_message(to_phone=recipient_phone, message_body=msg_data.message)

    # Persist message thread in single source DB
    chat_msg = models.ChatMessage(
        patient_id=current_user.id if current_user.role == "patient" else 1, # fallback patient_id if pharmacy replies
        pharmacy_id=pharmacy.id,
        message=msg_data.message,
        direction=direction,
        twilio_sid=twilio_res.get("twilio_sid"),
        timestamp=datetime.datetime.utcnow()
    )
    db.add(chat_msg)
    db.commit()
    db.refresh(chat_msg)

    return schemas.ChatMessageResponse(
        id=chat_msg.id,
        patient_id=chat_msg.patient_id,
        pharmacy_id=chat_msg.pharmacy_id,
        message=chat_msg.message,
        direction=chat_msg.direction,
        twilio_sid=chat_msg.twilio_sid,
        timestamp=chat_msg.timestamp
    )

@router.get("/thread", response_model=List[schemas.ChatMessageResponse])
def get_chat_thread(
    pharmacy_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves full message thread history for patient-pharmacy pair.
    """
    if current_user.role == "patient":
        patient_id = current_user.id
    else:
        # Pharmacy view
        pharmacy = db.query(models.Pharmacy).filter(models.Pharmacy.user_id == current_user.id).first()
        if not pharmacy:
            raise HTTPException(status_code=404, detail="Pharmacy profile not found")
        pharmacy_id = pharmacy.id
        patient_id = None # Return all messages for this pharmacy

    query = db.query(models.ChatMessage).filter(models.ChatMessage.pharmacy_id == pharmacy_id)
    if patient_id:
        query = query.filter(models.ChatMessage.patient_id == patient_id)

    messages = query.order_by(models.ChatMessage.timestamp.asc()).all()

    res = []
    for m in messages:
        res.append(schemas.ChatMessageResponse(
            id=m.id,
            patient_id=m.patient_id,
            pharmacy_id=m.pharmacy_id,
            message=m.message,
            direction=m.direction,
            twilio_sid=m.twilio_sid,
            timestamp=m.timestamp
        ))
    return res

@router.post("/webhook")
async def twilio_whatsapp_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Twilio inbound WhatsApp webhook endpoint.
    Receives incoming WhatsApp messages from pharmacies or patients on phone,
    and updates the database chat thread in real-time.
    """
    form_data = await request.form()
    from_number = form_data.get("From", "") # e.g. "whatsapp:+919876543210"
    body = form_data.get("Body", "")
    message_sid = form_data.get("MessageSid", "")

    clean_phone = from_number.replace("whatsapp:", "").strip()

    # Find if phone matches a pharmacy or user
    pharmacy = db.query(models.Pharmacy).filter(
        (models.Pharmacy.phone == clean_phone) | (models.Pharmacy.whatsapp_number == clean_phone)
    ).first()

    patient_user = db.query(models.User).filter(models.User.phone == clean_phone).first()

    if pharmacy:
        # Message comes from pharmacy -> inbound reply to recent patient
        last_msg = db.query(models.ChatMessage).filter(models.ChatMessage.pharmacy_id == pharmacy.id).order_by(models.ChatMessage.timestamp.desc()).first()
        patient_id = last_msg.patient_id if last_msg else 1
        direction = "inbound"
        pharmacy_id = pharmacy.id
    elif patient_user:
        # Message comes from patient
        direction = "outbound"
        patient_id = patient_user.id
        pharmacy_id = 1
    else:
        direction = "outbound"
        patient_id = 1
        pharmacy_id = 1

    new_msg = models.ChatMessage(
        patient_id=patient_id,
        pharmacy_id=pharmacy_id,
        message=body,
        direction=direction,
        twilio_sid=message_sid,
        timestamp=datetime.datetime.utcnow()
    )
    db.add(new_msg)
    db.commit()

    return {"status": "success", "message": "Inbound webhook processed"}
