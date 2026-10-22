import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

import { Medicine } from '../models/Medicine.js';
import { Stock } from '../models/Stock.js';
import { Pharmacy } from '../models/Pharmacy.js';
import { FAQ } from '../models/FAQ.js';
import { Feedback } from '../models/Feedback.js';
import { PrescriptionUpload } from '../models/PrescriptionUpload.js';
import { authenticateToken } from '../middleware/auth.js';
import { calculateLiveDistance } from '../services/mapsService.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '..', '..', 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const rand = crypto.randomBytes(8).toString('hex');
    cb(null, `prescription_${rand}${ext}`);
  }
});
const upload = multer({ storage });

// GET /api/patient/search
router.get('/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const lat = parseFloat(req.query.lat) || 12.9716;
    const lng = parseFloat(req.query.lng) || 77.5946;

    if (!q) {
      return res.status(200).json({
        query: '',
        exact_matches: [],
        generic_alternatives: [],
        total_found: 0
      });
    }

    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');

    // Distinctive keywords (exclude common stopwords like 'and', 'care')
    const keywords = q
      .split(/[\s,&+/]+/)
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w.length >= 2 && !['and', 'care', 'the', 'for'].includes(w))
      .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

    const searchConditions = [
      { name: regex },
      { generic_name: regex },
      { category: regex }
    ];

    if (keywords.length > 0) {
      const keywordsRegex = new RegExp(`\\b(${keywords.join('|')})`, 'i');
      searchConditions.push({ category: keywordsRegex });
    }

    // 1. Find matching medicines (name, generic_name, or category)
    const matchingMedicines = await Medicine.find({
      $or: searchConditions
    });

    if (!matchingMedicines || matchingMedicines.length === 0) {
      return res.status(200).json({
        query: q,
        exact_matches: [],
        generic_alternatives: [],
        total_found: 0
      });
    }

    const primaryMedIds = matchingMedicines.map((m) => m.id);
    const genericSalts = [...new Set(matchingMedicines.map((m) => m.generic_name.toLowerCase()))];
    const medMap = new Map(matchingMedicines.map((m) => [m.id, m]));

    // 2. Fetch stocks for primary medicines
    const stocks = await Stock.find({ medicine_id: { $in: primaryMedIds } });
    const pharmacyIds = [...new Set(stocks.map((s) => s.pharmacy_id))];
    const pharmacies = await Pharmacy.find({ id: { $in: pharmacyIds } });
    const pharmacyMap = new Map(pharmacies.map((p) => [p.id, p]));

    const exactCards = [];
    for (const stock of stocks) {
      const pharmacy = pharmacyMap.get(stock.pharmacy_id);
      const med = medMap.get(stock.medicine_id);
      if (!pharmacy || !med) continue;

      const distInfo = await calculateLiveDistance(lat, lng, pharmacy.latitude, pharmacy.longitude);

      let statusBadge = 'Out of Stock';
      if (stock.quantity > 10) statusBadge = 'In Stock';
      else if (stock.quantity > 0) statusBadge = 'Low Stock';

      exactCards.push({
        stock_id: stock.id,
        pharmacy_id: pharmacy.id,
        pharmacy_name: pharmacy.name,
        pharmacy_address: `${pharmacy.address}, ${pharmacy.city} - ${pharmacy.pincode}`,
        pharmacy_phone: pharmacy.phone,
        pharmacy_whatsapp: pharmacy.whatsapp_number,
        latitude: pharmacy.latitude,
        longitude: pharmacy.longitude,
        medicine_id: med.id,
        medicine_name: med.name,
        generic_name: med.generic_name,
        category: med.category,
        price: stock.price,
        quantity: stock.quantity,
        stock_status: statusBadge,
        batch_id: stock.batch_id,
        expiry_date: stock.expiry_date,
        last_updated: stock.last_updated,
        distance_km: distInfo.distance_km,
        estimated_time_mins: distInfo.estimated_time_mins,
        is_exact_match: true
      });
    }

    exactCards.sort((a, b) => a.distance_km - b.distance_km);

    // 3. Find Generic / Same-salt alternatives
    const altMedicines = await Medicine.find({
      generic_name: { $in: genericSalts.map((s) => new RegExp(`^${s}$`, 'i')) },
      id: { $nin: primaryMedIds }
    });

    const altCards = [];
    if (altMedicines && altMedicines.length > 0) {
      const altMedIds = altMedicines.map((m) => m.id);
      const altMedMap = new Map(altMedicines.map((m) => [m.id, m]));
      const altStocks = await Stock.find({
        medicine_id: { $in: altMedIds },
        quantity: { $gt: 0 }
      });

      const altPharmacyIds = [...new Set(altStocks.map((s) => s.pharmacy_id))];
      const altPharmacies = await Pharmacy.find({ id: { $in: altPharmacyIds } });
      const altPharmacyMap = new Map(altPharmacies.map((p) => [p.id, p]));

      for (const stock of altStocks) {
        const pharmacy = altPharmacyMap.get(stock.pharmacy_id);
        const med = altMedMap.get(stock.medicine_id);
        if (!pharmacy || !med) continue;

        const distInfo = await calculateLiveDistance(lat, lng, pharmacy.latitude, pharmacy.longitude);
        const statusBadge = stock.quantity > 10 ? 'In Stock' : 'Low Stock';

        altCards.push({
          stock_id: stock.id,
          pharmacy_id: pharmacy.id,
          pharmacy_name: pharmacy.name,
          pharmacy_address: `${pharmacy.address}, ${pharmacy.city} - ${pharmacy.pincode}`,
          pharmacy_phone: pharmacy.phone,
          pharmacy_whatsapp: pharmacy.whatsapp_number,
          latitude: pharmacy.latitude,
          longitude: pharmacy.longitude,
          medicine_id: med.id,
          medicine_name: med.name,
          generic_name: med.generic_name,
          category: med.category,
          price: stock.price,
          quantity: stock.quantity,
          stock_status: statusBadge,
          batch_id: stock.batch_id,
          expiry_date: stock.expiry_date,
          last_updated: stock.last_updated,
          distance_km: distInfo.distance_km,
          estimated_time_mins: distInfo.estimated_time_mins,
          is_exact_match: false
        });
      }
      altCards.sort((a, b) => a.distance_km - b.distance_km);
    }

    return res.status(200).json({
      query: q,
      exact_matches: exactCards,
      generic_alternatives: altCards,
      total_found: exactCards.length + altCards.length
    });
  } catch (err) {
    console.error('Search error:', err);
    return res.status(500).json({ detail: 'Internal server error during search' });
  }
});

// GET /api/patient/categories
router.get('/categories', (req, res) => {
  const categories = [
    { name: 'Fever & Pain', icon: 'Thermometer', description: 'Paracetamol, Crocin, Dolo 650, Combiflam' },
    { name: 'Diabetes', icon: 'Activity', description: 'Metformin, Glimepiride, Insulin, Januvia' },
    { name: 'BP & Heart', icon: 'Heart', description: 'Telmisartan, Amlodipine, Atorvastatin' },
    { name: 'Antibiotics', icon: 'ShieldAlert', description: 'Azithromycin, Amoxicillin, Augmentin' },
    { name: 'Baby Care', icon: 'Baby', description: 'Calpol drops, Gripe Water, Infant Formula' },
    { name: 'Skin Care', icon: 'Sparkles', description: 'Panderm, Betnovate, Antifungal Cream' },
    { name: 'Digestive & Acidity', icon: 'Pill', description: 'Pantocid 40, Gelusil, Digene, Omez' }
  ];
  return res.status(200).json(categories);
});

// POST /api/patient/prescriptions/upload
router.post('/prescriptions/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const pharmacyId = parseInt(req.body.pharmacy_id, 10);
    if (!pharmacyId) {
      return res.status(400).json({ detail: 'Valid pharmacy_id is required' });
    }

    const pharmacy = await Pharmacy.findOne({ id: pharmacyId });
    if (!pharmacy) {
      return res.status(404).json({ detail: 'Pharmacy not found' });
    }

    if (!req.file) {
      return res.status(400).json({ detail: 'No prescription file uploaded' });
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    const presc = new PrescriptionUpload({
      patient_id: req.user.id,
      pharmacy_id: pharmacy.id,
      image_url: imageUrl,
      status: 'pending',
      ocr_parsed_data: JSON.stringify({
        status: 'pending_ai_processing',
        detected_medicines_stub: [],
        confidence_score: 0.0,
        extension_note: 'Future AI OCR pipeline will inject parsed medicine/dosage tuples here'
      })
    });
    await presc.save();

    return res.status(200).json({
      id: presc.id,
      patient_id: presc.patient_id,
      pharmacy_id: presc.pharmacy_id,
      pharmacy_name: pharmacy.name,
      image_url: presc.image_url,
      status: presc.status,
      notes: presc.notes,
      timestamp: presc.timestamp
    });
  } catch (err) {
    console.error('Prescription upload error:', err);
    return res.status(500).json({ detail: 'Internal server error uploading prescription' });
  }
});

// GET /api/patient/faqs
router.get('/faqs', async (req, res) => {
  try {
    const faqs = await FAQ.find().sort({ order_index: 1 });
    return res.status(200).json(faqs);
  } catch (err) {
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

// POST /api/patient/feedback
router.post('/feedback', authenticateToken, async (req, res) => {
  try {
    const { pharmacy_id, rating = 5, comment } = req.body;
    if (!comment) {
      return res.status(400).json({ detail: 'Comment is required' });
    }

    let pharmacyName = null;
    let pharmId = null;
    if (pharmacy_id) {
      pharmId = parseInt(pharmacy_id, 10);
      const pharmacy = await Pharmacy.findOne({ id: pharmId });
      if (pharmacy) {
        pharmacyName = pharmacy.name;
      }
    }

    const feedback = new Feedback({
      patient_id: req.user.id,
      pharmacy_id: pharmId,
      rating: parseInt(rating, 10),
      comment
    });
    await feedback.save();

    return res.status(200).json({
      id: feedback.id,
      patient_id: feedback.patient_id,
      patient_name: req.user.full_name || 'Patient',
      pharmacy_id: feedback.pharmacy_id,
      pharmacy_name: pharmacyName,
      rating: feedback.rating,
      comment: feedback.comment,
      timestamp: feedback.timestamp
    });
  } catch (err) {
    console.error('Feedback error:', err);
    return res.status(500).json({ detail: 'Internal server error submitting feedback' });
  }
});

export default router;
