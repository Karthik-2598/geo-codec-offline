#!/usr/bin/env node
'use strict';

//this is script that takes the data from geonames website and filters the main data here the condition is cities greater than population of 5000

const https   = require('https');
const fs      = require('fs');
const path    = require('path');
const zlib    = require('zlib');
const { pipeline } = require('stream');


// GeoNames India admin1 codes map (partial — covers all states)
const GEONAMES_STATE_MAP = {
  '01': 'JK', '02': 'HP', '03': 'PB', '04': 'CH', '05': 'UK',
  '06': 'HR', '07': 'DL', '08': 'RJ', '09': 'UP', '10': 'BR',
  '11': 'SK', '12': 'AR', '13': 'NL', '14': 'MN', '15': 'MZ',
  '16': 'TR', '17': 'ML', '18': 'AS', '19': 'WB', '20': 'JH',
  '21': 'OR', '22': 'CG', '23': 'MP', '24': 'GJ', '25': 'DD',
  '26': 'DN', '27': 'MH', '28': 'AP', '29': 'KA', '30': 'GA',
  '31': 'LD', '32': 'KL', '33': 'TN', '34': 'PY', '35': 'AN',
  '36': 'TG',
};

const ZIP_URL  = 'https://download.geonames.org/export/dump/IN.zip';
const OUT_FILE = path.join(__dirname, '..', 'src', 'data', 'india-cities.json'); //when the package is downloaded, this file path will be created.
const MIN_POP  = 5000; //minimum population,

console.log('📥  Downloading GeoNames India dataset...');
console.log(`    Source: ${ZIP_URL}\n`);

// ─── Download the zip file in chunks

function download(url) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return download(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} from ${url}`));
      }
      res.on('data', chunk => chunks.push(chunk));
      res.on('end',  ()    => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function extractFirstFile(zipBuffer) {
  // ZIP local file header signature: PK\x03\x04
  const SIG = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
  let offset = zipBuffer.indexOf(SIG);
  if (offset === -1) throw new Error('Not a valid ZIP file');

  // Parse local file header
  const compressedSize   = zipBuffer.readUInt32LE(offset + 18);
  const fileNameLen      = zipBuffer.readUInt16LE(offset + 26);
  const extraLen         = zipBuffer.readUInt16LE(offset + 28);
  const dataOffset       = offset + 30 + fileNameLen + extraLen;

  const method = zipBuffer.readUInt16LE(offset + 8);
  const compressedData = zipBuffer.slice(dataOffset, dataOffset + compressedSize);

  if (method === 0) {
    // Stored (no compression)
    return compressedData;
  } else if (method === 8) {
    // Deflate
    return zlib.inflateRawSync(compressedData);
  } else {
    throw new Error(`Unsupported ZIP compression method: ${method}`);
  }
}

// ─── Parse the unzip file to extract data.

function parseTSV(buffer) {
  const lines = buffer.toString('utf8').split('\n');
  const cities = [];
  let skipped = 0;

  for (const line of lines) {
    if (!line.trim() || line.startsWith('#')) continue;

    const cols = line.split('\t');
    if (cols.length < 15) continue;

    const featureClass = cols[6];
    const population   = parseInt(cols[14], 10) || 0;

    // Only keep populated places with sufficient population
    if (featureClass !== 'P') continue;
    if (population < MIN_POP) { skipped++; continue; }

    const stateCode = GEONAMES_STATE_MAP[cols[10]] || cols[10];

    cities.push({
      n : cols[2] || cols[1],       // asciiname preferred; fall back to name
      la: parseFloat(cols[4]),
      lo: parseFloat(cols[5]),
      s : stateCode,
      p : population,
    });
  }

  console.log(`    Parsed ${cities.length} cities  (skipped ${skipped} below pop ${MIN_POP.toLocaleString()})`);
  return cities;
}

// ─── Main ────────────────────────────────────────────────────────────────────

(async () => {
  try {
    const zipBuffer  = await download(ZIP_URL);
    console.log(`✅  Downloaded ${(zipBuffer.length / 1024).toFixed(1)} KB`);

    const rawBuffer  = extractFirstFile(zipBuffer);
    console.log(`📂  Extracted IN.txt (${(rawBuffer.length / 1024 / 1024).toFixed(1)} MB)`);

    const cities = parseTSV(rawBuffer);

    // Sort by population descending so the most prominent cities come first
    cities.sort((a, b) => b.p - a.p);

    // Write output
    fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
    fs.writeFileSync(OUT_FILE, JSON.stringify(cities, null, 2), 'utf8');

    const sizeMB = (fs.statSync(OUT_FILE).size / 1024 / 1024).toFixed(2);
    console.log(`\n✅  Written: ${OUT_FILE}`);
    console.log(`    Cities: ${cities.length.toLocaleString()}`);
    console.log(`    File size: ${sizeMB} MB`);
    console.log('\n🎉  Data build complete! The full dataset is now in src/data/india-cities.json\n');
  } catch (err) {
    console.error('\n❌  Build failed:', err.message);
    process.exit(1);
  }
})();
