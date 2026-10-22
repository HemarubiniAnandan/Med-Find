import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False, default="patient") # 'patient' or 'pharmacy'
    full_name = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    pharmacy = relationship("Pharmacy", back_populates="user", uselist=False)
    prescriptions = relationship("PrescriptionUpload", back_populates="patient")
    feedbacks = relationship("Feedback", back_populates="patient")

class Pharmacy(Base):
    __tablename__ = "pharmacies"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    name = Column(String, nullable=False, index=True)
    address = Column(Text, nullable=False)
    city = Column(String, nullable=False, default="Bengaluru")
    pincode = Column(String, nullable=False, default="560001")
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    phone = Column(String, nullable=False)
    whatsapp_number = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="pharmacy")
    stocks = relationship("Stock", back_populates="pharmacy", cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessage", back_populates="pharmacy")
    prescriptions = relationship("PrescriptionUpload", back_populates="pharmacy")
    feedbacks = relationship("Feedback", back_populates="pharmacy")

class Medicine(Base):
    __tablename__ = "medicines"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True) # Brand name e.g. Crocin, Dolo 650
    generic_name = Column(String, nullable=False, index=True) # Salt name e.g. Paracetamol
    category = Column(String, nullable=False, index=True) # Fever & Pain, Diabetes, BP, Antibiotics, Baby Care, Skin Care
    manufacturer = Column(String, nullable=True)
    dosage_form = Column(String, nullable=True, default="Tablet") # Tablet, Syrup, Injection, Cream

    stocks = relationship("Stock", back_populates="medicine", cascade="all, delete-orphan")

class Stock(Base):
    __tablename__ = "stock"

    id = Column(Integer, primary_key=True, index=True)
    pharmacy_id = Column(Integer, ForeignKey("pharmacies.id"), nullable=False, index=True)
    medicine_id = Column(Integer, ForeignKey("medicines.id"), nullable=False, index=True)
    batch_id = Column(String, nullable=False, default="BATCH-001")
    quantity = Column(Integer, nullable=False, default=0)
    price = Column(Float, nullable=False, default=0.0) # INR
    expiry_date = Column(String, nullable=False, default="2026-12-31")
    last_updated = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    pharmacy = relationship("Pharmacy", back_populates="stocks")
    medicine = relationship("Medicine", back_populates="stocks")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    pharmacy_id = Column(Integer, ForeignKey("pharmacies.id"), nullable=False)
    message = Column(Text, nullable=False)
    direction = Column(String, nullable=False, default="outbound") # 'outbound' (patient->pharmacy) or 'inbound' (pharmacy->patient)
    twilio_sid = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    pharmacy = relationship("Pharmacy", back_populates="chat_messages")

class PrescriptionUpload(Base):
    __tablename__ = "prescription_uploads"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    pharmacy_id = Column(Integer, ForeignKey("pharmacies.id"), nullable=False)
    image_url = Column(String, nullable=False)
    status = Column(String, nullable=False, default="pending") # 'pending', 'verified', 'rejected'
    notes = Column(Text, nullable=True)
    # Extension point metadata for future OCR/AI parsing
    ocr_parsed_data = Column(Text, nullable=True) # JSON stub for future AI auto-suggest
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    patient = relationship("User", back_populates="prescriptions")
    pharmacy = relationship("Pharmacy", back_populates="prescriptions")

class FAQ(Base):
    __tablename__ = "faqs"

    id = Column(Integer, primary_key=True, index=True)
    question = Column(String, nullable=False)
    answer = Column(Text, nullable=False)
    category = Column(String, nullable=False, default="General")
    order_index = Column(Integer, default=0)

class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    pharmacy_id = Column(Integer, ForeignKey("pharmacies.id"), nullable=True)
    rating = Column(Integer, nullable=False, default=5) # 1 to 5 stars
    comment = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    patient = relationship("User", back_populates="feedbacks")
    pharmacy = relationship("Pharmacy", back_populates="feedbacks")
