#!/bin/bash
set -e

MESSAGE="$*"
if [ -z "$MESSAGE" ]; then
  echo "Usage: ./deploy.sh <commit message>"
  echo "Example: ./deploy.sh fix: perbaiki bug di halaman customer"
  exit 1
fi

git add -A
git commit -m "$MESSAGE"
git push

echo "Deploying to Railway..."
railway up --detach

echo "Done! Deployed successfully."
