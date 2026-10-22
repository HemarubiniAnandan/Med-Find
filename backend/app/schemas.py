from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# --- Auth Schemas ---
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    role: str # 'patient' or 'pharmacy'
    full_name: str
    phone: Optional[str] = None
    # Pharmacy fields if role == 'pharmacy'
    pharmacy_name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = "Bengaluru"
    pincode: Optional[str] = "560001"
    latitude: Optional[float] = 12.9716
    longitude: Optional[float] = 77.5946
    whatsapp_number: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    user_id: int
    full_name: str
    pharmacy_id: Optional[int] = None

class UserResponse(BaseModel):
    id: int
    email: str
    role: str
    full_name: str
    phone: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True

# --- Pharmacy & Medicine Schemas ---
class MedicineSchema(BaseModel):
    id: int
    name: str
    generic_name: str
    category: str
    manufacturer: Optional[str] = None
    dosage_form: Optional[str] = None
    class Config:
        from_attributes = True

class PharmacySchema(BaseModel):
    id: int
    name: str
    address: str
    city: str
    pincode: str
    latitude: float
    longitude: float
    phone: str
    whatsapp_number: str
    class Config:
        from_attributes = True

class StockCreate(BaseModel):
    medicine_name: str
    generic_name: str
    category: str
    batch_id: str
    quantity: int
    price: float
    expiry_date: str

class StockUpdate(BaseModel):
    quantity: int
    price: Optional[float] = None

class StockResponse(BaseModel):
    id: int
    pharmacy_id: int
    medicine_id: int
    medicine_name: str
    generic_name: str
    category: str
    batch_id: str
    quantity: int
    price: float
    expiry_date: str
    last_updated: datetime
    class Config:
        from_attributes = True

# --- Search Schemas ---
class MedicineSearchResultCard(BaseModel):
    stock_id: int
    pharmacy_id: int
    pharmacy_name: str
    pharmacy_address: str
    pharmacy_phone: str
    pharmacy_whatsapp: str
    latitude: float
    longitude: float
    medicine_id: int
    medicine_name: str
    generic_name: str
    category: str
    price: float
    quantity: int
    stock_status: str # 'In Stock', 'Low Stock', 'Out of Stock'
    batch_id: str
    expiry_date: str
    last_updated: datetime
    distance_km: float
    estimated_time_mins: int
    is_exact_match: bool = True

class PatientSearchResponse(BaseModel):
    query: str
    exact_matches: List[MedicineSearchResultCard]
    generic_alternatives: List[MedicineSearchResultCard]
    total_found: int

# --- Chat & Messaging Schemas ---
class SendChatMessage(BaseModel):
    pharmacy_id: int
    message: str

class ChatMessageResponse(BaseModel):
    id: int
    patient_id: int
    pharmacy_id: int
    message: str
    direction: str
    twilio_sid: Optional[str]
    timestamp: datetime
    class Config:
        from_attributes = True

# --- Prescription Upload Schemas ---
class PrescriptionResponse(BaseModel):
    id: int
    patient_id: int
    pharmacy_id: int
    pharmacy_name: str
    image_url: str
    status: str
    notes: Optional[str]
    timestamp: datetime
    class Config:
        from_attributes = True

class PrescriptionStatusUpdate(BaseModel):
    status: str # 'verified' or 'rejected'
    notes: Optional[str] = None

# --- FAQ & Feedback Schemas ---
class FAQResponse(BaseModel):
    id: int
    question: str
    answer: str
    category: str
    order_index: int
    class Config:
        from_attributes = True

class FeedbackCreate(BaseModel):
    pharmacy_id: Optional[int] = None
    rating: int
    comment: str

class FeedbackResponse(BaseModel):
    id: int
    patient_id: int
    patient_name: str
    pharmacy_id: Optional[int]
    pharmacy_name: Optional[str]
    rating: int
    comment: str
    timestamp: datetime
    class Config:
        from_attributes = True
