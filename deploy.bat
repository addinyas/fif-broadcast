@echo off
if "%1"=="" (
  echo Usage: deploy "commit message"
  echo Example: deploy "fix: perbaiki bug di halaman customer"
  exit /b 1
)

git add -A
git commit -m "%*"
git push

echo Deploying to Railway...
railway up --detach

echo Done! Deployed successfully.
