# WOMIO Production Kurulum (womio.net + Mobil Store)

Bu dokuman, WOMIO'yu yeni moduller eklenebilir sekilde production ortamina tasimak icin minimum adimlari verir.

## 1) Veritabani (SQL)

1. MySQL 8.0 veritabani olustur.
2. `backend/sql/001_womio_core_mysql.sql` dosyasini calistir.

Ornek:

```bash
mysql -u USER -p DB_NAME < backend/sql/001_womio_core_mysql.sql
```

Bu schema ile:
- Kullanici/rol yonetimi hazir.
- Modul ve feature flag tablolari hazir.
- Alisveris urun/fiyat kayitlari hazir.
- Admin audit log yapisi hazir.

## 2) Backend (api.womio.net veya womio.net/api)

1. `backend/.env.production.example` dosyasini `backend/.env` olarak kopyala.
2. Anahtarlarini doldur (`OPENROUTER_API_KEY`, provider endpointleri vb).
3. Servisi ayaga kaldir.

```bash
cd backend
npm install
npm run start
```

Canlilik kontrolu:

```bash
curl https://womio.net/api/health
```

## 3) Web (womio.net)

Expo web build:

```bash
npx expo export --platform web
```

Olusan `dist` icerigini sunucuya kopyala:

- hedef: `/var/www/womio/web`

Android dogrudan indirme dosyalari:

- hedef klasor: `/var/www/womio/downloads`
- ornek dosya: `/var/www/womio/downloads/womio-latest.apk`

Nginx:

- `deploy/nginx/womio.net.conf` dosyasini `/etc/nginx/sites-available/womio.net` altina koy.
- `sites-enabled` ile aktif et.
- `nginx -t && systemctl reload nginx`

Systemd backend:

- `deploy/systemd/womio-backend.service` dosyasini `/etc/systemd/system/` altina koy.
- `systemctl daemon-reload`
- `systemctl enable --now womio-backend`

## 4) Mobil Build (Google Play + App Store)

`app.json` ve `eas.json` production icin hazirlandi:

- Android package: `net.womio.app`
- iOS bundle: `net.womio.app`
- EAS build profilleri: `development`, `preview`, `production`

Ilk kurulum:

```bash
npm install
npx eas login
npx eas build:configure
```

Build:

```bash
npx eas build --platform android --profile production
npx eas build --platform ios --profile production
```

Store submit:

```bash
npx eas submit --platform android --profile production
npx eas submit --platform ios --profile production
```

Not:
- `app.json` icindeki `REPLACE_WITH_EAS_PROJECT_ID` doldurulmali.
- `eas.json` icindeki `REPLACE_WITH_ASC_APP_ID` doldurulmali.
- App Store URL cikinca `.env` icindeki `EXPO_PUBLIC_APP_STORE_URL` guncellenmeli.

## 5) Siteden Uygulama Indirme

Web route eklendi: `app/download.tsx`

Bu sayfada:
- Google Play linki
- App Store linki
- APK linki (opsiyonel)
- TestFlight linki (opsiyonel)

Linkleri `.env` icinden yonet:

- `EXPO_PUBLIC_GOOGLE_PLAY_URL`
- `EXPO_PUBLIC_APP_STORE_URL`
- `EXPO_PUBLIC_ANDROID_APK_URL`
- `EXPO_PUBLIC_TESTFLIGHT_URL`

## 6) Yeni Modul Ekleme Kurali

Yeni modul eklerken 3 katmanda ilerle:

1. Uygulama:
- `src/modules/<yeni-modul>/`
- gerekli ekranlar `app/(tabs)/...`

2. Veritabani:
- yeni migration SQL dosyasi (`backend/sql/00x_*.sql`)
- modul kaydi: `modules` tablosu

3. Feature rollout:
- `feature_flags` tablosundan asamali ac/kapat

Bu yapi ile yeni moduller canli sistemi bozmadan asamali yayina alinabilir.

## 7) Ortak Hesap (Web + App)

Web ve mobilin ayni hesabi kullanmasi icin:

1. Backend env:
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `JWT_SECRET`

2. Uygulama env:
- `EXPO_PUBLIC_API_BASE_URL=https://api.womio.net` (veya `https://womio.net/api`)

3. Auth endpointleri:
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

Bu endpointler aktif oldugunda login/register ekranlari otomatik olarak local storage yerine ortak API auth kullanir.
