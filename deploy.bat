@echo off
title FIF Deploy
setlocal enabledelayedexpansion

echo ============================================
echo   FIF - Push ^& Deploy ke VPS via GitHub Actions
echo ============================================
echo.

:: --- Check git status ---
echo [1/6] Checking git status...
echo.
git status --short
echo.

:: --- Check if there are any changes ---
set "HAS_CHANGES=0"
for /f "tokens=*" %%i in ('git status --short 2^>nul') do set "HAS_CHANGES=1"
if "!HAS_CHANGES!"=="0" (
    echo Tidak ada perubahan yang terdeteksi.
    echo.
    pause
    exit /b 0
)

:: --- Detect which areas changed ---
set "BACKEND=0"
set "FRONTEND=0"
set "WORKER=0"
set "DEPLOY=0"

for /f "usebackq tokens=* delims=" %%i in (`git status --short 2^>nul`) do (
    set "LINE=%%i"
    :: Trim leading spaces
    for /f "tokens=* delims= " %%a in ("!LINE!") do set "LINE=%%a"
    :: Check directory prefixes
    if "!LINE:~0,8!"=="backend/"  set "BACKEND=1"
    if "!LINE:~0,9!"=="frontend/" set "FRONTEND=1"
    if "!LINE:~0,7!"=="worker/"   set "WORKER=1"
    if "!LINE:~0,7!"=="deploy/"   set "DEPLOY=1"
)

:: --- Show detected areas ---
echo [2/6] Perubahan terdeteksi di:
if "!BACKEND!"=="1"  echo   [x] Backend
if "!FRONTEND!"=="1" echo   [x] Frontend
if "!WORKER!"=="1"   echo   [x] Worker
if "!DEPLOY!"=="1"   echo   [x] Deploy script
echo   [x] Root files (AGENTS.md, deploy.bat, start-apps.bat)
echo.

:: --- Get today's date ---
for /f "tokens=2 delims==" %%a in ('wmic os get localdatetime /value 2^>nul') do set "DT=%%a"
set "TGL=!DT:~0,4!-!DT:~4,2!-!DT:~6,2!"

:: --- Confirm ---
set /p "CONFIRM=Lanjut commit per fitur ^& push? (Y/N): "
if /i "!CONFIRM!" neq "Y" (
    echo Dibatalkan.
    pause
    exit /b 0
)

:: --- Commit per feature group ---
echo.
echo [3/6] Committing per feature group...
echo.

:: Backend
if "!BACKEND!"=="1" (
    git add backend/
    git commit -m "fix(backend): !TGL! update"
    echo   [OK] Backend committed
    echo.
)

:: Frontend
if "!FRONTEND!"=="1" (
    git add frontend/
    git commit -m "fix(frontend): !TGL! update"
    echo   [OK] Frontend committed
    echo.
)

:: Worker
if "!WORKER!"=="1" (
    git add worker/
    git commit -m "fix(worker): !TGL! update"
    echo   [OK] Worker committed
    echo.
)

:: Deploy script
if "!DEPLOY!"=="1" (
    git add deploy/
    git commit -m "chore(deploy): !TGL! update"
    echo   [OK] Deploy script committed
    echo.
)

:: Root files
git add AGENTS.md start-apps.bat deploy.bat .gitignore 2>nul
git commit -m "chore: !TGL! root files update"
echo   [OK] Root files committed
echo.

:: --- Check if there are any commits to push ---
git log --oneline origin/main..HEAD 2>nul | findstr "." >nul 2>&1
if errorlevel 1 (
    echo Tidak ada commit baru untuk di-push.
    echo.
    pause
    exit /b 0
)

:: --- Show what will be pushed ---
echo [4/6] Commits yang akan di-push:
git log --oneline origin/main..HEAD 2>nul
echo.

:: --- Push ---
echo [5/6] Pushing ke GitHub...
git push
if errorlevel 1 (
    echo.
    echo ERROR: Push gagal! Cek koneksi atau branch.
    pause
    exit /b 1
)

:: --- Update AGENTS.md: mark as pushed ---
echo.
echo [6/6] Updating AGENTS.md...

:: Replace "Belum di-push" with "Sudah di-push" using PowerShell
powershell -Command "$f='AGENTS.md'; $c=Get-Content $f -Raw -Encoding UTF8; $c=$c.Replace('**Belum di-push**', '**Sudah di-push**'); [System.IO.File]::WriteAllText($f, $c, [System.Text.UTF8Encoding]::new($false))"
git add AGENTS.md
git commit -m "chore: tandai sudah di-push !TGL!"
git push

echo.
echo ============================================
echo   Berhasil!
echo.
echo   GitHub Actions akan auto-deploy ke VPS.
echo   https://github.com/addinyas/fif-broadcast/actions
echo ============================================
echo.
pause
