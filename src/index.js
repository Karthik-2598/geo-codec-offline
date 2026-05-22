'use strict';

const { Trie }        = require('./search/trie');
const { KDTree }      = require('./spatial/kd-tree');
const { fuzzySearch } = require('./search/fuzzy');
const { haversine }   = require('./spatial/haversine');
const rawCities       = require('./data/india-cities.json');

// ─── State code → Full name map ──────────────────────────────────────────────

const STATE_NAMES = {
  AN: 'Andaman and Nicobar Islands',
  AP: 'Andhra Pradesh',
  AR: 'Arunachal Pradesh',
  AS: 'Assam',
  BR: 'Bihar',
  CG: 'Chhattisgarh',
  CH: 'Chandigarh',
  DD: 'Daman and Diu',
  DL: 'Delhi',
  DN: 'Dadra and Nagar Haveli',
  GA: 'Goa',
  GJ: 'Gujarat',
  HP: 'Himachal Pradesh',
  HR: 'Haryana',
  JH: 'Jharkhand',
  JK: 'Jammu and Kashmir',
  KA: 'Karnataka',
  KL: 'Kerala',
  LD: 'Lakshadweep',
  MH: 'Maharashtra',
  ML: 'Meghalaya',
  MN: 'Manipur',
  MP: 'Madhya Pradesh',
  MZ: 'Mizoram',
  NL: 'Nagaland',
  OR: 'Odisha',
  PB: 'Punjab',
  PY: 'Puducherry',
  RJ: 'Rajasthan',
  SK: 'Sikkim',
  TG: 'Telangana',
  TN: 'Tamil Nadu',
  TR: 'Tripura',
  UK: 'Uttarakhand',
  UP: 'Uttar Pradesh',
  WB: 'West Bengal',
};

// ─── Internal indices (lazy-initialised) ─────────────────────────────────────

let _trie   = null;
let _kdTree = null;

function _ensureIndexed() {
  if (_trie && _kdTree) return; // already initialised

  _trie   = new Trie();
  _kdTree = new KDTree();

  for (const city of rawCities) {
    _trie.insert(city.n, city);
  }
  _kdTree.build(rawCities);
}

function _expand(city) { //JSON to readable object.
  return {
    name       : city.n,
    latitude   : city.la,
    longitude  : city.lo,
    state      : STATE_NAMES[city.s] || city.s,
    stateCode  : city.s,
    population : city.p,
    country    : 'India',
    countryCode: 'IN',
  };
}

function geocode(name, opts = {}) { //matching the words, exact match, prefix match , last is fuzzy match.
  _ensureIndexed();
  if (!name || typeof name !== 'string') {
    throw new TypeError('geocode(name): name must be a non-empty string');
  }

  // 1. Try exact trie match
  const exactHits = _trie.exact(name);
  if (exactHits.length > 0) return _expand(exactHits[0]);

  // 2. Try prefix search (e.g. "Mumb" → Mumbai)
  const prefixHits = _trie.search(name, 1);
  if (prefixHits.length > 0) return _expand(prefixHits[0]);

  // 3. Optional fuzzy fallback
  if (opts.fuzzy) {
    const fuzzyHits = fuzzySearch(name, rawCities, { maxDistance: 2, limit: 1 });
    if (fuzzyHits.length > 0) return _expand(fuzzyHits[0].city);
  }

  return null;
}

function reverseGeocode(lat, lon, opts = {}) {
  _ensureIndexed();
  if (typeof lat !== 'number' || typeof lon !== 'number') {
    throw new TypeError('reverseGeocode(lat, lon): both arguments must be numbers');
  }
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    throw new RangeError('reverseGeocode: coordinates out of valid range');
  }

  const unit    = opts.unit === 'mi' ? 'mi' : 'km';
  const nearest = _kdTree.nearest(lat, lon);
  if (!nearest) return null;

  const dist = haversine(lat, lon, nearest.la, nearest.lo, unit);
  return {
    ..._expand(nearest),
    distance: { value: dist, unit },
  };
}

function search(query, opts = {}) { //top 10 prefix matches
  _ensureIndexed();
  if (!query || typeof query !== 'string') return [];

  const { limit = 10, fuzzy = false, maxDistance = 2 } = opts;

  // Prefix search via Trie
  const prefixResults = _trie.search(query, limit);

  if (prefixResults.length >= limit || !fuzzy) {
    return prefixResults.slice(0, limit).map(_expand);
  }

  // Fuzzy fallback for remaining slots
  const seen  = new Set(prefixResults.map(c => c.n));
  const fuzzy_ = fuzzySearch(query, rawCities, { maxDistance, limit: limit - prefixResults.length })
    .map(r => r.city)
    .filter(c => !seen.has(c.n));

  return [...prefixResults, ...fuzzy_].slice(0, limit).map(_expand);
}

function bbox(box, opts = {}) { //simply passes the coordinates to the KD-tree's range() and sorts the resulting cities by population
  _ensureIndexed();
  const { minLat, maxLat, minLon, maxLon } = box || {};
  if ([minLat, maxLat, minLon, maxLon].some(v => typeof v !== 'number')) {
    throw new TypeError('bbox({ minLat, maxLat, minLon, maxLon }): all values must be numbers');
  }

  const limit = opts.limit || 50;
  const results = _kdTree.range(minLat, maxLat, minLon, maxLon);

  return results
    .sort((a, b) => (b.p || 0) - (a.p || 0))
    .slice(0, limit)
    .map(_expand);
}

function listAll() {
  return rawCities.map(_expand);
}

function searchByState(query, opts = {}) {
  _ensureIndexed();
  if (!query || typeof query !== 'string') return [];

  const { limit = 50 } = opts;
  const q = query.toLowerCase().trim();

  const results = rawCities.filter(city => {
    const fullName  = (STATE_NAMES[city.s] || city.s).toLowerCase();
    const shortCode = city.s.toLowerCase();
    // match if state name contains the query OR code exactly equals it
    return fullName.includes(q) || shortCode === q;
  });

  return results
    .sort((a, b) => (b.p || 0) - (a.p || 0))
    .slice(0, limit)
    .map(_expand);
}

function stats() {
  return {
    total    : rawCities.length,
    source   : 'GeoNames / curated',
    coverage : 'India (all states and UTs)',
    version  : require('../package.json').version,
  };
}


module.exports = {
  geocode,
  reverseGeocode,
  search,
  searchByState,
  bbox,
  listAll,
  stats,
};
