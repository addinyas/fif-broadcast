@echo off
title FIF App Stopper
color 0C
echo ============================================
echo    Stopping all FIF services...
echo ============================================
echo.

echo Stopping Backend (port 8000)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000 " ^| findstr "LISTENING" 2^>nul') do taskkill /F /PID %%a >nul 2>&1

echo Stopping Frontend (port 5173)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 " ^| findstr "LISTENING" 2^>nul') do taskkill /F /PID %%a >nul 2>&1

echo Stopping Worker (port 3001)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001 " ^| findstr "LISTENING" 2^>nul') do taskkill /F /PID %%a >nul 2>&1

echo Stopping Queue Worker...
taskkill /FI "WINDOWTITLE eq FIF Queue Worker*" /F >nul 2>&1

echo Stopping all FIF windows...
taskkill /FI "WINDOWTITLE eq FIF*" /F >nul 2>&1

echo.
echo ============================================
echo    All FIF services stopped.
echo ============================================
pause
