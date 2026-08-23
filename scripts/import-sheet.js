#!/usr/bin/env node
/**
 * Imports one exported sheet holding every prompt in every language and writes
 * the two libraries the app ships, so a spreadsheet can stay the source of
 * truth without anyone reshaping it by hand.
 *
 *   node scripts/import-sheet.js prompts.csv
 *
 * Accepts comma- or tab-separated export with a header row. Required columns:
 *
 *   kind      "word" or "drawing"
 *   category  word rows only — food, places, animals, …
 *   exact_en  hint_en  exact_bg  hint_bg  …  one pair per locale
 *
 * Column order does not matter; the header names are what is read. Rows with
 * an empty `exact_en` are skipped, so trailing blank rows in an export are fine.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

/** Kept in step with LOCALES in src/i18n/prompts.ts. */
const LOCALES = ['en', 'bg', 'es', 'el', 'de', 'ro', 'tr'];

function fail(message) {
  console.error(`import-sheet: ${message}`);
  process.exit(1);
}

/** Minimal RFC-4180 reader: handles quoted fields containing the delimiter or newlines. */
function parseDelimited(text, delimiter) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { quoted = false; }
      } else field += c;
      continue;
    }
    if (c === '"') { quoted = true; continue; }
    if (c === delimiter) { row.push(field); field = ''; continue; }
    if (c === '\r') continue;
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    field += c;
  }
  row.push(field);
  rows.push(row);
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

const file = process.argv[2];
if (!file) fail('usage: node scripts/import-sheet.js <sheet.csv|sheet.tsv>');
if (!fs.existsSync(file)) fail(`no such file: ${file}`);

const raw = fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
const delimiter = raw.slice(0, raw.indexOf('\n')).includes('\t') ? '\t' : ',';
const rows = parseDelimited(raw, delimiter);
if (rows.length < 2) fail('sheet has no data rows');

const header = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
const col = (name) => header.indexOf(name);

const missing = ['kind', ...LOCALES.flatMap((l) => [`exact_${l}`, `hint_${l}`])].filter((n) => col(n) === -1);
if (missing.length) fail(`sheet is missing column(s): ${missing.join(', ')}`);

const cell = (row, name) => (row[col(name)] ?? '').trim();
const libraries = { words: [], drawings: [] };
const problems = [];

rows.slice(1).forEach((row, index) => {
  const line = index + 2;
  if (!cell(row, 'exact_en')) return;

  const kind = cell(row, 'kind').toLowerCase();
  const target = kind.startsWith('word') ? 'words' : kind.startsWith('draw') ? 'drawings' : null;
  if (!target) { problems.push(`line ${line}: kind is "${kind}", expected "word" or "drawing"`); return; }

  const exact = {};
  const hint = {};
  for (const locale of LOCALES) {
    const e = cell(row, `exact_${locale}`);
    const h = cell(row, `hint_${locale}`);
    if (!e) problems.push(`line ${line} (${cell(row, 'exact_en')}): exact_${locale} is empty`);
    if (!h) problems.push(`line ${line} (${cell(row, 'exact_en')}): hint_${locale} is empty`);
    exact[locale] = e;
    hint[locale] = h;
  }

  if (target === 'words') {
    const category = cell(row, 'category').toLowerCase();
    if (!category) problems.push(`line ${line} (${exact.en}): word rows need a category`);
    libraries.words.push({ category, exact, hint });
  } else {
    libraries.drawings.push({ exact, hint });
  }
});

if (problems.length) {
  console.error(`import-sheet: ${problems.length} problem(s) — nothing written:`);
  for (const p of problems.slice(0, 40)) console.error(`  ${p}`);
  if (problems.length > 40) console.error(`  …and ${problems.length - 40} more`);
  process.exit(1);
}

for (const [kind, entries] of Object.entries(libraries)) {
  const out = path.join(ROOT, 'src', 'i18n', `${kind}.json`);
  fs.writeFileSync(out, `${JSON.stringify(entries, null, 2)}\n`);
  console.log(`import-sheet: wrote ${entries.length} ${kind} to ${path.relative(ROOT, out)}`);
}
console.log('import-sheet: now run `npm test` to check hints against their answers.');
