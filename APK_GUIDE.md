# 📱 دليل تحويل التطبيق إلى APK أندرويد

## ═══════════════════════════════════════
## 🚀 الطريقة الأولى — GitHub Actions (تلقائي بدون أي إعداد)
## ═══════════════════════════════════════

هذه الطريقة الأسهل — GitHub يبني APK تلقائياً في السحابة.

### الخطوات:

**1️⃣ ارفع الكود على GitHub**
```bash
git init
git add .
git commit -m "🚀 Invoice Manager App"
git remote add origin https://github.com/USERNAME/invoice-manager.git
git branch -M main
git push -u origin main
```

**2️⃣ شغّل البناء يدوياً**
- اذهب إلى مستودعك على GitHub
- اضغط تبويب **Actions**
- اختر **🤖 Build Android APK**
- اضغط **Run workflow** → اختر نوع البناء → **Run**

**3️⃣ حمّل APK**
- انتظر 10-15 دقيقة
- عند اكتمال البناء، اذهب إلى تبويب **Releases**
- حمّل ملف `.apk`

**4️⃣ ثبّت على هاتفك**
- انقل الـ APK إلى هاتفك
- فعّل "تثبيت من مصادر غير معروفة" في إعدادات الأمان
- افتح الملف وثبّت التطبيق ✅

---

## ═══════════════════════════════════════
## 🔧 الطريقة الثانية — البناء المحلي على جهازك
## ═══════════════════════════════════════

### المتطلبات:
- Node.js 18+
- Java JDK 17
- Android Studio (اختياري)
- Android SDK

### الخطوات:

**1️⃣ تثبيت Capacitor**
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
```

**2️⃣ بناء مشروع Vite**
```bash
npm run build
```

**3️⃣ إضافة منصة Android**
```bash
npx cap add android
```

**4️⃣ مزامنة الملفات**
```bash
npx cap sync android
```

**5️⃣ بناء APK**
```bash
cd android
chmod +x gradlew
./gradlew assembleDebug
```

**6️⃣ موقع ملف APK:**
```
android/app/build/outputs/apk/debug/app-debug.apk
```

---

## ═══════════════════════════════════════
## 📱 الطريقة الثالثة — Android Studio (الأسهل بصرياً)
## ═══════════════════════════════════════

```bash
# 1. بناء وفتح في Android Studio
npm run build
npx cap sync android
npx cap open android
```

- في Android Studio: **Build → Generate Signed Bundle/APK**
- اختر **APK** → **debug** أو **release**
- اضغط **Finish**

---

## ═══════════════════════════════════════
## 🏪 النشر على متجر Google Play
## ═══════════════════════════════════════

للنشر على Google Play تحتاج **APK موقّع** (Signed APK):

### 1. إنشاء Keystore
```bash
keytool -genkey -v -keystore invoice-manager.keystore \
  -alias invoice-manager -keyalg RSA -keysize 2048 -validity 10000
```

### 2. إضافة Secrets في GitHub
اذهب إلى **Settings → Secrets → Actions** وأضف:
```
KEYSTORE_BASE64    → (محتوى keystore مشفر base64)
KEYSTORE_PASSWORD  → (كلمة سر keystore)
KEY_ALIAS          → invoice-manager
KEY_PASSWORD       → (كلمة سر المفتاح)
```

### 3. تحويل Keystore لـ Base64
```bash
base64 -i invoice-manager.keystore | pbcopy  # Mac
base64 invoice-manager.keystore              # Linux
```

---

## ═══════════════════════════════════════
## ❓ حل المشاكل الشائعة
## ═══════════════════════════════════════

### ❌ خطأ: JAVA_HOME not set
```bash
# Linux/Mac
export JAVA_HOME=$(dirname $(dirname $(readlink -f $(which java))))
```

### ❌ خطأ: SDK location not found
```bash
# أنشئ ملف local.properties في مجلد android/
echo "sdk.dir=/path/to/android/sdk" > android/local.properties
```

### ❌ خطأ: Gradle build failed
```bash
cd android && ./gradlew clean && ./gradlew assembleDebug
```

### ❌ التطبيق لا يفتح على الهاتف
- تأكد أن Android 6.0+ (API 23+)
- فعّل "مصادر غير معروفة" في الإعدادات

---

## 📋 معلومات التطبيق

| المعلومة | القيمة |
|---------|--------|
| اسم التطبيق | نظام الفواتير |
| Package ID | com.ouldbouzidi.invoicemanager |
| الحد الأدنى Android | 6.0 (API 23) |
| المستهدف | Android 14 (API 34) |
| الحجم التقريبي | ~5 MB |
