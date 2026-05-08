// ============================================================
// Duuump Admin - lokalny serwer do dodawania inspiracji
// ============================================================
//
// Co robi:
//   1. Serwuje admin.html pod http://localhost:4000
//   2. Endpoint POST /api/add - przyjmuje plik + metadane
//   3. Wgrywa obrazek na Cloudinary (signed upload)
//   4. Aktualizuje inspirations.json
//   5. Robi git add + commit + push
//
// Bezpieczenstwo: serwer nasluchuje tylko na 127.0.0.1 (localhost),
// czyli jest dostepny tylko z Twojego komputera. Nikt z zewnatrz
// nie ma do niego dostepu.
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
const HOST = '127.0.0.1'; // tylko localhost - bezpieczenstwo!

// Strona glowna -> admin.html
app.get('/', (req, res) => {
  res.redirect('/admin.html');
});

// Statyczne pliki admin (HTML, CSS, JS)
app.use(express.static(__dirname));

// Multer - upload plikow do tmp
const upload = multer({
  dest: '/tmp/duuump-uploads/',
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
});

// ---------- Pomocnicza: upload na Cloudinary ----------
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
  if (data.error) {
    throw new Error(`Cloudinary: ${data.error.message}`);
  }
  return data.secure_url;
}

// ---------- Pomocnicza: aktualizacja JSON ----------
async function addToInspirations(entry) {
  const jsonPath = join(PROJECT_ROOT, 'inspirations.json');
  const content = await readFile(jsonPath, 'utf-8');
  const data = JSON.parse(content);
  data.push(entry);
  await writeFile(jsonPath, JSON.stringify(data, null, 2) + '\n');
}

// ---------- Pomocnicza: git commit + push ----------
async function gitCommitAndPush(message) {
  const cwd = PROJECT_ROOT;
  await execAsync('git add inspirations.json', { cwd });
  await execAsync(`git commit -m ${JSON.stringify(message)}`, { cwd });
  await execAsync('git push', { cwd });
}

// ---------- Endpoint: POST /api/add ----------
app.post('/api/add', upload.single('image'), async (req, res) => {
  let tmpPath = null;
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Brak pliku' });
    }
    tmpPath = req.file.path;

    const { caption = '', author = '', authorUrl = '' } = req.body;

    console.log(`==> Upload: ${req.file.originalname}`);

    // 1. Cloudinary
    const url = await uploadToCloudinary(tmpPath);
    console.log(`  ✓ Cloudinary: ${url}`);

    // 2. JSON
    const entry = { url };
    if (caption) entry.caption = caption;
    if (author) entry.author = author;
    if (authorUrl) entry.authorUrl = authorUrl;
    await addToInspirations(entry);
    console.log('  ✓ inspirations.json zaktualizowany');

    // 3. Git
    const commitDesc = caption || req.file.originalname;
    const fullMsg = author
      ? `Add inspiration: ${commitDesc} - ${author}`
      : `Add inspiration: ${commitDesc}`;
    await gitCommitAndPush(fullMsg);
    console.log('  ✓ Wyslane na GitHub');

    res.json({
      success: true,
      url,
      caption,
      author,
      message: 'Strona zaktualizuje sie za ~1 minute',
    });
  } catch (error) {
    console.error('✗ Blad:', error.message);
    res.status(500).json({ error: error.message });
  } finally {
    if (tmpPath && fs.existsSync(tmpPath)) {
      unlink(tmpPath).catch(() => {});
    }
  }
});

// ---------- Start ----------
app.listen(PORT, HOST, () => {
  console.log('');
  console.log('  Duuump Admin');
  console.log(`  → http://localhost:${PORT}`);
  console.log('');
  console.log('  (Ctrl+C zeby zatrzymac)');
  console.log('');
});
