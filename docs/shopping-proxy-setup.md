# Shopping Proxy Setup

Bu dokuman, mobil `shopping` modulu icin backend proxy baglantisini anlatir.

## 1) Backend endpointleri

`backend/server.js` icinde hazir endpointler:

- `GET /shopping/yandex?q=<query>`
- `GET /shopping/affiliate?q=<query>`
- `GET /shopping/search?q=<query>` (sirayla yandex -> affiliate -> fallback)

Donen format:

```json
{
  "source": "yandex",
  "products": [
    {
      "id": "item-1",
      "name": "Urun adi",
      "prices": [
        {
          "store": "Magaza",
          "price": 999,
          "oldPrice": 1199,
          "delivery": "1-2 gun"
        }
      ]
    }
  ]
}
```

## 2) Backend .env

`backend/.env` icine:

```env
OPENAI_API_KEY=...

YANDEX_PROVIDER_URL=https://your-yandex-proxy-endpoint
YANDEX_PROVIDER_KEY=optional_key

AFFILIATE_PROVIDER_URL=https://your-affiliate-proxy-endpoint
AFFILIATE_PROVIDER_KEY=optional_key
```

Not:
- Bu URL'ler sizin anlasmali provider endpointleriniz olmali.
- Anahtar yoksa ilgili `*_KEY` bos birakilabilir.

## 3) Mobil uygulama .env

Proje kokunde Expo env:

```env
EXPO_PUBLIC_SHOPPING_YANDEX_PROXY=http://<backend-host>:5000/shopping/yandex
EXPO_PUBLIC_SHOPPING_AFFILIATE_PROXY=http://<backend-host>:5000/shopping/affiliate
```

Local Android emulator icin genelde:

```env
EXPO_PUBLIC_SHOPPING_YANDEX_PROXY=http://10.0.2.2:5000/shopping/yandex
EXPO_PUBLIC_SHOPPING_AFFILIATE_PROXY=http://10.0.2.2:5000/shopping/affiliate
```

## 4) Calistirma

Backend:

```bash
cd backend
npm run start
```

Mobil:

```bash
npx expo start -c
```
