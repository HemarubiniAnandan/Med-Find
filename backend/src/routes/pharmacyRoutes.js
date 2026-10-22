import express from 'express';
import multer from 'multer';
import * as xlsx from 'xlsx';
import { Pharmacy } from '../models/Pharmacy.js';
import { Medicine } from '../models/Medicine.js';
import { Stock } from '../models/Stock.js';
import { PrescriptionUpload } from '../models/PrescriptionUpload.js';
import { Feedback } from '../models/Feedback.js';
import { User } from '../models/User.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Middleware to resolve the authenticated pharmacy profile
const attachPharmacy = async (req, res, next) => {
  try {
    const pharmacy = await Pharmacy.findOne({ user_id: req.user.id });
    if (!pharmacy) {
      return res.status(404).json({ detail: 'Pharmacy profile not found for this user account' });
    }
    req.pharmacy = pharmacy;
    next();
  } catch (err) {
    return res.status(500).json({ detail: 'Internal server error resolving pharmacy' });
  }
};

router.use(authenticateToken);
router.use(requireRole('pharmacy'));
router.use(attachPharmacy);

// GET /api/pharmacy/stock
router.get('/stock', async (req, res) => {
  try {
    const stocks = await Stock.find({ pharmacy_id: req.pharmacy.id });
    const medIds = [...new Set(stocks.map((s) => s.medicine_id))];
    const medicines = await Medicine.find({ id: { $in: medIds } });
    const medMap = new Map(medicines.map((m) => [m.id, m]));

    const result = stocks.map((s) => {
      const med = medMap.get(s.medicine_id);
      return {
        id: s.id,
        pharmacy_id: s.pharmacy_id,
        medicine_id: s.medicine_id,
        medicine_name: med ? med.name : 'Unknown Medicine',
        generic_name: med ? med.generic_name : 'Unknown Salt',
        category: med ? med.category : 'General',
        batch_id: s.batch_id,
        quantity: s.quantity,
        price: s.price,
        expiry_date: s.expiry_date,
        last_updated: s.last_updated
      };
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error('Fetch pharmacy stock error:', err);
    return res.status(500).json({ detail: 'Internal server error fetching stock' });
  }
});

// POST /api/pharmacy/stock
router.post('/stock', async (req, res) => {
  try {
    const {
      medicine_name,
      generic_name,
      category = 'General',
      batch_id = 'BATCH-001',
      quantity = 0,
      price = 0,
      expiry_date = '2026-12-31'
    } = req.body;

    if (!medicine_name || !generic_name) {
      return res.status(400).json({ detail: 'medicine_name and generic_name are required' });
    }

    const cleanMedName = medicine_name.trim();
    const cleanGenName = generic_name.trim();

    // Find or create medicine
    let medicine = await Medicine.findOne({
      name: { $regex: new RegExp(`^${cleanMedName}$`, 'i') }
    });

    if (!medicine) {
      medicine = new Medicine({
        name: cleanMedName,
        generic_name: cleanGenName,
        category: category || 'General'
      });
      await medicine.save();
    }

    // Check for existing stock row for pharmacy + medicine + batch_id
    let stockRecord = await Stock.findOne({
      pharmacy_id: req.pharmacy.id,
      medicine_id: medicine.id,
      batch_id: batch_id.trim()
    });

    if (stockRecord) {
      stockRecord.quantity += parseInt(quantity, 10);
      stockRecord.price = parseFloat(price);
      stockRecord.expiry_date = expiry_date;
      stockRecord.last_updated = new Date();
      await stockRecord.save();
    } else {
      stockRecord = new Stock({
        pharmacy_id: req.pharmacy.id,
        medicine_id: medicine.id,
        batch_id: batch_id.trim(),
        quantity: parseInt(quantity, 10),
        price: parseFloat(price),
        expiry_date,
        last_updated: new Date()
      });
      await stockRecord.save();
    }

    return res.status(200).json({
      id: stockRecord.id,
      pharmacy_id: stockRecord.pharmacy_id,
      medicine_id: stockRecord.medicine_id,
      medicine_name: medicine.name,
      generic_name: medicine.generic_name,
      category: medicine.category,
      batch_id: stockRecord.batch_id,
      quantity: stockRecord.quantity,
      price: stockRecord.price,
      expiry_date: stockRecord.expiry_date,
      last_updated: stockRecord.last_updated
    });
  } catch (err) {
    console.error('Add stock item error:', err);
    return res.status(500).json({ detail: 'Internal server error adding stock' });
  }
});

// PUT /api/pharmacy/stock/:stockId
router.put('/stock/:stockId', async (req, res) => {
  try {
    const stockId = parseInt(req.params.stockId, 10);
    const stockRecord = await Stock.findOne({
      id: stockId,
      pharmacy_id: req.pharmacy.id
    });

    if (!stockRecord) {
      return res.status(404).json({ detail: 'Stock item not found' });
    }

    if (req.body.quantity !== undefined) {
      stockRecord.quantity = parseInt(req.body.quantity, 10);
    }
    if (req.body.price !== undefined) {
      stockRecord.price = parseFloat(req.body.price);
    }
    stockRecord.last_updated = new Date();
    await stockRecord.save();

    const med = await Medicine.findOne({ id: stockRecord.medicine_id });

    return res.status(200).json({
      id: stockRecord.id,
      pharmacy_id: stockRecord.pharmacy_id,
      medicine_id: stockRecord.medicine_id,
      medicine_name: med ? med.name : 'Unknown Medicine',
      generic_name: med ? med.generic_name : 'Unknown Salt',
      category: med ? med.category : 'General',
      batch_id: stockRecord.batch_id,
      quantity: stockRecord.quantity,
      price: stockRecord.price,
      expiry_date: stockRecord.expiry_date,
      last_updated: stockRecord.last_updated
    });
  } catch (err) {
    console.error('Update stock inline error:', err);
    return res.status(500).json({ detail: 'Internal server error updating stock' });
  }
});

// POST /api/pharmacy/stock/upload-csv
router.post('/stock/upload-csv', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ detail: 'No file uploaded' });
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet);

    if (!rows || rows.length === 0) {
      return res.status(400).json({ detail: 'Uploaded spreadsheet is empty' });
    }

    const requiredCols = ['medicine_name', 'generic_name', 'category', 'batch_id', 'quantity', 'price', 'expiry_date'];
    const firstRowKeys = Object.keys(rows[0]);
    for (const col of requiredCols) {
      if (!firstRowKeys.includes(col)) {
        return res.status(400).json({ detail: `Missing required column: ${col}` });
      }
    }

    let processedCount = 0;
    for (const row of rows) {
      const medName = String(row['medicine_name'] || '').trim();
      const genName = String(row['generic_name'] || '').trim();
      const cat = String(row['category'] || '').trim();
      const batch = String(row['batch_id'] || '').trim();
      const qty = parseInt(row['quantity'], 10) || 0;
      const price = parseFloat(row['price']) || 0;
      const exp = String(row['expiry_date'] || '').trim();

      if (!medName) continue;

      let med = await Medicine.findOne({
        name: { $regex: new RegExp(`^${medName}$`, 'i') }
      });

      if (!med) {
        med = new Medicine({ name: medName, generic_name: genName, category: cat });
        await med.save();
      }

      let stk = await Stock.findOne({
        pharmacy_id: req.pharmacy.id,
        medicine_id: med.id,
        batch_id: batch
      });

      if (stk) {
        stk.quantity += qty;
        stk.price = price;
        stk.expiry_date = exp;
        stk.last_updated = new Date();
        await stk.save();
      } else {
        stk = new Stock({
          pharmacy_id: req.pharmacy.id,
          medicine_id: med.id,
          batch_id: batch,
          quantity: qty,
          price: price,
          expiry_date: exp,
          last_updated: new Date()
        });
        await stk.save();
      }
      processedCount++;
    }

    return res.status(200).json({
      message: `Successfully processed ${processedCount} stock records`
    });
  } catch (err) {
    console.error('CSV upload error:', err);
    return res.status(400).json({ detail: `Invalid file format or corrupt CSV/Excel: ${err.message}` });
  }
});

// POST /api/pharmacy/stock/pos-decrement
router.post('/stock/pos-decrement', async (req, res) => {
  try {
    const barcodeId = req.query.barcode_id || req.body.barcode_id;
    const soldQuantity = parseInt(req.query.sold_quantity || req.body.sold_quantity || 1, 10);

    if (!barcodeId) {
      return res.status(400).json({ detail: 'barcode_id is required' });
    }

    const stk = await Stock.findOne({
      pharmacy_id: req.pharmacy.id,
      batch_id: barcodeId.trim()
    });

    if (!stk) {
      return res.status(404).json({ detail: 'Barcode/Batch ID not found in pharmacy inventory' });
    }

    if (stk.quantity < soldQuantity) {
      return res.status(400).json({ detail: 'Insufficient stock quantity available' });
    }

    stk.quantity -= soldQuantity;
    stk.last_updated = new Date();
    await stk.save();

    return res.status(200).json({
      message: 'Stock decremented successfully via POS interface',
      new_quantity: stk.quantity
    });
  } catch (err) {
    console.error('POS decrement error:', err);
    return res.status(500).json({ detail: 'Internal server error processing POS transaction' });
  }
});

// GET /api/pharmacy/prescriptions
router.get('/prescriptions', async (req, res) => {
  try {
    const prescs = await PrescriptionUpload.find({ pharmacy_id: req.pharmacy.id });
    const result = prescs.map((p) => ({
      id: p.id,
      patient_id: p.patient_id,
      pharmacy_id: p.pharmacy_id,
      pharmacy_name: req.pharmacy.name,
      image_url: p.image_url,
      status: p.status,
      notes: p.notes,
      timestamp: p.timestamp
    }));
    return res.status(200).json(result);
  } catch (err) {
    console.error('Fetch prescriptions error:', err);
    return res.status(500).json({ detail: 'Internal server error fetching prescriptions' });
  }
});

// PUT /api/pharmacy/prescriptions/:prescId/status
router.put('/prescriptions/:prescId/status', async (req, res) => {
  try {
    const prescId = parseInt(req.params.prescId, 10);
    const { status, notes } = req.body;

    const presc = await PrescriptionUpload.findOne({
      id: prescId,
      pharmacy_id: req.pharmacy.id
    });

    if (!presc) {
      return res.status(404).json({ detail: 'Prescription entry not found' });
    }

    if (status) presc.status = status;
    if (notes !== undefined) presc.notes = notes;
    await presc.save();

    return res.status(200).json({
      message: 'Prescription status updated successfully',
      status: presc.status
    });
  } catch (err) {
    console.error('Update prescription error:', err);
    return res.status(500).json({ detail: 'Internal server error updating prescription' });
  }
});

// GET /api/pharmacy/feedback
router.get('/feedback', async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ pharmacy_id: req.pharmacy.id });
    const patientIds = [...new Set(feedbacks.map((f) => f.patient_id))];
    const patients = await User.find({ id: { $in: patientIds } });
    const patientMap = new Map(patients.map((u) => [u.id, u.full_name]));

    const result = feedbacks.map((f) => ({
      id: f.id,
      patient_id: f.patient_id,
      patient_name: patientMap.get(f.patient_id) || 'Patient',
      pharmacy_id: f.pharmacy_id,
      pharmacy_name: req.pharmacy.name,
      rating: f.rating,
      comment: f.comment,
      timestamp: f.timestamp
    }));

    return res.status(200).json(result);
  } catch (err) {
    console.error('Fetch pharmacy feedback error:', err);
    return res.status(500).json({ detail: 'Internal server error fetching feedback' });
  }
});

export default router;
