# 📱 Gapdirik Master — APK Build Rehberi

## Gereksinimler
- **Android Studio** (Hedgehog veya üzeri) kurulu olmalı
- **JDK 17+** kurulu olmalı
- `ANDROID_HOME` ortam değişkeni tanımlı olmalı

---

## 1. Web Uygulamasını Build Et

```bash
cd gapdirik/client
npm run build
```

## 2. Android'e Sync Et

```bash
npx cap sync android
```

## 3. Android Studio'da Aç

```bash
npx cap open android
```

## 4. Android Studio'da APK Oluştur

`Build` → `Build Bundle(s) / APK(s)` → `Build APK(s)`

İmzalı APK için:
`Build` → `Generate Signed Bundle / APK`

## 5. APK Konumu

```
android/app/build/outputs/apk/debug/app-debug.apk
```

---

## Tek Komutla Build (Güncelleme için)

```bash
npm run build:android
```

Bu komut sırayla şunları yapar:
1. `vite build` → `dist/` oluşturur
2. `npx cap sync android` → Android projesini günceller

---

## Sunucu Dağıtımı (Production APK için)

APK'nın gerçek bir sunucuya bağlanabilmesi için `capacitor.config.json` içindeki sunucu URL'sini güncelle:

```json
{
  "server": {
    "url": "https://gapdirik.yourdomain.com",
    "cleartext": true
  }
}
```

Ya da `client/src/socket.ts` dosyasındaki `SOCKET_URL`'yi güncelleyip yeniden build alabilirsin.
