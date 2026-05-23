# geo-codec-offline

> Offline geocoding for India. No internet. No API key. No limits.

Look up Indian cities by name, find the nearest city to any coordinates, search by state, and more — all from your local machine.

---

## Install

```bash
npm install geo-codec-offline
```

---

## Usage

### In your Node.js project

```js
const { geocode, reverseGeocode, search, searchByState, bbox, stats } = require('geo-codec-offline');
```

---

### 1. Forward Geocode — City name → Coordinates

```js
const city = geocode('Mumbai');
console.log(city);
// {
//   name: 'Mumbai',
//   latitude: 18.9667,
//   longitude: 72.8333,
//   state: 'Maharashtra',
//   stateCode: 'MH',
//   population: 12691836,
//   country: 'India'
// }
```

Works with partial names and typos too:

```js
geocode('Banga');              // → Bangalore (prefix match)
geocode('Mumbi', { fuzzy: true }); // → Mumbai (typo-tolerant)
```

---

### 2. Reverse Geocode — Coordinates → Nearest City

```js
const result = reverseGeocode(19.07, 72.87);
console.log(result.name);            // → 'Mumbai'
console.log(result.distance.value);  // → 12.3
console.log(result.distance.unit);   // → 'km'
```

Get distance in miles:

```js
reverseGeocode(19.07, 72.87, { unit: 'mi' });
```

---

### 3. Search — Autocomplete / Prefix Search

```js
const results = search('Hyder', { limit: 5 });
// → [{ name: 'Hyderabad', ... }, ...]
```

With fuzzy matching (finds results even with typos):

```js
search('Chenai', { fuzzy: true });
// → [{ name: 'Chennai', ... }]
```

---

### 4. Search by State — All Cities in a State

```js
searchByState('Kerala');   // full state name
searchByState('KL');       // 2-letter state code
searchByState('Pradesh');  // partial match — finds all Pradesh states
```

Returns cities sorted by population (largest first).

---

### 5. Bounding Box — Cities Within a Region

```js
const cities = bbox({
  minLat: 15.6,
  maxLat: 22.1,
  minLon: 72.6,
  maxLon: 80.9
});
// → all cities inside Maharashtra's rough boundary
```

---

### 6. Stats — Dataset Info

```js
const info = stats();
// { total: 177, source: 'GeoNames / curated', coverage: 'India', version: '1.0.0' }
```

---

## CLI — Use Without Writing Code

```bash
# Forward geocode
npx geo-codec-offline "Delhi"

# Reverse geocode
npx geo-codec-offline --reverse 28.65 77.23

# Prefix search
npx geo-codec-offline --search "Nag" --limit 5

# All cities in a state
npx geo-codec-offline --state "Rajasthan"
npx geo-codec-offline --state RJ

# Bounding box
npx geo-codec-offline --bbox 15.6 22.1 72.6 80.9

# Dataset info
npx geo-codec-offline --stats

# Typo-tolerant search
npx geo-codec-offline "Bangalor" --fuzzy

# JSON output (pipe-friendly)
npx geo-codec-offline "Pune" --json
```

---

## ES Module Support

```js
import { geocode, searchByState } from 'geo-codec-offline';
```

---

## Why This Package?

Most geocoding tools need an internet connection and an API key with usage limits.  
This package bundles the data locally — **it works offline, always, for free**.

- ✅ Zero dependencies
- ✅ Works in Node.js 16+
- ✅ Supports both `require()` and `import`
- ✅ 177 Indian cities across all states and UTs
- ✅ Fuzzy (typo-tolerant) search built in
- ✅ KD-Tree for fast nearest-city lookup

---

## License

MIT © Karthik Karra
