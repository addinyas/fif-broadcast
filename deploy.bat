@echo off
title FIF Deploy
setlocal enabledelayedexpansion

echo ============================================
echo   FIF - Deploy ke VPS via GitHub Actions
echo ============================================
echo.

if "%*"=="" (
  echo Gunakan: deploy "pesan commit"
  echo Contoh  : deploy "fix: perbaiki bug di halaman customer"
  echo.
  pause
  exit /b 1
)

echo [1/5] Menambahkan semua perubahan...
git add -A

echo [2/5] Mendapatkan tanggal hari ini...
for /f "tokens=1-3 delims=/ " %%a in ('date /t') do set TGL=%%c-%%a-%%b
if "!TGL!"=="" set TGL=%DATE:~10,4%-%DATE:~4,2%-%DATE:~7,2%

echo [3/5] Menambahkan catatan ke AGENTS.md...
echo - ^(Neon^) **!TGL!**: %* >> AGENTS.md
git add AGENTS.md

echo [4/5] Commit: "%*"
git commit -m "%*"

echo [5/5] Push ke GitHub...
git push

echo.
echo ============================================
echo   Berhasil! Cek status deploy di:
echo   https://github.com/addinyas/fif-broadcast/actions
echo ============================================
echo.
pause
