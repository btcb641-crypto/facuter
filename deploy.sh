#!/bin/bash

# ═══════════════════════════════════════════════════════
#  سكريبت النشر اليدوي على GitHub Pages
#  الاستخدام: bash deploy.sh
# ═══════════════════════════════════════════════════════

set -e

echo "📦 بناء المشروع..."
npm run build

echo "🚀 نشر على GitHub Pages..."
cd dist

git init
git checkout -b gh-pages
git add -A
git commit -m "🚀 deploy: $(date '+%Y-%m-%d %H:%M')"

echo ""
echo "✅ جاهز! الآن نفّذ الأمر التالي مع رابط مستودعك:"
echo ""
echo "git push -f https://github.com/YOUR_USERNAME/YOUR_REPO.git gh-pages:gh-pages"
echo ""
echo "ثم اذهب إلى Settings → Pages واختر Branch: gh-pages"
