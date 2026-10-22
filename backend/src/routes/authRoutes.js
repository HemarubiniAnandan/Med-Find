import express from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Pharmacy } from '../models/Pharmacy.js';
import { generateToken, authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const {
      email,
      password,
      role = 'patient',
      full_name,
      phone,
      pharmacy_name,
      address,
      city,
      pincode,
      latitude,
      longitude,
      whatsapp_number
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({ detail: 'Email and password are required' });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ detail: 'User with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      email: email.toLowerCase().trim(),
      hashed_password: hashedPassword,
      role,
      full_name: full_name || '',
      phone: phone || ''
    });
    await user.save();

    let pharmacyId = null;
    if (role === 'pharmacy') {
      const pharmacy = new Pharmacy({
        user_id: user.id,
        name: pharmacy_name || `${full_name || 'Pharmacist'}'s Medical Store`,
        address: address || 'MG Road, Indiranagar',
        city: city || 'Bengaluru',
        pincode: pincode || '560001',
        latitude: latitude ? parseFloat(latitude) : 12.9716,
        longitude: longitude ? parseFloat(longitude) : 77.5946,
        phone: phone || '+919876543210',
        whatsapp_number: whatsapp_number || phone || '+919876543210'
      });
      await pharmacy.save();
      pharmacyId = pharmacy.id;
    }

    const accessToken = generateToken(user);
    return res.status(200).json({
      access_token: accessToken,
      token_type: 'bearer',
      role: user.role,
      user_id: user.id,
      full_name: user.full_name,
      pharmacy_id: pharmacyId
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ detail: 'Internal server error during registration' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ detail: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ detail: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.hashed_password);
    if (!isMatch) {
      return res.status(401).json({ detail: 'Invalid credentials' });
    }

    let pharmacyId = null;
    if (user.role === 'pharmacy') {
      const pharmacy = await Pharmacy.findOne({ user_id: user.id });
      if (pharmacy) {
        pharmacyId = pharmacy.id;
      }
    }

    const accessToken = generateToken(user);
    return res.status(200).json({
      access_token: accessToken,
      token_type: 'bearer',
      role: user.role,
      user_id: user.id,
      full_name: user.full_name,
      pharmacy_id: pharmacyId
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ detail: 'Internal server error during login' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    let pharmacyId = null;
    if (req.user.role === 'pharmacy') {
      const pharmacy = await Pharmacy.findOne({ user_id: req.user.id });
      if (pharmacy) {
        pharmacyId = pharmacy.id;
      }
    }

    return res.status(200).json({
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      full_name: req.user.full_name,
      phone: req.user.phone,
      pharmacy_id: pharmacyId
    });
  } catch (err) {
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

export default router;
