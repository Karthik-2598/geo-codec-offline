# goe-codec-offline

**Zero-dependency, 100% offline geocoding library for India.**  
Forward geocode · Reverse geocode · Fuzzy search · Bounding-box query — no internet required.

[![npm version](https://img.shields.io/npm/v/goe-codec-offline)](https://www.npmjs.com/package/goe-codec-offline)
[![license](https://img.shields.io/npm/l/goe-codec-offline)](./LICENSE)
[![node](https://img.shields.io/node/v/goe-codec-offline)](https://nodejs.org)

---

## Installation

```bash
npm install geo-codec-offline
```

---

## Quick Start

```js
// CommonJS
const { geocode, reverseGeocode, search, bbox } = require('geo-codec-offline');

// ESM
import { geocode, reverseGeocode, search, bbox } from 'geo-codec-offline';
```

---

## API Reference

### `geocode(name, [opts])` → `object | null`

Convert a city name to coordinates.

```js
geocode('Mumbai');
// { name: 'Mumbai', latitude: 18.9667, longitude: 72.8333,
//   state: 'Maharashtra', stateCode: 'MH', population: 12691836,
//   country: 'India', countryCode: 'IN' }

geocode('Bangalor', { fuzzy: true }); // typo — still finds Bangalore
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `fuzzy` | boolean | `false` | Enable typo-tolerant (Levenshtein) fallback |

---

### `reverseGeocode(lat, lon, [opts])` → `object`

Find the nearest city to a coordinate pair.

```js
reverseGeocode(19.076, 72.877);
// { name: 'Mumbai', ..., distance: { value: 10.23, unit: 'km' } }

reverseGeocode(28.65, 77.23, { unit: 'mi' });
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `unit` | `'km'` \| `'mi'` | `'km'` | Distance unit |

---

### `search(query, [opts])` → `object[]`

Prefix search with optional fuzzy fallback. Returns cities sorted by population.

```js
search('Hyder');               // → [Hyderabad, ...]
search('mmbu', { fuzzy: true }); // typo → [Mumbai, ...]
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `limit` | number | `10` | Max results |
| `fuzzy` | boolean | `false` | Enable fuzzy fallback |
| `maxDistance` | number | `2` | Max Levenshtein edit distance |

---

### `bbox({ minLat, maxLat, minLon, maxLon }, [opts])` → `object[]`

Find all cities within a geographic bounding box.

```js
// Cities in Maharashtra
bbox({ minLat: 15.6, maxLat: 22.1, minLon: 72.6, maxLon: 80.9 });
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `limit` | number | `50` | Max results |

---

### `listAll()` → `object[]`

Return the complete bundled dataset.

```js
const all = listAll(); // ~180+ Indian cities
```

---

### `stats()` → `object`

```js
stats();
// { total: 182, source: 'GeoNames / curated', coverage: 'India (all states and UTs)', version: '1.0.0' }
```

---

## CLI Usage

```bash
# Forward geocode
npx geo-codec-offline "New Delhi"

# Reverse geocode
npx geo-codec-offline --reverse 12.97 77.60

# Prefix search
npx geo-codec-offline --search "Hyder" --limit 5

# Fuzzy search
npx geo-codec-offline "bangalor" --fuzzy

# Bounding box
npx geo-codec-offline --bbox 15.6 22.1 72.6 80.9

# Dataset info
npx geo-codec-offline --stats

# JSON output (pipe-friendly)
npx geo-codec-offline "Chennai" --json
```

---

## How It Works

| Feature | Data Structure | Complexity |
|---------|---------------|------------|
| Forward geocode | **Prefix Trie** | O(k) where k = query length |
| Reverse geocode | **KD-Tree** nearest-neighbour | O(log n) |
| Bounding box | **KD-Tree** range query | O(k + log n) |
| Fuzzy search | **Levenshtein** edit distance | O(n·m) with early exit |
| Distance calc | **Haversine** formula | O(1) |

---

## Expand to Full GeoNames Dataset

The bundled dataset contains ~180 major Indian cities. To use the **complete GeoNames India dataset** (~50,000 populated places):

```bash
node scripts/build-data.js
```

This downloads `IN.zip` from [GeoNames.org](https://www.geonames.org) (free, CC-BY 4.0), parses it, and overwrites `src/data/india-cities.json`.

---

## Demo

Open `demo/index.html` via a local server:

```bash
npx serve .
# then visit http://localhost:3000/demo/index.html
```

Features: live autocomplete, map visualization, click-to-reverse-geocode.

---

## Module Format

This package ships as **Dual CJS + ESM**:

- `require('goe-codec-offline')` — Node.js CommonJS
- `import ... from 'goe-codec-offline'` — ES Modules (Node ≥16, bundlers, browsers)

---

## License

MIT — see [LICENSE](./LICENSE)

Data: [GeoNames](https://www.geonames.org) (CC BY 4.0)
