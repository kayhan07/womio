param(
  [string]$ReleaseDir = "release"
)

$ErrorActionPreference = "Stop"

Write-Host "1/6 Cleaning release directory..."
if (Test-Path $ReleaseDir) {
  Remove-Item -Recurse -Force $ReleaseDir
}
New-Item -ItemType Directory -Path $ReleaseDir | Out-Null

Write-Host "2/6 Building Expo web output..."
npx expo export --platform web

if (!(Test-Path "dist")) {
  throw "Web build failed: dist folder was not created."
}

Write-Host "3/6 Copying web artifacts..."
Copy-Item -Recurse -Force dist "$ReleaseDir/web"

Write-Host "4/6 Copying backend artifacts..."
New-Item -ItemType Directory -Path "$ReleaseDir/backend" | Out-Null
Copy-Item backend/server.js "$ReleaseDir/backend/server.js"
Copy-Item backend/package.json "$ReleaseDir/backend/package.json"
Copy-Item backend/package-lock.json "$ReleaseDir/backend/package-lock.json"
Copy-Item backend/.env.production.example "$ReleaseDir/backend/.env.production.example"

if (Test-Path "backend/sql") {
  Copy-Item -Recurse -Force backend/sql "$ReleaseDir/backend/sql"
}

Write-Host "5/6 Copying deploy configs..."
if (Test-Path "deploy") {
  Copy-Item -Recurse -Force deploy "$ReleaseDir/deploy"
}

if (Test-Path "docs/production-deploy-and-store.md") {
  Copy-Item "docs/production-deploy-and-store.md" "$ReleaseDir/production-deploy-and-store.md"
}

Write-Host "6/6 Writing upload checklist..."
$checklist = @"
WOMIO RELEASE CHECKLIST

1) WEB:
   Upload release/web/* to: /var/www/womio/web

2) BACKEND:
   Upload release/backend/* to: /var/www/womio/backend
   Then run:
   cd /var/www/womio/backend
   npm ci --omit=dev
   cp .env.production.example .env
   # fill real env values

3) SQL:
   Run file:
   /var/www/womio/backend/sql/001_womio_core_mysql.sql

4) NGINX:
   Use:
   release/deploy/nginx/womio.net.conf

5) SYSTEMD:
   Use:
   release/deploy/systemd/womio-backend.service
"@

Set-Content -Path "$ReleaseDir/UPLOAD-CHECKLIST.txt" -Value $checklist -Encoding UTF8

Write-Host "Release is ready at: $ReleaseDir"
