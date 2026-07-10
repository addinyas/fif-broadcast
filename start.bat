@echo off
title FIF Local Dev
echo ============================================
echo   Memulai FIF (Backend + Frontend)
echo ============================================
echo.

echo [1/2] Menjalankan Backend Laravel...
start "FIF Backend" cmd /c "cd /d %~dp0backend && php artisan serve --host=127.0.0.1 --port=8000"

timeout /t 2 /nobreak >nul

echo [2/2] Menjalankan Frontend Vite...
start "FIF Frontend" cmd /c "cd /d %~dp0frontend && npm run dev"

echo.
echo ============================================
echo   Backend : http://127.0.0.1:8000
echo   Frontend: http://localhost:5173
echo ============================================
echo.
echo Buka http://localhost:5173 di browser
echo Login: superadmin@crm.test / password
echo.
pause
