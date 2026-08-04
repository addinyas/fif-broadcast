@echo off
title FIF App Launcher
color 0A
setlocal EnableDelayedExpansion

echo ============================================
echo    FIF Application Launcher (Local Dev)
echo ============================================
echo.

:: ── Kill existing processes on ports ──────────
echo [0/6] Cleaning up old processes...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000 " ^| findstr "LISTENING" 2^>nul') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 " ^| findstr "LISTENING" 2^>nul') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001 " ^| findstr "LISTENING" 2^>nul') do taskkill /F /PID %%a >nul 2>&1
echo    Done.
echo.

:: ── Backend setup ─────────────────────────────
echo [1/6] Backend setup (migrate + seed)...
cd /d %~dp0backend

php artisan migrate --force 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo    [WARN] Migrate ada error, coba pakai --force...
    php artisan migrate:refresh --seed --force 2>&1
)
echo    DB ready.
echo.

:: ── Start Backend ─────────────────────────────
echo [2/6] Starting Backend (port 8000)...
start "FIF Backend" cmd /k "title FIF Backend [port 8000] && cd /d %~dp0backend && php artisan serve --host=0.0.0.0 --port=8000"
timeout /t 3 /nobreak >nul
echo    Backend started.
echo.

:: ── Start Queue Worker ────────────────────────
echo [3/6] Starting Queue Worker...
start "FIF Queue" cmd /k "title FIF Queue Worker && cd /d %~dp0backend && php artisan queue:listen --tries=1 --timeout=0"
echo    Queue worker started.
echo.

:: ── Start Frontend ────────────────────────────
echo [4/6] Starting Frontend (port 5173)...
cd /d %~dp0frontend
if not exist "node_modules" (
    echo    Installing dependencies...
    call npm install
)
start "FIF Frontend" cmd /k "title FIF Frontend [port 5173] && cd /d %~dp0frontend && npm run dev"
echo    Frontend started.
echo.

:: ── Start Worker (WhatsApp) ───────────────────
echo [5/6] Starting WhatsApp Worker (port 3001)...
cd /d %~dp0worker
if not exist "node_modules" (
    echo    Installing dependencies...
    call npm install
)
start "FIF Worker" cmd /k "title FIF Worker [port 3001] && cd /d %~dp0worker && npm run start"
echo    Worker started.
echo.

:: ── Summary ───────────────────────────────────
echo [6/6] All services started!
echo.
echo ============================================
echo    SERVICE URLs:
echo    Backend  : http://localhost:8000
echo    Frontend : http://localhost:5173
echo    Worker   : http://localhost:3001
echo ============================================
echo.
echo    Login: NPOSUPERADMIN / 08996789
echo    (atau NPO005 / 08996789 untuk AO)
echo.
echo    Close this window to leave them running.
echo    To stop all: jalankan stop-apps.bat
echo.
pause
