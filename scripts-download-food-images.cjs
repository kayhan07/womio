const fs = require('fs');
const path = require('path');

const root = process.cwd();
const recipesFile = path.join(root, 'src/modules/food/recipes.ts');
const outDir = path.join(root, 'assets/food');
fs.mkdirSync(outDir, { recursive: true });

function readEnv(file) {
  if (!fs.existsSync(file)) return {};
  const txt = fs.readFileSync(file, 'utf8');
  const env = {};
  for (const line of txt.split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i < 0) continue;
    const k = line.slice(0, i).trim();
    const v = line.slice(i + 1).trim().replace(/^['\"]|['\"]$/g, '');
    env[k] = v;
  }
  return env;
}

const env = {
  ...readEnv(path.join(root, '.env')),
  ...readEnv(path.join(root, 'backend/.env')),
  ...process.env,
};
const serpKey = env.SERPAPI_API_KEY || '';

const src = fs.readFileSync(recipesFile, 'utf8');
const lines = src.split(/\r?\n/);
const recipes = [];
for (const line of lines) {
  const m = line.match(/id:\s*"([^"]+)".*title:\s*"([^"]+)".*img:\s*"([^"]+)"/);
  if (m) recipes.push({ id: m[1], title: m[2], img: m[3] });
}

async function getGoogleImageUrl(title) {
  if (!serpKey) return '';
  const params = new URLSearchParams({
    engine: 'google_images',
    q: `${title} yemek`,
    hl: 'tr',
    gl: 'tr',
    api_key: serpKey,
  });
  const r = await fetch(`https://serpapi.com/search.json?${params.toString()}`);
  if (!r.ok) return '';
  const data = await r.json();
  const arr = Array.isArray(data?.images_results) ? data.images_results : [];
  for (const it of arr) {
    const u = `${it?.original || it?.thumbnail || ''}`.trim();
    if (u.startsWith('http://') || u.startsWith('https://')) return u;
  }
  return '';
}

async function download(url, filePath) {
  const r = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0',
      'accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
    }
  });
  if (!r.ok) throw new Error(`download_failed_${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  fs.writeFileSync(filePath, buf);
}

(async () => {
  let ok = 0, fallback = 0, fail = 0;
  for (const rec of recipes) {
    const out = path.join(outDir, `${rec.id}.jpg`);
    let picked = '';
    try {
      picked = await getGoogleImageUrl(rec.title);
      if (!picked) {
        picked = rec.img;
        fallback++;
      }
      await download(picked, out);
      ok++;
      console.log(`ok ${rec.id} <- ${picked}`);
      await new Promise(r => setTimeout(r, 180));
    } catch (e) {
      fail++;
      console.log(`fail ${rec.id} ${String(e.message || e)}`);
    }
  }
  console.log(JSON.stringify({ total: recipes.length, ok, fallback, fail }, null, 2));
})();
