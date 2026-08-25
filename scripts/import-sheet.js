#!/usr/bin/env node
/**
 * Imports the spreadsheet holding every prompt in every language and writes the
 * library the app ships, so the sheet can stay the source of truth without
 * anyone reshaping it by hand.
 *
 *   npm run import:prompts -- ~/Downloads/Imposter_Game_Words_300_7Languages.xlsx
 *
 * Reads .xlsx directly (first worksheet) as well as comma- or tab-separated
 * text. Two header layouts are understood:
 *
 *   grouped   row 1 names the language over each pair — "English (EN)" — and
 *             row 2 labels the columns under it "Word" / "Hint (imposter)"
 *   flat      a single row of "exact_en", "hint_en", "exact_bg", …
 *
 * One prompt serves both game modes: the word round says it, the drawing round
 * draws it, so there is no kind column and no second list to keep in step.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');

/** Kept in step with LOCALES in src/i18n/prompts.ts. */
const LOCALES = ['en', 'bg', 'es', 'el', 'de', 'ro', 'tr'];

function fail(message) {
  console.error(`import-sheet: ${message}`);
  process.exit(1);
}

// ------------------------------------------------------------------ xlsx

/**
 * An .xlsx is a zip of XML. Reading the handful of bytes that matter is a lot
 * less weight than a dependency — and this only has to understand the one file
 * shape the sheet is exported in.
 */
function unzip(buffer) {
  const files = new Map();
  // Walk back from the end-of-central-directory record to find the index.
  let eocd = buffer.length - 22;
  while (eocd >= 0 && buffer.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) fail('not a readable .xlsx (no zip index found)');

  let entry = buffer.readUInt32LE(eocd + 16);
  const count = buffer.readUInt16LE(eocd + 10);

  for (let i = 0; i < count; i++) {
    const method = buffer.readUInt16LE(entry + 10);
    const size = buffer.readUInt32LE(entry + 20);
    const nameLength = buffer.readUInt16LE(entry + 28);
    const name = buffer.toString('utf8', entry + 46, entry + 46 + nameLength);
    const local = buffer.readUInt32LE(entry + 42);

    // The local header repeats the name and extra fields; payload follows them.
    const start = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
    const raw = buffer.subarray(start, start + size);
    files.set(name, method === 0 ? raw : zlib.inflateRawSync(raw));

    entry += 46 + nameLength + buffer.readUInt16LE(entry + 30) + buffer.readUInt16LE(entry + 32);
  }
  return files;
}

const unescapeXml = (s) =>
  s
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
    .replace(/&amp;/g, '&');

/** "C" -> 2. Cell refs carry their column, which is how blanks stay aligned. */
function columnOf(ref) {
  let n = 0;
  for (const c of ref.match(/^[A-Z]+/)[0]) n = n * 26 + c.charCodeAt(0) - 64;
  return n - 1;
}

function readXlsx(buffer) {
  const files = unzip(buffer);

  // Strings are either pooled in sharedStrings.xml or written inline per cell.
  const pool = [];
  const shared = files.get('xl/sharedStrings.xml');
  if (shared) {
    for (const si of shared.toString('utf8').match(/<si>[\s\S]*?<\/si>/g) ?? []) {
      pool.push((si.match(/<t[^>]*>[\s\S]*?<\/t>/g) ?? []).map(unescapeXml).join(''));
    }
  }

  const sheetName = [...files.keys()].filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort()[0];
  if (!sheetName) fail('workbook has no worksheets');

  const rows = [];
  for (const xml of files.get(sheetName).toString('utf8').match(/<row[\s\S]*?<\/row>/g) ?? []) {
    const cells = [];
    for (const c of xml.match(/<c [^>]*?(?:\/>|>[\s\S]*?<\/c>)/g) ?? []) {
      const index = columnOf(c.match(/ r="([A-Z]+\d+)"/)[1]);
      const inline = c.match(/<is>[\s\S]*?<\/is>/);
      const value = c.match(/<v>([\s\S]*?)<\/v>/);
      cells[index] = inline
        ? (inline[0].match(/<t[^>]*>[\s\S]*?<\/t>/g) ?? []).map(unescapeXml).join('')
        : !value
          ? ''
          : / t="s"/.test(c)
            ? (pool[+value[1]] ?? '')
            : unescapeXml(value[1]);
    }
    rows.push([...cells].map((v) => v ?? ''));
  }
  return rows;
}

// ------------------------------------------------------------------ delimited text

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
  return rows;
}

// ------------------------------------------------------------------ header

/**
 * Returns { exact, hint } column indexes per locale, plus the first data row.
 * Two layouts are supported because the sheet groups its columns by language
 * across two header rows, while a plain CSV export names each column outright.
 */
function readHeader(rows) {
  const flat = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  if (flat.includes('exact_en')) {
    const columns = {};
    for (const locale of LOCALES) {
      columns[locale] = { exact: flat.indexOf(`exact_${locale}`), hint: flat.indexOf(`hint_${locale}`) };
    }
    return { columns, firstDataRow: 1 };
  }

  // Grouped: the language sits in row 1 over a pair of columns, and only the
  // leftmost of the pair carries it, so it is carried forward across the pair.
  const columns = {};
  let locale = null;
  for (let i = 0; i < Math.max(rows[0].length, rows[1]?.length ?? 0); i++) {
    const code = (rows[0][i] ?? '').match(/\(([A-Za-z]{2})\)\s*$/);
    if (code) locale = code[1].toLowerCase();
    if (!locale || !LOCALES.includes(locale)) continue;

    const label = (rows[1]?.[i] ?? '').trim().toLowerCase();
    if (!label) continue;
    const field = label.startsWith('word') || label.startsWith('exact') ? 'exact' : label.includes('hint') ? 'hint' : null;
    if (field) (columns[locale] ??= {})[field] = i;
  }
  return { columns, firstDataRow: 2 };
}

// ------------------------------------------------------------------ run

const file = process.argv[2];
if (!file) fail('usage: npm run import:prompts -- <sheet.xlsx|sheet.csv|sheet.tsv>');
if (!fs.existsSync(file)) fail(`no such file: ${file}`);

let rows;
if (file.toLowerCase().endsWith('.xlsx')) {
  rows = readXlsx(fs.readFileSync(file));
} else {
  const raw = fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
  rows = parseDelimited(raw, raw.slice(0, raw.indexOf('\n')).includes('\t') ? '\t' : ',');
}
rows = rows.filter((r) => r.some((cell) => (cell ?? '').trim() !== ''));
if (rows.length < 3) fail('sheet has no data rows');

const { columns, firstDataRow } = readHeader(rows);
const incomplete = LOCALES.filter((l) => !columns[l] || columns[l].exact == null || columns[l].hint == null);
if (incomplete.length) fail(`sheet has no word/hint pair for: ${incomplete.join(', ')}`);

const prompts = [];
const problems = [];

rows.slice(firstDataRow).forEach((row, index) => {
  const line = index + firstDataRow + 1;
  const at = (i) => (row[i] ?? '').trim();
  if (!at(columns.en.exact)) return; // trailing blank rows in an export are fine

  const exact = {};
  const hint = {};
  for (const locale of LOCALES) {
    const e = at(columns[locale].exact);
    const h = at(columns[locale].hint);
    if (!e) problems.push(`row ${line} (${at(columns.en.exact)}): ${locale} word is empty`);
    if (!h) problems.push(`row ${line} (${at(columns.en.exact)}): ${locale} hint is empty`);
    exact[locale] = e;
    hint[locale] = h;
  }
  prompts.push({ exact, hint });
});

if (problems.length) {
  console.error(`import-sheet: ${problems.length} problem(s) — nothing written:`);
  for (const p of problems.slice(0, 40)) console.error(`  ${p}`);
  if (problems.length > 40) console.error(`  …and ${problems.length - 40} more`);
  process.exit(1);
}

const out = path.join(ROOT, 'src', 'i18n', 'prompts.json');
fs.writeFileSync(out, `${JSON.stringify(prompts, null, 2)}\n`);
console.log(`import-sheet: wrote ${prompts.length} prompts to ${path.relative(ROOT, out)}`);
console.log('import-sheet: now run `npm test` to check hints against their answers.');
