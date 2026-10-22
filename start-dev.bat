@echo off
echo ========================================================
echo Starting MedFind MERN Stack Application...
echo ========================================================

REM 1. Start MongoDB in background if not already running
start "MedFind MongoDB Server" cmd /k "mongod --dbpath d:\MedFind\mongodb_data --port 27017"

REM 2. Start Express Backend
timeout /t 2 >nul
start "MedFind Express API (Port 8000)" cmd /k "cd /d d:\MedFind\backend && npm start"

REM 3. Start React Frontend
timeout /t 2 >nul
start "MedFind React Frontend (Port 5173)" cmd /k "cd /d d:\MedFind\frontend && npm run dev"

echo.
echo [OK] MongoDB, Backend (Port 8000), and Frontend (Port 5173) launched!
echo Access the web application at: http://127.0.0.1:5173
echo.
