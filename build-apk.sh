#!/bin/bash

# ═══════════════════════════════════════════════════════════════
#  🤖 سكريبت بناء APK — نظام إدارة الفواتير
#  الاستخدام: bash build-apk.sh
# ═══════════════════════════════════════════════════════════════

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   🤖 بناء APK — نظام إدارة الفواتير     ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
echo ""

# ── التحقق من المتطلبات ──
echo -e "${YELLOW}🔍 التحقق من المتطلبات...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js غير مثبت! حمّله من: https://nodejs.org${NC}"
    exit 1
fi

if ! command -v java &> /dev/null; then
    echo -e "${RED}❌ Java غير مثبت! حمّل JDK 17 من: https://adoptium.net${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"
echo -e "${GREEN}✅ Java: $(java -version 2>&1 | head -1)${NC}"
echo ""

# ── 1. تثبيت التبعيات ──
echo -e "${YELLOW}📦 تثبيت التبعيات...${NC}"
npm install

# ── 2. تثبيت Capacitor ──
echo -e "${YELLOW}⚡ تثبيت Capacitor...${NC}"
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/splash-screen @capacitor/status-bar

# ── 3. بناء Vite ──
echo -e "${YELLOW}🔨 بناء مشروع Vite...${NC}"
npm run build

# ── 4. إضافة Android (إذا لم يكن موجوداً) ──
if [ ! -d "android/app/src/main" ]; then
    echo -e "${YELLOW}📱 إضافة منصة Android...${NC}"
    npx cap add android
fi

# ── 5. مزامنة Capacitor ──
echo -e "${YELLOW}🔄 مزامنة Capacitor...${NC}"
npx cap sync android

# ── 6. بناء APK ──
echo -e "${YELLOW}🏗️ بناء APK Debug...${NC}"
cd android
chmod +x gradlew
./gradlew assembleDebug --no-daemon
cd ..

# ── 7. نسخ APK ──
APK_SRC="android/app/build/outputs/apk/debug/app-debug.apk"
APK_DST="invoice-manager.apk"

if [ -f "$APK_SRC" ]; then
    cp "$APK_SRC" "$APK_DST"
    SIZE=$(du -sh "$APK_DST" | cut -f1)
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║           ✅ تم بناء APK بنجاح!          ║${NC}"
    echo -e "${GREEN}╠══════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║  📁 الملف: ${APK_DST}${NC}"
    echo -e "${GREEN}║  📏 الحجم: ${SIZE}${NC}"
    echo -e "${GREEN}╠══════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║  📲 انقل الملف لهاتفك وثبّته!           ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
    echo ""
else
    echo -e "${RED}❌ فشل بناء APK! راجع الأخطاء أعلاه.${NC}"
    exit 1
fi
