import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import { User } from './models/User.js';
import { Pharmacy } from './models/Pharmacy.js';
import { Medicine } from './models/Medicine.js';
import { Stock } from './models/Stock.js';
import { FAQ } from './models/FAQ.js';
import { Feedback } from './models/Feedback.js';
import { Counter } from './models/Counter.js';

dotenv.config();

export const seedDatabase = async (force = false) => {
  try {
    const existing = await User.findOne({ email: 'patient@medfind.in' });
    if (existing && !force) {
      console.log('[Seed] Database already seeded. Skipping initial data population.');
      return;
    }

    if (force) {
      await User.deleteMany({});
      await Pharmacy.deleteMany({});
      await Medicine.deleteMany({});
      await Stock.deleteMany({});
      await FAQ.deleteMany({});
      await Feedback.deleteMany({});
      await Counter.deleteMany({});
    }

    console.log('[Seed] Seeding MedFind Indian Healthcare MongoDB database...');

    // Reset counters
    await Counter.deleteMany({});

    // 1. Create Default Users
    const pwdPatient = await bcrypt.hash('patient123', 10);
    const pwdPharmacy = await bcrypt.hash('pharmacy123', 10);

    const patientUser = new User({
      id: 1,
      email: 'patient@medfind.in',
      hashed_password: pwdPatient,
      role: 'patient',
      full_name: 'Rajesh Kumar',
      phone: '+919876543210'
    });
    await patientUser.save();

    const pharmacyUser1 = new User({
      id: 2,
      email: 'apollo@medfind.in',
      hashed_password: pwdPharmacy,
      role: 'pharmacy',
      full_name: 'Apollo Pharmacy Manager',
      phone: '+919812345678'
    });
    await pharmacyUser1.save();

    const pharmacyUser2 = new User({
      id: 3,
      email: 'medplus@medfind.in',
      hashed_password: pwdPharmacy,
      role: 'pharmacy',
      full_name: 'MedPlus Pharmacy Manager',
      phone: '+919823456789'
    });
    await pharmacyUser2.save();

    const pharmacyUser3 = new User({
      id: 4,
      email: 'wellness@medfind.in',
      hashed_password: pwdPharmacy,
      role: 'pharmacy',
      full_name: 'Wellness Forever Manager',
      phone: '+919834567890'
    });
    await pharmacyUser3.save();

    await Counter.findByIdAndUpdate('userId', { seq: 4 }, { upsert: true });

    // 2. Create Pharmacies (Bengaluru context coordinates)
    const p1 = new Pharmacy({
      id: 1,
      user_id: pharmacyUser1.id,
      name: 'Apollo Pharmacy - Indiranagar',
      address: '100 Feet Road, 12th Main, Indiranagar',
      city: 'Bengaluru',
      pincode: '560038',
      latitude: 12.9784,
      longitude: 77.6408,
      phone: '+918025201122',
      whatsapp_number: '+919812345678'
    });
    await p1.save();

    const p2 = new Pharmacy({
      id: 2,
      user_id: pharmacyUser2.id,
      name: 'MedPlus Pharmacy - Koramangala',
      address: '80 Feet Road, 4th Block, Koramangala',
      city: 'Bengaluru',
      pincode: '560034',
      latitude: 12.9345,
      longitude: 77.6242,
      phone: '+918025534455',
      whatsapp_number: '+919823456789'
    });
    await p2.save();

    const p3 = new Pharmacy({
      id: 3,
      user_id: pharmacyUser3.id,
      name: 'Wellness Forever - Whitefield',
      address: 'Main Road, ITPL Back Gate, Whitefield',
      city: 'Bengaluru',
      pincode: '560066',
      latitude: 12.9698,
      longitude: 77.7499,
      phone: '+918028456677',
      whatsapp_number: '+919834567890'
    });
    await p3.save();

    await Counter.findByIdAndUpdate('pharmacyId', { seq: 3 }, { upsert: true });

    // 3. Create Medicines Catalog (Indian Market Context)
    const medicinesData = [
      // Fever & Pain
      { id: 1, name: 'Dolo 650', generic_name: 'Paracetamol', category: 'Fever & Pain', manufacturer: 'Micro Labs', dosage_form: 'Tablet' },
      { id: 2, name: 'Crocin 650', generic_name: 'Paracetamol', category: 'Fever & Pain', manufacturer: 'GlaxoSmithKline', dosage_form: 'Tablet' },
      { id: 3, name: 'Calpol 500', generic_name: 'Paracetamol', category: 'Fever & Pain', manufacturer: 'GSK', dosage_form: 'Tablet' },
      { id: 4, name: 'Combiflam', generic_name: 'Ibuprofen + Paracetamol', category: 'Fever & Pain', manufacturer: 'Sanofi', dosage_form: 'Tablet' },

      // Diabetes
      { id: 5, name: 'Metformin 500mg', generic_name: 'Metformin', category: 'Diabetes', manufacturer: 'USV Pvt Ltd', dosage_form: 'Tablet' },
      { id: 6, name: 'Glycomet GP2', generic_name: 'Metformin + Glimepiride', category: 'Diabetes', manufacturer: 'USV', dosage_form: 'Tablet' },
      { id: 7, name: 'Januvia 100', generic_name: 'Sitagliptin', category: 'Diabetes', manufacturer: 'MSD', dosage_form: 'Tablet' },

      // BP & Heart
      { id: 8, name: 'Telma 40', generic_name: 'Telmisartan', category: 'BP & Heart', manufacturer: 'Glenmark', dosage_form: 'Tablet' },
      { id: 9, name: 'Amlokind 5', generic_name: 'Amlodipine', category: 'BP & Heart', manufacturer: 'Mankind', dosage_form: 'Tablet' },
      { id: 10, name: 'Atorva 10', generic_name: 'Atorvastatin', category: 'BP & Heart', manufacturer: 'Zydus', dosage_form: 'Tablet' },

      // Antibiotics
      { id: 11, name: 'Azithral 500', generic_name: 'Azithromycin', category: 'Antibiotics', manufacturer: 'Alembic', dosage_form: 'Tablet' },
      { id: 12, name: 'Augmentin 625 Duo', generic_name: 'Amoxicillin + Clavulanic Acid', category: 'Antibiotics', manufacturer: 'GSK', dosage_form: 'Tablet' },
      { id: 13, name: 'Ciplox 500', generic_name: 'Ciprofloxacin', category: 'Antibiotics', manufacturer: 'Cipla', dosage_form: 'Tablet' },

      // Acidity & Digestive
      { id: 14, name: 'Pantocid 40', generic_name: 'Pantoprazole', category: 'Digestive & Acidity', manufacturer: 'Cipla', dosage_form: 'Tablet' },
      { id: 15, name: 'Omez 20', generic_name: 'Omeprazole', category: 'Digestive & Acidity', manufacturer: "Dr Reddy's", dosage_form: 'Capsule' },
      { id: 16, name: 'Gelusil MPS', generic_name: 'Antacid', category: 'Digestive & Acidity', manufacturer: 'Pfizer', dosage_form: 'Syrup' },

      // Baby Care
      { id: 17, name: 'Calpol Drops 100ml', generic_name: 'Paracetamol Paediatric', category: 'Baby Care', manufacturer: 'GSK', dosage_form: 'Syrup' },

      // Skin Care
      { id: 18, name: 'Panderm Plus', generic_name: 'Clobetasol', category: 'Skin Care', manufacturer: 'Macleods', dosage_form: 'Cream' }
    ];

    for (const m of medicinesData) {
      const med = new Medicine(m);
      await med.save();
    }
    await Counter.findByIdAndUpdate('medicineId', { seq: medicinesData.length }, { upsert: true });

    const allMeds = await Medicine.find();
    const medsByName = new Map(allMeds.map((m) => [m.name, m]));

    // 4. Create Stock Inventory
    const now = new Date();
    const stocksData = [
      // Apollo Stock
      { id: 1, pharmacy_id: p1.id, medicine_id: medsByName.get('Dolo 650').id, batch_id: 'B-DOL-101', quantity: 45, price: 32.5, expiry_date: '2027-06-30', last_updated: now },
      { id: 2, pharmacy_id: p1.id, medicine_id: medsByName.get('Crocin 650').id, batch_id: 'B-CRO-202', quantity: 20, price: 30.0, expiry_date: '2027-04-15', last_updated: now },
      { id: 3, pharmacy_id: p1.id, medicine_id: medsByName.get('Metformin 500mg').id, batch_id: 'B-MET-303', quantity: 100, price: 18.0, expiry_date: '2028-01-31', last_updated: now },
      { id: 4, pharmacy_id: p1.id, medicine_id: medsByName.get('Telma 40').id, batch_id: 'B-TEL-404', quantity: 8, price: 145.0, expiry_date: '2026-11-30', last_updated: now },
      { id: 5, pharmacy_id: p1.id, medicine_id: medsByName.get('Azithral 500').id, batch_id: 'B-AZI-505', quantity: 15, price: 119.0, expiry_date: '2027-03-31', last_updated: now },
      { id: 6, pharmacy_id: p1.id, medicine_id: medsByName.get('Pantocid 40').id, batch_id: 'B-PAN-606', quantity: 60, price: 130.0, expiry_date: '2027-08-31', last_updated: now },
      { id: 7, pharmacy_id: p1.id, medicine_id: medsByName.get('Calpol Drops 100ml').id, batch_id: 'B-DRP-707', quantity: 22, price: 68.0, expiry_date: '2027-11-30', last_updated: now },
      { id: 8, pharmacy_id: p1.id, medicine_id: medsByName.get('Ciplox 500').id, batch_id: 'B-CIP-808', quantity: 30, price: 45.0, expiry_date: '2027-04-30', last_updated: now },

      // MedPlus Stock
      { id: 9, pharmacy_id: p2.id, medicine_id: medsByName.get('Dolo 650').id, batch_id: 'B-DOL-999', quantity: 5, price: 31.0, expiry_date: '2026-12-31', last_updated: now },
      { id: 10, pharmacy_id: p2.id, medicine_id: medsByName.get('Calpol 500').id, batch_id: 'B-CAL-888', quantity: 50, price: 25.0, expiry_date: '2027-09-30', last_updated: now },
      { id: 11, pharmacy_id: p2.id, medicine_id: medsByName.get('Augmentin 625 Duo').id, batch_id: 'B-AUG-777', quantity: 25, price: 210.0, expiry_date: '2027-05-31', last_updated: now },
      { id: 12, pharmacy_id: p2.id, medicine_id: medsByName.get('Amlokind 5').id, batch_id: 'B-AML-666', quantity: 80, price: 35.0, expiry_date: '2028-02-28', last_updated: now },
      { id: 13, pharmacy_id: p2.id, medicine_id: medsByName.get('Januvia 100').id, batch_id: 'B-JAN-555', quantity: 35, price: 285.0, expiry_date: '2027-12-31', last_updated: now },
      { id: 14, pharmacy_id: p2.id, medicine_id: medsByName.get('Gelusil MPS').id, batch_id: 'B-GEL-444', quantity: 40, price: 92.0, expiry_date: '2027-08-31', last_updated: now },
      { id: 15, pharmacy_id: p2.id, medicine_id: medsByName.get('Calpol Drops 100ml').id, batch_id: 'B-DRP-333', quantity: 18, price: 65.0, expiry_date: '2027-10-31', last_updated: now },

      // Wellness Forever Stock
      { id: 16, pharmacy_id: p3.id, medicine_id: medsByName.get('Crocin 650').id, batch_id: 'B-CRO-111', quantity: 35, price: 29.5, expiry_date: '2027-01-31', last_updated: now },
      { id: 17, pharmacy_id: p3.id, medicine_id: medsByName.get('Combiflam').id, batch_id: 'B-COM-222', quantity: 40, price: 42.0, expiry_date: '2027-10-31', last_updated: now },
      { id: 18, pharmacy_id: p3.id, medicine_id: medsByName.get('Pantocid 40').id, batch_id: 'B-PAN-333', quantity: 0, price: 128.0, expiry_date: '2026-10-15', last_updated: now },
      { id: 19, pharmacy_id: p3.id, medicine_id: medsByName.get('Panderm Plus').id, batch_id: 'B-PAN-444', quantity: 18, price: 95.0, expiry_date: '2027-07-31', last_updated: now },
      { id: 20, pharmacy_id: p3.id, medicine_id: medsByName.get('Atorva 10').id, batch_id: 'B-ATO-555', quantity: 50, price: 110.0, expiry_date: '2028-03-31', last_updated: now },
      { id: 21, pharmacy_id: p3.id, medicine_id: medsByName.get('Omez 20').id, batch_id: 'B-OMZ-666', quantity: 30, price: 85.0, expiry_date: '2027-09-30', last_updated: now }
    ];

    for (const s of stocksData) {
      const stock = new Stock(s);
      await stock.save();
    }
    await Counter.findByIdAndUpdate('stockId', { seq: stocksData.length }, { upsert: true });

    // 5. FAQs Seed Data
    const faqsData = [
      { id: 1, question: 'How live and accurate is the medicine stock data?', answer: 'All stock counts displayed in MedFind are queried directly from the pharmacy\'s live MongoDB inventory in real-time. Each result card displays a "Last Updated" timestamp showing exactly when the pharmacy last recorded stock changes.', category: 'Stock Freshness', order_index: 1 },
      { id: 2, question: 'How does the WhatsApp Chat feature work?', answer: 'When you click "Contact Pharmacy", MedFind opens a direct WhatsApp conversation powered by Twilio. You can ask the pharmacist about medicine availability, batch confirmation, or home delivery directly on WhatsApp or through our in-app chat thread.', category: 'Communication', order_index: 2 },
      { id: 3, question: 'What does "Low Stock" vs "In Stock" mean?', answer: '"In Stock" indicates that the pharmacy currently has more than 10 units available. "Low Stock" means between 1 and 10 units remain, so we recommend reserving or contacting the pharmacy quickly via WhatsApp.', category: 'Stock Freshness', order_index: 3 },
      { id: 4, question: 'How do I upload my doctor\'s prescription?', answer: 'Click the "Upload Prescription" button on any pharmacy card to upload a photo of your prescription. The pharmacy team will review and verify your prescription on their dashboard.', category: 'Prescription Verification', order_index: 4 },
      { id: 5, question: 'Is my personal data and health information secure?', answer: 'Yes. MedFind follows standard security and privacy protocols. Your location and prescription uploads are strictly accessible only by your selected local pharmacy for verification.', category: 'Privacy & Security', order_index: 5 }
    ];

    for (const f of faqsData) {
      const faq = new FAQ(f);
      await faq.save();
    }
    await Counter.findByIdAndUpdate('faqId', { seq: faqsData.length }, { upsert: true });

    // 6. Sample Feedback Seed Data
    const feedback = new Feedback({
      id: 1,
      patient_id: patientUser.id,
      pharmacy_id: p1.id,
      rating: 5,
      comment: 'Found Dolo 650 in stock during emergency late night hours! WhatsApp response from Apollo Pharmacy was super fast.'
    });
    await feedback.save();
    await Counter.findByIdAndUpdate('feedbackId', { seq: 1 }, { upsert: true });

    console.log('[Seed] Successfully seeded Indian healthcare MongoDB dataset!');
  } catch (err) {
    console.error('[Seed] Error during database seeding:', err);
  }
};

// If run directly: node src/seed.js
if (process.argv[1]?.endsWith('seed.js')) {
  (async () => {
    await connectDB();
    await seedDatabase(true);
    process.exit(0);
  })();
}
