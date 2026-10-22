import datetime
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app import models, auth

def seed_database():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        # Check if already seeded
        if db.query(models.User).filter(models.User.email == "patient@medfind.in").first():
            print("[Seed] Database already seeded.")
            return

        print("[Seed] Seeding MedFind Indian Healthcare Database...")

        # 1. Create Default Users
        pwd_patient = auth.get_password_hash("patient123")
        pwd_pharmacy = auth.get_password_hash("pharmacy123")

        patient_user = models.User(
            email="patient@medfind.in",
            hashed_password=pwd_patient,
            role="patient",
            full_name="Rajesh Kumar",
            phone="+919876543210"
        )
        db.add(patient_user)

        pharmacy_user1 = models.User(
            email="apollo@medfind.in",
            hashed_password=pwd_pharmacy,
            role="pharmacy",
            full_name="Apollo Pharmacy Manager",
            phone="+919812345678"
        )
        db.add(pharmacy_user1)

        pharmacy_user2 = models.User(
            email="medplus@medfind.in",
            hashed_password=pwd_pharmacy,
            role="pharmacy",
            full_name="MedPlus Pharmacy Manager",
            phone="+919823456789"
        )
        db.add(pharmacy_user2)

        pharmacy_user3 = models.User(
            email="wellness@medfind.in",
            hashed_password=pwd_pharmacy,
            role="pharmacy",
            full_name="Wellness Forever Manager",
            phone="+919834567890"
        )
        db.add(pharmacy_user3)

        db.commit()

        # 2. Create Pharmacies (Bengaluru context coordinates)
        p1 = models.Pharmacy(
            user_id=pharmacy_user1.id,
            name="Apollo Pharmacy - Indiranagar",
            address="100 Feet Road, 12th Main, Indiranagar",
            city="Bengaluru",
            pincode="560038",
            latitude=12.9784,
            longitude=77.6408,
            phone="+918025201122",
            whatsapp_number="+919812345678"
        )
        p2 = models.Pharmacy(
            user_id=pharmacy_user2.id,
            name="MedPlus Pharmacy - Koramangala",
            address="80 Feet Road, 4th Block, Koramangala",
            city="Bengaluru",
            pincode="560034",
            latitude=12.9345,
            longitude=77.6242,
            phone="+918025534455",
            whatsapp_number="+919823456789"
        )
        p3 = models.Pharmacy(
            user_id=pharmacy_user3.id,
            name="Wellness Forever - Whitefield",
            address="Main Road, ITPL Back Gate, Whitefield",
            city="Bengaluru",
            pincode="560066",
            latitude=12.9698,
            longitude=77.7499,
            phone="+918028456677",
            whatsapp_number="+919834567890"
        )
        db.add_all([p1, p2, p3])
        db.commit()

        # 3. Create Medicines Catalog (Indian Market Context)
        medicines_list = [
            # Fever & Pain
            models.Medicine(name="Dolo 650", generic_name="Paracetamol", category="Fever & Pain", manufacturer="Micro Labs", dosage_form="Tablet"),
            models.Medicine(name="Crocin 650", generic_name="Paracetamol", category="Fever & Pain", manufacturer="GlaxoSmithKline", dosage_form="Tablet"),
            models.Medicine(name="Calpol 500", generic_name="Paracetamol", category="Fever & Pain", manufacturer="GSK", dosage_form="Tablet"),
            models.Medicine(name="Combiflam", generic_name="Ibuprofen + Paracetamol", category="Fever & Pain", manufacturer="Sanofi", dosage_form="Tablet"),
            
            # Diabetes
            models.Medicine(name="Metformin 500mg", generic_name="Metformin", category="Diabetes", manufacturer="USV Pvt Ltd", dosage_form="Tablet"),
            models.Medicine(name="Glycomet GP2", generic_name="Metformin + Glimepiride", category="Diabetes", manufacturer="USV", dosage_form="Tablet"),
            models.Medicine(name="Januvia 100", generic_name="Sitagliptin", category="Diabetes", manufacturer="MSD", dosage_form="Tablet"),
            
            # BP & Heart
            models.Medicine(name="Telma 40", generic_name="Telmisartan", category="BP & Heart", manufacturer="Glenmark", dosage_form="Tablet"),
            models.Medicine(name="Amlokind 5", generic_name="Amlodipine", category="BP & Heart", manufacturer="Mankind", dosage_form="Tablet"),
            models.Medicine(name="Atorva 10", generic_name="Atorvastatin", category="BP & Heart", manufacturer="Zydus", dosage_form="Tablet"),
            
            # Antibiotics
            models.Medicine(name="Azithral 500", generic_name="Azithromycin", category="Antibiotics", manufacturer="Alembic", dosage_form="Tablet"),
            models.Medicine(name="Augmentin 625 Duo", generic_name="Amoxicillin + Clavulanic Acid", category="Antibiotics", manufacturer="GSK", dosage_form="Tablet"),
            models.Medicine(name="Ciplox 500", generic_name="Ciprofloxacin", category="Antibiotics", manufacturer="Cipla", dosage_form="Tablet"),
            
            # Acidity & Digestive
            models.Medicine(name="Pantocid 40", generic_name="Pantoprazole", category="Digestive & Acidity", manufacturer="Cipla", dosage_form="Tablet"),
            models.Medicine(name="Omez 20", generic_name="Omeprazole", category="Digestive & Acidity", manufacturer="Dr Reddy's", dosage_form="Capsule"),
            models.Medicine(name="Gelusil MPS", generic_name="Antacid", category="Digestive & Acidity", manufacturer="Pfizer", dosage_form="Syrup"),

            # Baby Care
            models.Medicine(name="Calpol Drops 100ml", generic_name="Paracetamol Paediatric", category="Baby Care", manufacturer="GSK", dosage_form="Syrup"),
            
            # Skin Care
            models.Medicine(name="Panderm Plus", generic_name="Clobetasol", category="Skin Care", manufacturer="Macleods", dosage_form="Cream")
        ]
        db.add_all(medicines_list)
        db.commit()

        # Map medicines for quick stock creation
        meds_by_name = {m.name: m for m in db.query(models.Medicine).all()}

        # 4. Create Stock Inventory
        now = datetime.datetime.utcnow()
        stocks_data = [
            # Apollo Stock
            models.Stock(pharmacy_id=p1.id, medicine_id=meds_by_name["Dolo 650"].id, batch_id="B-DOL-101", quantity=45, price=32.50, expiry_date="2027-06-30", last_updated=now),
            models.Stock(pharmacy_id=p1.id, medicine_id=meds_by_name["Crocin 650"].id, batch_id="B-CRO-202", quantity=20, price=30.00, expiry_date="2027-04-15", last_updated=now),
            models.Stock(pharmacy_id=p1.id, medicine_id=meds_by_name["Metformin 500mg"].id, batch_id="B-MET-303", quantity=100, price=18.00, expiry_date="2028-01-31", last_updated=now),
            models.Stock(pharmacy_id=p1.id, medicine_id=meds_by_name["Telma 40"].id, batch_id="B-TEL-404", quantity=8, price=145.00, expiry_date="2026-11-30", last_updated=now),
            models.Stock(pharmacy_id=p1.id, medicine_id=meds_by_name["Azithral 500"].id, batch_id="B-AZI-505", quantity=15, price=119.00, expiry_date="2027-03-31", last_updated=now),
            models.Stock(pharmacy_id=p1.id, medicine_id=meds_by_name["Pantocid 40"].id, batch_id="B-PAN-606", quantity=60, price=130.00, expiry_date="2027-08-31", last_updated=now),

            # MedPlus Stock
            models.Stock(pharmacy_id=p2.id, medicine_id=meds_by_name["Dolo 650"].id, batch_id="B-DOL-999", quantity=5, price=31.00, expiry_date="2026-12-31", last_updated=now),
            models.Stock(pharmacy_id=p2.id, medicine_id=meds_by_name["Calpol 500"].id, batch_id="B-CAL-888", quantity=50, price=25.00, expiry_date="2027-09-30", last_updated=now),
            models.Stock(pharmacy_id=p2.id, medicine_id=meds_by_name["Augmentin 625 Duo"].id, batch_id="B-AUG-777", quantity=25, price=210.00, expiry_date="2027-05-31", last_updated=now),
            models.Stock(pharmacy_id=p2.id, medicine_id=meds_by_name["Amlokind 5"].id, batch_id="B-AML-666", quantity=80, price=35.00, expiry_date="2028-02-28", last_updated=now),

            # Wellness Forever Stock
            models.Stock(pharmacy_id=p3.id, medicine_id=meds_by_name["Crocin 650"].id, batch_id="B-CRO-111", quantity=35, price=29.50, expiry_date="2027-01-31", last_updated=now),
            models.Stock(pharmacy_id=p3.id, medicine_id=meds_by_name["Combiflam"].id, batch_id="B-COM-222", quantity=40, price=42.00, expiry_date="2027-10-31", last_updated=now),
            models.Stock(pharmacy_id=p3.id, medicine_id=meds_by_name["Pantocid 40"].id, batch_id="B-PAN-333", quantity=0, price=128.00, expiry_date="2026-10-15", last_updated=now),
            models.Stock(pharmacy_id=p3.id, medicine_id=meds_by_name["Panderm Plus"].id, batch_id="B-PAN-444", quantity=18, price=95.00, expiry_date="2027-07-31", last_updated=now)
        ]
        db.add_all(stocks_data)
        db.commit()

        # 5. FAQs Seed Data
        faqs = [
            models.FAQ(question="How live and accurate is the medicine stock data?", answer="All stock counts displayed in MedFind are queried directly from the pharmacy's live inventory system in real-time. Each result card displays a 'Last Updated' timestamp showing exactly when the pharmacy last recorded stock changes.", category="Stock Freshness", order_index=1),
            models.FAQ(question="How does the WhatsApp Chat feature work?", answer="When you click 'Contact Pharmacy', MedFind opens a direct WhatsApp conversation powered by Twilio. You can ask the pharmacist about medicine availability, batch confirmation, or home delivery directly on WhatsApp or through our in-app chat thread.", category="Communication", order_index=2),
            models.FAQ(question="What does 'Low Stock' vs 'In Stock' mean?", answer="'In Stock' indicates that the pharmacy currently has more than 10 units available. 'Low Stock' means between 1 and 10 units remain, so we recommend reserving or contacting the pharmacy quickly via WhatsApp.", category="Stock Freshness", order_index=3),
            models.FAQ(question="How do I upload my doctor's prescription?", answer="Click the 'Upload Prescription' button on any pharmacy card to upload a photo of your prescription. The pharmacy team will review and verify your prescription on their dashboard.", category="Prescription Verification", order_index=4),
            models.FAQ(question="Is my personal data and health information secure?", answer="Yes. MedFind follows standard security and privacy protocols. Your location and prescription uploads are strictly accessible only by your selected local pharmacy for verification.", category="Privacy & Security", order_index=5)
        ]
        db.add_all(faqs)
        db.commit()

        # 6. Sample Feedback Seed Data
        feedback = models.Feedback(
            patient_id=patient_user.id,
            pharmacy_id=p1.id,
            rating=5,
            comment="Found Dolo 650 in stock during emergency late night hours! WhatsApp response from Apollo Pharmacy was super fast."
        )
        db.add(feedback)
        db.commit()

        print("[Seed] Successfully seeded Indian healthcare dataset!")
    except Exception as e:
        db.rollback()
        print(f"[Seed] Error during database seeding: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
