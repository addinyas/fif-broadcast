@echo off
title FIF App Launcher
echo ============================================
echo   FIF - Finance Installment Follow-up
echo   Memulai semua komponen aplikasi...
echo ============================================
echo.

start "FIF Backend" cmd /k "cd /d %~dp0backend && composer run dev"
timeout /t 3 /nobreak >nul

start "FIF Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
timeout /t 3 /nobreak >nul

start "FIF Worker" cmd /k "cd /d %~dp0worker && npm run start"

echo.
echo Semua komponen telah dijalankan:
echo   Backend  : http://localhost:8000
echo   Frontend : http://localhost:5173
echo   Worker   : Socket.IO port 3001
echo.
echo Tutup jendela ini untuk menghentikan semua.
pause
