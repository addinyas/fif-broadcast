@echo off
title FIF Deploy
echo ============================================
echo   FIF - Deploy ke GitHub ^&amp; Railway
echo ============================================
echo.

if "%*"=="" (
  echo Gunakan: deploy "pesan commit"
  echo Contoh  : deploy "fix: perbaiki bug di halaman customer"
  echo.
  pause
  exit /b 1
)

echo [1/4] Menambahkan semua perubahan...
git add -A

echo [2/4] Commit: "%*"
git commit -m "%*"

echo [3/4] Push ke GitHub...
git push

echo [4/4] Deploy ke Railway...
railway up --detach

echo.
echo ============================================
echo   Selesai! Semua perubahan sudah di-deploy.
echo ============================================
echo.
pause
