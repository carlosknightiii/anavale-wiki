#!/usr/bin/env node
/**
 * Bulk image upload for the Anavale wiki.
 *
 * Batch-processes a folder of local images — resizes, compresses to WebP,
 * and uploads each one to Supabase Storage — then updates the matching
 * Supabase row's `image` column. Mirrors the settings/endpoints used by the
 * single-image upload flow already in dm.html (compressToWebP /
 * uploadImageToSupabase), just driven from a CSV instead of the DM Tools UI.
 *
 * Usage:
 *   node scripts/bulk-image-upload.mjs scan   --source <folder path>
 *   node scripts/bulk-image-upload.mjs upload --source <folder path>
 *
 * `scan` finds images in the folder and writes/updates image-mapping.csv
 * (filename, table, entry_id, status) for the DM to fill in table/entry_id,
 * plus entry-reference.txt (id/name listing per table) to help find ids.
 *
 * `upload` reads image-mapping.csv, processes every row that has a
 * table + entry_id and isn't already status=done, and writes the result
 * back into the CSV as it goes so progress survives an interruption.
 */

import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

// ── Supabase config (matches dm.html exactly) ────────────────────────────
const SB_URL = 'https://ebppsgaftzyvftemfeom.supabase.co';
const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVicHBzZ2FmdHp5dmZ0ZW1mZW9tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2MTA3ODIsImV4cCI6MjA5ODE4Njc4Mn0.C0q7wPpNjXrFPWzCzXcPuR_4n8txumOxxSvzWZkVAFg';
const STORAGE_BUCKET = 'world-images';

const ALLOWED_TABLES = [
  'regions',
  'cities',
  'creatures',
  'pois',
  'items',
  'organizations',
  'world_characters',
  'nations',
];

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.gif']);

const MAPPING_FILENAME = 'image-mapping.csv';
const REFERENCE_FILENAME = 'entry-reference.txt';
const CSV_HEADERS = ['filename', 'table', 'entry_id', 'status'];

const MAX_DIMENSION = 1200;
const MAX_KB = 200;
const MAX_BYTES = MAX_KB * 1024;

// ── CSV helpers (small hand-rolled parser/writer — quote-aware) ──────────

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const len = text.length;
  while (i < len) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += char;
      i++;
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (char === ',') {
      row.push(field);
      field = '';
      i++;
      continue;
    }
    if (char === '\r') {
      i++;
      continue;
    }
    if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i++;
      continue;
    }
    field += char;
    i++;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => !(r.length === 1 && r[0] === ''));
}

function csvField(value) {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function toCSV(headers, objRows) {
  const lines = [headers.map(csvField).join(',')];
  for (const obj of objRows) {
    lines.push(headers.map((h) => csvField(obj[h])).join(','));
  }
  return lines.join('\r\n') + '\r\n';
}

async function readMappingCSV(mappingPath) {
  let text;
  try {
    text = await readFile(mappingPath, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
  const rows = parseCSV(text);
  if (rows.length === 0) return [];
  const headers = rows[0];
  const objRows = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const obj = {};
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = r[c] ?? '';
    }
    for (const h of CSV_HEADERS) {
      if (!(h in obj)) obj[h] = '';
    }
    objRows.push(obj);
  }
  return objRows;
}

async function writeMappingCSV(mappingPath, objRows) {
  await writeFile(mappingPath, toCSV(CSV_HEADERS, objRows), 'utf8');
}

// ── Supabase REST helpers ─────────────────────────────────────────────────

function sbHeaders(extra = {}) {
  return {
    apikey: SB_ANON,
    Authorization: 'Bearer ' + SB_ANON,
    ...extra,
  };
}

async function entryExists(table, entryId) {
  const url = `${SB_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(entryId)}&select=id`;
  const res = await fetch(url, { headers: sbHeaders() });
  if (!res.ok) {
    throw new Error(`lookup failed (HTTP ${res.status})`);
  }
  const rows = await res.json();
  return Array.isArray(rows) && rows.length > 0;
}

async function fetchIdName(table) {
  const url = `${SB_URL}/rest/v1/${table}?select=id,name&order=name.asc`;
  const res = await fetch(url, { headers: sbHeaders() });
  if (!res.ok) {
    throw new Error(`fetch failed (HTTP ${res.status})`);
  }
  return res.json();
}

async function uploadToStorage(storagePath, webpBuffer) {
  const uploadUrl = `${SB_URL}/storage/v1/object/${STORAGE_BUCKET}/${storagePath}`;
  const uploadHeaders = sbHeaders({ 'x-upsert': 'true' });
  const filename = path.basename(storagePath);
  const blob = new Blob([webpBuffer], { type: 'image/webp' });

  const formData1 = new FormData();
  formData1.append('', blob, filename);
  let res = await fetch(uploadUrl, { method: 'POST', headers: uploadHeaders, body: formData1 });

  if (!res.ok) {
    const formData2 = new FormData();
    formData2.append('', blob, filename);
    res = await fetch(uploadUrl, { method: 'PUT', headers: uploadHeaders, body: formData2 });
  }

  let uploadOk = res.ok;
  if (!uploadOk) {
    // Supabase sometimes returns non-ok for duplicate/upsert uploads even
    // with x-upsert — check whether the file actually landed anyway.
    const checkRes = await fetch(
      `${SB_URL}/storage/v1/object/info/${STORAGE_BUCKET}/${storagePath}`,
      { headers: sbHeaders() }
    );
    if (checkRes.ok) uploadOk = true;
  }

  if (!uploadOk) {
    let detail = '';
    try {
      detail = await res.text();
    } catch {
      /* ignore */
    }
    throw new Error(`upload failed (HTTP ${res.status})${detail ? ': ' + detail.slice(0, 120) : ''}`);
  }

  return `${SB_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${storagePath}`;
}

async function patchImageColumn(table, entryId, publicUrl) {
  const url = `${SB_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(entryId)}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: sbHeaders({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
    body: JSON.stringify({ image: publicUrl }),
  });
  if (!res.ok) {
    let detail = '';
    try {
      detail = await res.text();
    } catch {
      /* ignore */
    }
    throw new Error(`DB update failed (HTTP ${res.status})${detail ? ': ' + detail.slice(0, 120) : ''}`);
  }
}

// ── Image compression (mirrors compressToWebP in dm.html) ────────────────

async function compressToWebP(inputBuffer, maxBytes = MAX_BYTES, maxDimension = MAX_DIMENSION) {
  let quality = 90;
  let lastBuffer = null;
  for (;;) {
    lastBuffer = await sharp(inputBuffer)
      .rotate() // respect EXIF orientation before resizing
      .resize({
        width: maxDimension,
        height: maxDimension,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality })
      .toBuffer();
    if (lastBuffer.length <= maxBytes || quality <= 10) {
      return lastBuffer;
    }
    quality -= 10;
  }
}

// ── scan ───────────────────────────────────────────────────────────────

async function cmdScan(source) {
  const st = await stat(source).catch(() => null);
  if (!st || !st.isDirectory()) {
    throw new Error(`Source folder not found or not a directory: ${source}`);
  }

  const entries = await readdir(source, { withFileTypes: true });
  const imageFiles = entries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((name) => IMAGE_EXTENSIONS.has(path.extname(name).toLowerCase()))
    .sort((a, b) => a.localeCompare(b));

  const mappingPath = path.join(source, MAPPING_FILENAME);
  const existingRows = (await readMappingCSV(mappingPath)) || [];
  const existingFilenames = new Set(existingRows.map((r) => r.filename));

  const newRows = imageFiles
    .filter((f) => !existingFilenames.has(f))
    .map((f) => ({ filename: f, table: '', entry_id: '', status: '' }));

  const allRows = existingRows.concat(newRows);
  await writeMappingCSV(mappingPath, allRows);

  console.log(`Found ${imageFiles.length} image file(s) in ${source}`);
  console.log(`Added ${newRows.length} new row(s) to ${MAPPING_FILENAME} (${existingRows.length} row(s) already present, left untouched)`);
  console.log(`Wrote ${mappingPath}`);

  // Build entry-reference.txt
  const lines = [
    'Anavale entry reference — id / name per table',
    `Generated ${new Date().toISOString()}`,
    '',
    'Fill in the "table" and "entry_id" columns of image-mapping.csv using',
    'the ids below (copy the id exactly, not the name).',
    '',
  ];

  for (const table of ALLOWED_TABLES) {
    lines.push(`=== ${table} ===`);
    try {
      const rows = await fetchIdName(table);
      if (!rows || rows.length === 0) {
        lines.push('  (no entries found)');
      } else {
        for (const row of rows) {
          const name = row.name && String(row.name).trim() ? row.name : '(no name)';
          lines.push(`  ${row.id}  —  ${name}`);
        }
      }
    } catch (err) {
      lines.push(`  (error fetching ${table}: ${err.message})`);
    }
    lines.push('');
  }

  const referencePath = path.join(source, REFERENCE_FILENAME);
  await writeFile(referencePath, lines.join('\n'), 'utf8');
  console.log(`Wrote ${referencePath}`);
}

// ── upload ─────────────────────────────────────────────────────────────

async function cmdUpload(source) {
  const mappingPath = path.join(source, MAPPING_FILENAME);
  const rows = await readMappingCSV(mappingPath);
  if (rows === null) {
    throw new Error(`No ${MAPPING_FILENAME} found in ${source} — run "scan" first.`);
  }
  if (rows.length === 0) {
    console.log(`${MAPPING_FILENAME} has no rows to process.`);
    return;
  }

  let done = 0;
  let alreadyDone = 0;
  let failed = 0;
  let incomplete = 0;
  const failures = [];

  const persist = () => writeMappingCSV(mappingPath, rows);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const label = `[${i + 1}/${rows.length}] ${row.filename}`;

    if (row.status && row.status.trim().toLowerCase() === 'done') {
      alreadyDone++;
      continue;
    }

    const table = (row.table || '').trim();
    const entryId = (row.entry_id || '').trim();

    if (!table || !entryId) {
      incomplete++;
      console.log(`${label} — skipped (table/entry_id not filled in yet)`);
      continue;
    }

    console.log(`${label} — processing (table=${table}, entry_id=${entryId})...`);

    try {
      if (!ALLOWED_TABLES.includes(table)) {
        throw new Error(`invalid table "${table}"`);
      }

      const filePath = path.join(source, row.filename);
      const fileStat = await stat(filePath).catch(() => null);
      if (!fileStat || !fileStat.isFile()) {
        throw new Error('file not found');
      }

      const exists = await entryExists(table, entryId);
      if (!exists) {
        throw new Error('entry not found');
      }

      const inputBuffer = await readFile(filePath);
      const webpBuffer = await compressToWebP(inputBuffer);

      const storagePath = `${table}/${entryId}.webp`;
      const publicUrl = await uploadToStorage(storagePath, webpBuffer);

      await patchImageColumn(table, entryId, publicUrl);

      row.status = 'done';
      done++;
      console.log(`${label} — done (${Math.round(webpBuffer.length / 1024)} KB WebP)`);
    } catch (err) {
      const reason = err && err.message ? err.message : String(err);
      row.status = `error: ${reason}`;
      failed++;
      failures.push({ filename: row.filename, reason });
      console.log(`${label} — FAILED: ${reason}`);
    }

    // Persist progress after every processed row so an interruption
    // doesn't lose already-uploaded work.
    await persist();
  }

  console.log('');
  console.log('── Summary ──────────────────────────────');
  console.log(`${done} done, ${alreadyDone} skipped (already done), ${failed} failed`);
  if (incomplete > 0) {
    console.log(`${incomplete} row(s) not yet filled in (table/entry_id blank) — left untouched`);
  }
  if (failures.length > 0) {
    console.log('');
    console.log('Failures:');
    for (const f of failures) {
      console.log(`  ${f.filename}: ${f.reason}`);
    }
  }
}

// ── CLI entry point ───────────────────────────────────────────────────────

function parseArgs(argv) {
  const [command, ...rest] = argv;
  let source = null;
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--source') {
      source = rest[i + 1];
      i++;
    } else if (rest[i].startsWith('--source=')) {
      source = rest[i].slice('--source='.length);
    }
  }
  return { command, source };
}

function printUsage() {
  console.log('Usage:');
  console.log('  node scripts/bulk-image-upload.mjs scan   --source <folder path>');
  console.log('  node scripts/bulk-image-upload.mjs upload --source <folder path>');
}

async function main() {
  const { command, source } = parseArgs(process.argv.slice(2));

  if (!command || !['scan', 'upload'].includes(command)) {
    printUsage();
    process.exit(1);
  }
  if (!source) {
    console.error('Error: --source <folder path> is required.');
    printUsage();
    process.exit(1);
  }

  const resolvedSource = path.resolve(source);

  try {
    if (command === 'scan') {
      await cmdScan(resolvedSource);
    } else {
      await cmdUpload(resolvedSource);
    }
  } catch (err) {
    console.error('Error:', err && err.message ? err.message : err);
    process.exit(1);
  }
}

main();
