# WOMIO

WOMIO is a modular Expo app (Android, iOS, Web) with a Node.js backend for shopping proxy and AI-assisted features.

## Project Structure

- `app/`: Expo Router screens
- `src/modules/`: module-level client logic
- `backend/`: Express API
- `backend/sql/`: MySQL schema/migrations
- `deploy/`: production nginx/systemd samples
- `docs/`: architecture and deployment docs

## Local Run

```bash
npm install
npx expo start
```

Backend:

```bash
cd backend
npm install
npm run start
```

## Production

Detailed guide:

- `docs/production-deploy-and-store.md`
- `docs/host-upload-quickstart.md`

One-command release packaging:

```bash
npm run release:prepare
```

## Mobile Release

EAS profiles are in `eas.json`.

Key config placeholders to fill before release:

- `app.json` -> `updates.url`, `extra.eas.projectId`
- `eas.json` -> `submit.production.ios.ascAppId`
