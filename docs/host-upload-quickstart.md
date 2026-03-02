# WOMIO Hosta Yukleme (Hizli)

## 1) Release paketini olustur

```bash
npm run release:prepare
```

Bu komut su klasoru hazirlar:

- `release/web`
- `release/backend`
- `release/deploy`
- `release/UPLOAD-CHECKLIST.txt`

## 2) Sunucuya yukle

1. `release/web/*` -> `/var/www/womio/web`
2. `release/backend/*` -> `/var/www/womio/backend`

## 3) SQL calistir

```bash
mysql -u USER -p DB_NAME < /var/www/womio/backend/sql/001_womio_core_mysql.sql
```

## 4) Backend baslat

```bash
cd /var/www/womio/backend
npm ci --omit=dev
cp .env.production.example .env
# .env icini doldur
node server.js
```

## 5) Web server ayari

- Nginx: `release/deploy/nginx/womio.net.conf`
- Apache fallback: `release/deploy/apache/.htaccess`

## 6) Kontrol

- API: `https://womio.net/api/health`
- Web: `https://womio.net`
