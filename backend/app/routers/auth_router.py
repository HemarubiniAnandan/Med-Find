from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas, auth

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=schemas.Token)
def register(user_data: schemas.UserRegister, db: Session = Depends(get_db)):
    # Check if user already exists
    existing = db.query(models.User).filter(models.User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    hashed_pwd = auth.get_password_hash(user_data.password)
    user = models.User(
        email=user_data.email,
        hashed_password=hashed_pwd,
        role=user_data.role,
        full_name=user_data.full_name,
        phone=user_data.phone
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    pharmacy_id = None
    if user_data.role == "pharmacy":
        pharmacy = models.Pharmacy(
            user_id=user.id,
            name=user_data.pharmacy_name or f"{user_data.full_name}'s Medical Store",
            address=user_data.address or "MG Road, Indiranagar",
            city=user_data.city or "Bengaluru",
            pincode=user_data.pincode or "560001",
            latitude=user_data.latitude or 12.9716,
            longitude=user_data.longitude or 77.5946,
            phone=user_data.phone or "+919876543210",
            whatsapp_number=user_data.whatsapp_number or (user_data.phone or "+919876543210")
        )
        db.add(pharmacy)
        db.commit()
        db.refresh(pharmacy)
        pharmacy_id = pharmacy.id

    access_token = auth.create_access_token(data={"sub": user.email, "role": user.role, "user_id": user.id})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "user_id": user.id,
        "full_name": user.full_name,
        "pharmacy_id": pharmacy_id
    }

@router.post("/login", response_model=schemas.Token)
def login(login_data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == login_data.email).first()
    if not user or not auth.verify_password(login_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    pharmacy_id = user.pharmacy.id if user.pharmacy else None

    access_token = auth.create_access_token(data={"sub": user.email, "role": user.role, "user_id": user.id})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "user_id": user.id,
        "full_name": user.full_name,
        "pharmacy_id": pharmacy_id
    }

@router.get("/me")
def get_me(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    pharmacy_id = current_user.pharmacy.id if current_user.pharmacy else None
    return {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role,
        "full_name": current_user.full_name,
        "phone": current_user.phone,
        "pharmacy_id": pharmacy_id
    }
