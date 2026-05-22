#!/usr/bin/env node
'use strict';


const { geocode, reverseGeocode, search, searchByState, bbox, stats } = require('./index');

const args = process.argv.slice(2); // drop "node" and script path

function flag(name) {
  return args.includes(`--${name}`);
}
function arg(name) {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : null;
}

// ─── Help ────────────────────────────────────────────────────────────────────

if (flag('help') || flag('h') || args.length === 0) {
  console.log(`
  geo-codec-offline — Offline geocoding for India (no internet needed)

  Usage:
    npx geo-codec-offline "City Name"                  Forward geocode
    npx geo-codec-offline --reverse <lat> <lon>        Reverse geocode
    npx geo-codec-offline --search  <query>            Prefix / fuzzy search
    npx geo-codec-offline --state   <name|code>        All cities in a state
    npx geo-codec-offline --bbox <minLat> <maxLat> <minLon> <maxLon>
    npx geo-codec-offline --stats                      Dataset info
    npx geo-codec-offline --help                       Show this message

  Options:
    --fuzzy           Enable fuzzy (typo-tolerant) matching
    --limit <n>       Limit number of results (default: 10)
    --unit km|mi      Distance unit for reverse geocode (default: km)
    --json            Output raw JSON (pipe-friendly)

  Examples:
    npx geo-codec-offline "Bangalore"
    npx geo-codec-offline --reverse 12.97 77.60
    npx geo-codec-offline --search "Hydera" --limit 3
    npx geo-codec-offline --state "Maharashtra"
    npx geo-codec-offline --state MH
    npx geo-codec-offline --bbox 18.0 22.0 72.0 80.0
    npx geo-codec-offline "bangalor" --fuzzy
  `);
  process.exit(0);
}

// ─── Output helpers ──────────────────────────────────────────────────────────

const asJson = flag('json');

function print(data) {
  if (asJson) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    prettyPrint(data);
  }
}

function prettyPrint(data) {
  if (Array.isArray(data)) {
    if (data.length === 0) {
      console.log('  No results found.');
      return;
    }
    data.forEach((city, i) => {
      console.log(`\n  ${i + 1}. ${city.name} (${city.stateCode})`);
      console.log(`     State     : ${city.state}`);
      console.log(`     Lat / Lon : ${city.latitude}, ${city.longitude}`);
      console.log(`     Population: ${(city.population || 0).toLocaleString('en-IN')}`);
      if (city.distance) {
        console.log(`     Distance  : ${city.distance.value} ${city.distance.unit}`);
      }
    });
    console.log();
  } else if (data && typeof data === 'object') {
    console.log();
    console.log(`  📍 ${data.name}  [${data.stateCode}]`);
    console.log(`  ─────────────────────────────────`);
    console.log(`  State      : ${data.state}`);
    console.log(`  Country    : ${data.country}`);
    console.log(`  Latitude   : ${data.latitude}`);
    console.log(`  Longitude  : ${data.longitude}`);
    console.log(`  Population : ${(data.population || 0).toLocaleString('en-IN')}`);
    if (data.distance) {
      console.log(`  Distance   : ${data.distance.value} ${data.distance.unit}`);
    }
    console.log();
  } else {
    console.log(data);
  }
}

// ─── Command dispatch ─────────────────────────────────────────────────────────

try {
  // -- Stats
  if (flag('stats')) {
    const s = stats();
    if (asJson) { console.log(JSON.stringify(s, null, 2)); }
    else {
      console.log('\n  📦 goe-codec-offline — Dataset Info');
      console.log('  ─────────────────────────────────');
      for (const [k, v] of Object.entries(s)) {
        console.log(`  ${k.padEnd(12)}: ${v}`);
      }
      console.log();
    }
    process.exit(0);
  }

  // -- Reverse geocode: --reverse <lat> <lon>
  if (flag('reverse')) {
    const idx = args.indexOf('--reverse');
    const lat = parseFloat(args[idx + 1]);
    const lon = parseFloat(args[idx + 2]);
    if (isNaN(lat) || isNaN(lon)) {
      console.error('  Error: --reverse requires two numeric arguments: <lat> <lon>');
      process.exit(1);
    }
    const unit   = arg('unit') || 'km';
    const result = reverseGeocode(lat, lon, { unit });
    if (!result) { console.log('  No result found.'); process.exit(0); }
    print(result);
    process.exit(0);
  }

  // -- Bounding box: --bbox <minLat> <maxLat> <minLon> <maxLon>
  if (flag('bbox')) {
    const idx    = args.indexOf('--bbox');
    const minLat = parseFloat(args[idx + 1]);
    const maxLat = parseFloat(args[idx + 2]);
    const minLon = parseFloat(args[idx + 3]);
    const maxLon = parseFloat(args[idx + 4]);
    if ([minLat, maxLat, minLon, maxLon].some(isNaN)) {
      console.error('  Error: --bbox requires four numbers: <minLat> <maxLat> <minLon> <maxLon>');
      process.exit(1);
    }
    const limit   = parseInt(arg('limit') || '20', 10);
    const results = bbox({ minLat, maxLat, minLon, maxLon }, { limit });
    print(results);
    process.exit(0);
  }

  // -- Search: --search <query>
  if (flag('search')) {
    const query  = arg('search');
    const limit  = parseInt(arg('limit') || '10', 10);
    const fuzzy_ = flag('fuzzy');
    if (!query) {
      console.error('  Error: --search requires a query string');
      process.exit(1);
    }
    const results = search(query, { limit, fuzzy: fuzzy_ });
    print(results);
    process.exit(0);
  }

  // -- State search: --state <name or 2-letter code>
  if (flag('state')) {
    const query = arg('state');
    if (!query) {
      console.error('  Error: --state requires a state name or code (e.g. Maharashtra or MH)');
      process.exit(1);
    }
    const limit   = parseInt(arg('limit') || '50', 10);
    const results = searchByState(query, { limit });
    if (!results.length) {
      console.log(`\n  No cities found for state "${query}".\n`);
    } else {
      const stateName = results[0].state;
      if (!asJson) console.log(`\n  🗺  ${stateName} — ${results.length} cities found\n`);
      print(results);
    }
    process.exit(0);
  }

  // -- Forward geocode: first positional argument
  const name   = args.find(a => !a.startsWith('--'));
  const fuzzy_ = flag('fuzzy');
  if (name) {
    const result = geocode(name, { fuzzy: fuzzy_ });
    if (!result) {
      console.log(`\n  No city found for "${name}".`);
      if (!fuzzy_) console.log('  Tip: try --fuzzy for typo-tolerant matching.\n');
      process.exit(0);
    }
    print(result);
    process.exit(0);
  }

  console.error('  Unknown command. Run --help for usage.');
  process.exit(1);

} catch (err) {
  console.error(`  Error: ${err.message}`);
  process.exit(1);
}
