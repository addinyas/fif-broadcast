@echo off
title FIF App Launcher
echo Starting FIF Application...
echo.

echo [1/4] Starting Backend (Laravel)...
start "FIF Backend" cmd /k "cd /d %~dp0backend && php artisan serve && pause"

echo [2/4] Starting Queue Worker...
start "FIF Queue" cmd /k "cd /d %~dp0backend && php artisan queue:listen --tries=1 --timeout=0 && pause"

echo [3/4] Starting Frontend (React + Vite)...
start "FIF Frontend" cmd /k "cd /d %~dp0frontend && npm run dev && pause"

echo [4/4] Starting Worker (WhatsApp Node.js)...
start "FIF Worker" cmd /k "cd /d %~dp0worker && npm run start && pause"

echo.
echo All services started in separate windows.
echo Close this window to leave them running.
pause
