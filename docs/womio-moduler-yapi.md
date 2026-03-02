# WOMIO Modüler Yapı (V1)

## 1) Ürün Hedefi
WOMIO, kadınların günlük yaşamını planlayan, destekleyen ve güçlendiren çok modüllü bir dijital arkadaş olarak tasarlanır.

## 2) Dil ve Platform
- Ana dil: Türkçe
- Ek diller: İngilizce, Almanca, Rusça
- Platformlar: Android (Google Play), iOS (App Store), Web
- Domain: `womio.net`

## 3) Mimari Karar
Önerilen model:
- Uygulama istemcisi: Expo React Native + Expo Router (tek kod tabanı, web dahil)
- Veri ve kimlik: Supabase (Auth + Postgres + Storage + RLS)
- Backend iş kuralları: Node.js servisleri (modül API katmanı)
- Domain/host: `api.womio.net` ve `app.womio.net` altında kendi sunucunuz

Not:
- Tamamen kendi host yaklaşımı da mümkündür.
- İlk sürümde hız ve güvenlik için Supabase hibrit model daha düşük risklidir.

## 4) Modül Sınırları
Her modül kendi veri modeli, servis katmanı ve ekranları ile ayrılır:

1. Sağlık
- Regl takibi
- Hamilelik takibi
- İlaç hatırlatma
- Su takibi
- Adım takibi
- Kilo/diyet öneri akışı

2. Hizmet & İş İlanları
- Kısıtlı kategori: ev temizliği, çocuk bakıcılığı, yaşlı bakımı
- İlan süresi en fazla 30 gün
- İlk ilan ücretsiz, sonrası ücretli
- İl/ilçe filtreleme

3. Akıllı Alışveriş
- Ürün arama
- Fiyat karşılaştırma
- İndirim görünürlüğü
- Deneyim/yıldız/yorum topluluğu

4. Astroloji & Fal
- Günlük burç
- Haftalık/aylık yorum
- Burç uyumu
- Tarot
- Kahve falı (AI)
- Günlük bildirim

## 5) Giriş ve Güvenlik Akışı
- Kayıt alanları: kullanıcı adı, e-posta, şifre, doğum tarihi
- Google ile giriş
- Şifremi unuttum: geçici şifre e-posta akışı
- Oturum hatırlama
- Opsiyonel 4 haneli PIN

## 6) Ölçeklenebilir Dizin Önerisi
```txt
app/
  (tabs)/
src/
  core/
    i18n/
    theme/
    auth/
  modules/
    health/
    jobs/
    shopping/
    astrology/
  shared/
    ui/
    api/
    types/
backend/
  services/
  routes/
  workers/
```

## 7) Sonraki Faz
1. Supabase şema ve RLS politikalarını oluşturma
2. Auth + Google Sign-In + forgot password API entegrasyonu
3. Modül bazlı veri modellerinin canlı bağlanması
4. Bildirim altyapısı (ilaç, su, astroloji)
