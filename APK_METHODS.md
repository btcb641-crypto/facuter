# 📱 طرق تحويل التطبيق إلى APK

## ✅ الطريقة الأسهل والأضمن: PWABuilder (بدون GitHub)

### 1️⃣ PWABuilder — مجاني وسهل جداً
1. افتح: https://www.pwabuilder.com
2. أدخل رابط موقعك: `https://USERNAME.github.io/invoice-manager/`
3. اضغط **Start**
4. اختر **Android** → **Generate Package**
5. حمّل APK مباشرة ✅

---

## ✅ الطريقة الثانية: Bubblewrap (Google Tool)

```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest https://USERNAME.github.io/invoice-manager/manifest.json
bubblewrap build
```

---

## ✅ الطريقة الثالثة: Android Studio محلياً

1. حمّل Android Studio من: https://developer.android.com/studio
2. نفّذ:
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap add android
npx cap sync android
npx cap open android
```
3. في Android Studio: **Build → Generate Signed APK**

---

## ✅ الطريقة الرابعة: Expo EAS Build (سحابي)

```bash
npm install -g @expo/eas-cli
eas build --platform android
```
