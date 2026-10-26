import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import { connectDB } from './config/db.js';
import { seedDatabase } from './seed.js';

import authRoutes from './routes/authRoutes.js';
import patientRoutes from './routes/patientRoutes.js';
import pharmacyRoutes from './routes/pharmacyRoutes.js';
import chatRoutes from './routes/chatRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Connect to MongoDB & seed database if initial run
await connectDB();
await seedDatabase();

// CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin like curl or mobile apps
      if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:')) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in dev
      }
    },
    credentials: true
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static uploads directory
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// Route handlers
app.use('/api/auth', authRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/chat', chatRoutes);

// API health check
app.get('/api/health', (req, res) => {
  res.json({
    app: 'MedFind API (MERN Stack) - Real-Time Medicine Stock Locator',
    stack: 'MongoDB + Express.js + React + Node.js',
    status: 'online',
    port: PORT,
    database: 'MongoDB connected'
  });
});

// Serve built React frontend in production
const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.json({
      app: 'MedFind API (MERN Stack) - Real-Time Medicine Stock Locator',
      stack: 'MongoDB + Express.js + React + Node.js',
      status: 'online',
      port: PORT,
      database: 'MongoDB connected'
    });
  });
}

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('[ServerError]', err);
  res.status(err.status || 500).json({
    detail: err.message || 'Internal Server Error'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[MedFind Express Server] running on http://127.0.0.1:${PORT}`);
  console.log(`[MedFind Express Server] connected to MongoDB at ${process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/medfind'}`);
});
