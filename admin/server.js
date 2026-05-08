// ============================================================
// Duuump Admin - lokalny serwer do CRUD inspiracji
// ============================================================
//
// Endpointy:
//   GET    /api/list          - lista wpisow (najnowsze pierwsze)
//   POST   /api/add           - dodaj wpis (multipart: image + meta)
//   PATCH  /api/update        - edytuj caption/author/authorUrl
//   DELETE /api/delete        - usun wpis + plik na Cloudinary
//   PUT    /api/reorder       - zapisz nowa kolejnosc
//
// Bezpieczenstwo: nasluchuje tylko na 127.0.0.1 (localhost).
// ============================================================

import express from 'express';
import multer from 'multer';
import dotenv from 'dotenv';
import { createHash } from 'crypto';
import { readFile, writeFile, unlink } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');
const JSON_PATH = join(PROJECT_ROOT, 'inspirations.json');

// ---------- Wczytaj sekrety ----------
dotenv.config({ path: join(PROJECT_ROOT, '.env') });

const {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
} = process.env;

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.error('✗ Brak credentiali Cloudinary w .env');
  console.error('  Sprawdz plik:', join(PROJECT_ROOT, '.env'));
  process.exit(1);
}

// ---------- Konfiguracja Express ----------
const app = express();
const PORT = 4000;
const HOST = '127.0.0.1';

app.use(express.json({ limit: '1mb' }));

app.get('/', (req, res) => res.redirect('/admin.html'));

// Logo i theme z folderu nadrzednego (PRZED express.static!)
app.get('/logo.svg', (req, res) => res.sendFile(join(PROJECT_ROOT, 'logo.svg')));
app.get('/theme.css', (req, res) => res.sendFile(join(PROJECT_ROOT, 'theme.css')));
app.use(express.static(__dirname));

const upload = multer({
  dest: '/tmp/duuump-uploads/',
  limits: { fileSize: 25 * 1024 * 1024 },
});

// ============================================================
// Pomocnicze
// ============================================================

async function readInspirations() {
  const content = await readFile(JSON_PATH, 'utf-8');
  return JSON.parse(content);
}

async function writeInspirations(data) {
  await writeFile(JSON_PATH, JSON.stringify(data, null, 2) + '\n');
}

async function gitCommitAndPush(message) {
  const cwd = PROJECT_ROOT;
  await execAsync('git add inspirations.json', { cwd });
  // Mozliwe ze nic nie zmienione (np. reorder do tej samej kolejnosci)
  try {
    await execAsync(`git commit -m ${JSON.stringify(message)}`, { cwd });
  } catch (e) {
    if (!String(e.stdout).includes('nothing to commit')) throw e;
    return; // Nic do pushowania
  }
  await execAsync('git push', { cwd });
}

// Wyciagnij Cloudinary public_id z URL.
// Format URL: https://res.cloudinary.com/<cloud>/image/upload/v<version>/<public_id>.<ext>
// public_id moze zawierac slash (jesli plik byl w folderze).
function extractPublicId(url) {
  if (!url || !url.includes('res.cloudinary.com')) return null;
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-zA-Z0-9]+)?$/);
  return match ? match[1] : null;
}

async function deleteFromCloudinary(url) {
  const publicId = extractPublicId(url);
  if (!publicId) return { ok: false, reason: 'Nie udalo sie wyciagnac public_id z URL' };

  const timestamp = Math.floor(Date.now() / 1000);
  const signatureString = `public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
  const signature = createHash('sha1').update(signatureString).digest('hex');

  const form = new URLSearchParams();
  form.append('public_id', publicId);
  form.append('api_key', CLOUDINARY_API_KEY);
  form.append('timestamp', String(timestamp));
  form.append('signature', signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/destroy`,
    { method: 'POST', body: form }
  );
  const data = await response.json();
  return { ok: data.result === 'ok' || data.result === 'not found', cloudinary: data };
}

async function uploadToCloudinary(filePath) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signatureString = `timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
  const signature = createHash('sha1').update(signatureString).digest('hex');

  const form = new FormData();
  const fileBuffer = await readFile(filePath);
  const blob = new Blob([fileBuffer]);
  form.append('file', blob);
  form.append('api_key', CLOUDINARY_API_KEY);
  form.append('timestamp', String(timestamp));
  form.append('signature', signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: 'POST', body: form }
  );
  const data = await response.json();
  if (data.error) throw new Error(`Cloudinary: ${data.error.message}`);
  return data.secure_url;
}

// ============================================================
// Endpointy
// ============================================================

// ---------- GET /api/list ----------
// Zwraca liste w kolejnosci wyswietlania (najnowsze najpierw).
app.get('/api/list', async (req, res) => {
  try {
    const data = await readInspirations();
    // W JSON-ie ostatni element to "najnowszy" (wyswietla sie u gory).
    // Zwracam liste odwrocona - tak jak widzi user na stronie.
    const reversed = [...data].reverse();
    res.json({ items: reversed, total: data.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- POST /api/add ----------
app.post('/api/add', upload.single('image'), async (req, res) => {
  let tmpPath = null;
  try {
    if (!req.file) return res.status(400).json({ error: 'Brak pliku' });
    tmpPath = req.file.path;
    const { caption = '', author = '', authorUrl = '' } = req.body;

    console.log(`==> Add: ${req.file.originalname}`);
    const url = await uploadToCloudinary(tmpPath);
    console.log(`  ✓ Cloudinary: ${url}`);

    const entry = { url };
    if (caption) entry.caption = caption;
    if (author) entry.author = author;
    if (authorUrl) entry.authorUrl = authorUrl;

    const data = await readInspirations();
    data.push(entry);
    await writeInspirations(data);
    console.log('  ✓ JSON zaktualizowany');

    const commitDesc = caption || req.file.originalname;
    const fullMsg = author
      ? `Add inspiration: ${commitDesc} - ${author}`
      : `Add inspiration: ${commitDesc}`;
    await gitCommitAndPush(fullMsg);
    console.log('  ✓ Push');

    res.json({ success: true, entry });
  } catch (err) {
    console.error('✗ Add error:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    if (tmpPath && fs.existsSync(tmpPath)) unlink(tmpPath).catch(() => {});
  }
});

// ---------- PATCH /api/update ----------
// Body: { url: "...", caption?, author?, authorUrl? }
// Edytuje TYLKO te pola ktore sa w body. Pomijajac url-e nie zmieniamy obrazka.
app.patch('/api/update', async (req, res) => {
  try {
    const { url, caption, author, authorUrl } = req.body || {};
    if (!url) return res.status(400).json({ error: 'Brak url (identyfikator wpisu)' });

    const data = await readInspirations();
    const idx = data.findIndex((e) => e.url === url);
    if (idx === -1) return res.status(404).json({ error: 'Wpis nie znaleziony' });

    const updated = { ...data[idx] };

    // Pomocnicza: ustaw lub usun pole
    const setOrDelete = (key, value) => {
      if (value === undefined) return; // nie tykaj
      const trimmed = typeof value === 'string' ? value.trim() : value;
      if (trimmed === '') delete updated[key];
      else updated[key] = trimmed;
    };
    setOrDelete('caption', caption);
    setOrDelete('author', author);
    setOrDelete('authorUrl', authorUrl);

    // Zachowaj pole url na pierwszym miejscu (kosmetyka)
    const reordered = { url: updated.url };
    if (updated.caption) reordered.caption = updated.caption;
    if (updated.author) reordered.author = updated.author;
    if (updated.authorUrl) reordered.authorUrl = updated.authorUrl;
    data[idx] = reordered;

    await writeInspirations(data);
    console.log(`==> Update: ${url}`);

    const desc = updated.caption || updated.author || 'inspiration';
    await gitCommitAndPush(`Update inspiration: ${desc}`);
    console.log('  ✓ Push');

    res.json({ success: true, entry: reordered });
  } catch (err) {
    console.error('✗ Update error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ---------- DELETE /api/delete ----------
// Body: { url: "...", deleteFile?: true }
// Domyslnie usuwa tez plik z Cloudinary (deleteFile=true).
app.delete('/api/delete', async (req, res) => {
  try {
    const { url, deleteFile = true } = req.body || {};
    if (!url) return res.status(400).json({ error: 'Brak url' });

    const data = await readInspirations();
    const idx = data.findIndex((e) => e.url === url);
    if (idx === -1) return res.status(404).json({ error: 'Wpis nie znaleziony' });

    const removed = data[idx];
    data.splice(idx, 1);
    await writeInspirations(data);
    console.log(`==> Delete: ${url}`);

    let cloudinaryResult = null;
    if (deleteFile) {
      cloudinaryResult = await deleteFromCloudinary(url);
      console.log(`  ${cloudinaryResult.ok ? '✓' : '✗'} Cloudinary: ${JSON.stringify(cloudinaryResult.cloudinary)}`);
    }

    const desc = removed.caption || removed.author || 'inspiration';
    await gitCommitAndPush(`Delete inspiration: ${desc}`);
    console.log('  ✓ Push');

    res.json({ success: true, removed, cloudinary: cloudinaryResult });
  } catch (err) {
    console.error('✗ Delete error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ---------- PUT /api/reorder ----------
// Body: { urls: ["url1", "url2", ...] } - kolejnosc WYSWIETLANIA (najnowsze pierwsze).
// W JSON zapisujemy odwrocona (pierwszy w pliku = wyswietlany ostatni na stronie).
app.put('/api/reorder', async (req, res) => {
  try {
    const { urls } = req.body || {};
    if (!Array.isArray(urls)) return res.status(400).json({ error: 'urls musi byc tablica' });

    const data = await readInspirations();

    if (urls.length !== data.length) {
      return res.status(400).json({ error: `Liczba urls (${urls.length}) != liczba wpisow (${data.length})` });
    }

    // Zbuduj mape url -> entry
    const byUrl = new Map(data.map((e) => [e.url, e]));

    // Zbuduj nowa kolejnosc (urls = display order, JSON = odwrotnie)
    const reordered = [];
    for (const url of urls) {
      const entry = byUrl.get(url);
      if (!entry) return res.status(400).json({ error: `Nieznany url: ${url}` });
      reordered.unshift(entry); // unshift bo display order = reverse JSON
    }

    // Sprawdz czy cos sie zmienilo
    const sameOrder = reordered.every((e, i) => e.url === data[i].url);
    if (sameOrder) {
      return res.json({ success: true, changed: false });
    }

    await writeInspirations(reordered);
    console.log('==> Reorder');

    await gitCommitAndPush('Reorder inspirations');
    console.log('  ✓ Push');

    res.json({ success: true, changed: true });
  } catch (err) {
    console.error('✗ Reorder error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// Start
// ============================================================
app.listen(PORT, HOST, () => {
  console.log('');
  console.log('  Duuump Admin');
  console.log(`  → http://localhost:${PORT}`);
  console.log('');
  console.log('  (Ctrl+C zeby zatrzymac)');
  console.log('');
});
