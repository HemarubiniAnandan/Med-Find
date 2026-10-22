import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import engine, Base
from app.seed import seed_database
from app.routers import auth_router, patient_router, pharmacy_router, chat_router

# Initialize Database tables
Base.metadata.create_all(bind=engine)

# Seed initial Indian market dataset
seed_database()

app = FastAPI(
    title="MedFind API - Real-Time Medicine Stock Locator",
    description="Real-time Indian market medicine stock locator backend connecting patients and pharmacies with direct DB query, Google Maps distance matrix, Twilio WhatsApp chat, and CSV inventory management.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure uploads directory exists and mount as static endpoint
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Include Routers
app.include_router(auth_router.router)
app.include_router(patient_router.router)
app.include_router(pharmacy_router.router)
app.include_router(chat_router.router)

@app.get("/")
def root():
    return {
        "app": "MedFind API - Real-Time Medicine Stock Locator",
        "status": "online",
        "docs": "/docs",
        "redoc": "/redoc"
    }
