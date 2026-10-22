# MedFind - MERN Stack Real-Time Medicine Stock Locator

A full-stack **MERN (MongoDB, Express.js, React, Node.js)** healthcare platform connecting patients with local Indian pharmacies for real-time stock availability, live distance estimates, prescription verification, and WhatsApp messaging.

---

## 🚀 Tech Stack

- **M** - **MongoDB & Mongoose**: Single-source document database storing Users, Pharmacies, Medicines, Stock Inventory, Prescriptions, Chat Messages, and Feedback.
- **E** - **Express.js (Node.js)**: RESTful API server handling authentication, live search algorithms, CSV inventory processing, POS decrement, and Twilio WhatsApp webhooks.
- **R** - **React 18 + Vite**: Dynamic responsive frontend with interactive Leaflet map view, live medicine search, and pharmacy dashboard.
- **N** - **Node.js**: Modern JavaScript backend runtime.

---

## 📁 Project Architecture

```
MedFind/
├── backend/
│   ├── .env                     # MongoDB URI, JWT secret, Twilio & Google Maps keys
│   ├── package.json             # Express, Mongoose, Multer, XLSX, JWT dependencies
│   ├── uploads/                 # Uploaded doctor prescriptions storage
│   └── src/
│       ├── config/db.js         # MongoDB connection setup
│       ├── middleware/auth.js   # JWT authentication & role-based access control
│       ├── models/              # Mongoose Schemas (User, Pharmacy, Medicine, Stock, etc.)
│       ├── routes/              # Express API routers (auth, patient, pharmacy, chat)
│       ├── services/            # Maps distance matrix & Twilio WhatsApp service
│       ├── seed.js              # Database seeder with Indian market dataset
│       └── server.js            # Express server entry point (port 8000)
├── frontend/
│   ├── package.json             # React 18, Vite, Leaflet, Lucide React
│   ├── vite.config.js           # Proxies /api and /uploads to backend (port 8000)
│   └── src/                     # React components, views, and styling
└── mongodb_data/                # Local MongoDB data directory
```

---

## 🏃 How to Run the Project

### 1. Start MongoDB
Ensure MongoDB is running locally:
```powershell
mongod --dbpath "d:\MedFind\mongodb_data" --port 27017
```

### 2. Start the Express Backend
In a terminal window:
```powershell
cd d:\MedFind\backend
npm install
npm run dev      # or: npm start
```
*Note: The database seeds automatically on first launch! To re-seed manually: `npm run seed`.*

### 3. Start the React Frontend
In a separate terminal window:
```powershell
cd d:\MedFind\frontend
npm install
npm run dev
```
Open **`http://127.0.0.1:5173`** in your browser.

---

## 👥 Pre-Configured Test Credentials

| Role | Email | Password | Details |
|---|---|---|---|
| **Patient** | `patient@medfind.in` | `patient123` | Rajesh Kumar (Bengaluru) |
| **Pharmacy** | `apollo@medfind.in` | `pharmacy123` | Apollo Pharmacy - Indiranagar |
| **Pharmacy** | `medplus@medfind.in` | `pharmacy123` | MedPlus Pharmacy - Koramangala |
| **Pharmacy** | `wellness@medfind.in` | `pharmacy123` | Wellness Forever - Whitefield |
