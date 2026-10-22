import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'medfind-super-secret-jwt-key-2026-india';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

export const generateToken = (user) => {
  return jwt.sign(
    {
      sub: user.email,
      role: user.role,
      user_id: user.id
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRE }
  );
};

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ detail: 'Authentication token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findOne({ email: decoded.sub });
    if (!user) {
      return res.status(401).json({ detail: 'User no longer exists' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ detail: 'Invalid or expired token' });
  }
};

export const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({
        detail: `Operation not permitted for role '${req.user?.role}'. Required: '${role}'`
      });
    }
    next();
  };
};
