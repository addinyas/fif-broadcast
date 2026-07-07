@echo off
title FIF App Launcher
echo Starting FIF Application...
echo.

echo [1/3] Starting Backend (Laravel)...
start "FIF Backend" cmd /c "cd /d "%~dp0backend" && echo Backend: http://localhost:8000 && composer run dev"

echo [2/3] Starting Frontend (React + Vite)...
start "FIF Frontend" cmd /c "cd /d "%~dp0frontend" && echo Frontend: http://localhost:5173 && npm run dev"

echo [3/3] Starting Worker (WhatsApp Node.js)...
start "FIF Worker" cmd /c "cd /d "%~dp0worker" && echo Worker: Socket.IO on port 3001 && npm run start"

echo.
echo All services started in separate windows.
echo Close this window to leave them running.
pause
