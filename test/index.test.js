'use strict';
/**
 * test/index.test.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Unit tests using Node.js's built-in test runner (no external dependencies).
 * Run with:  node --test test/index.test.js
 *
 * Tests cover:
 *   1. Forward geocode — exact name
 *   2. Forward geocode — prefix name
 *   3. Forward geocode — fuzzy (typo)
 *   4. Forward geocode — not found
 *   5. Reverse geocode — known coordinates
 *   6. Reverse geocode — distance is a number
 *   7. Search — prefix results
 *   8. Search — fuzzy mode
 *   9. Bounding box — returns cities in region
 *  10. stats() — returns metadata object
 *  11. listAll() — returns full dataset
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { geocode, reverseGeocode, search, searchByState, bbox, listAll, stats } = require('../src/index');

// ─── Forward Geocode ─────────────────────────────────────────────────────────

describe('geocode()', () => {

  test('exact match: Mumbai', () => {
    const result = geocode('Mumbai');
    assert.ok(result, 'should return a result');
    assert.equal(result.name, 'Mumbai');
    assert.equal(result.stateCode, 'MH');
    assert.equal(result.country, 'India');
    assert.ok(Math.abs(result.latitude  - 18.9667) < 0.1, 'latitude close to 18.96');
    assert.ok(Math.abs(result.longitude - 72.8333) < 0.1, 'longitude close to 72.83');
  });

  test('case-insensitive: DELHI', () => {
    const result = geocode('DELHI');
    assert.ok(result, 'should find Delhi regardless of case');
    assert.equal(result.stateCode, 'DL');
  });

  test('prefix match: Banga → Bangalore', () => {
    const result = geocode('Banga');
    assert.ok(result, 'prefix should match');
    assert.match(result.name, /Bangalore/i);
  });

  test('fuzzy match: Mumbi → Mumbai', () => {
    const result = geocode('Mumbi', { fuzzy: true });
    assert.ok(result, 'fuzzy should return a result');
    assert.equal(result.name, 'Mumbai');
  });

  test('fuzzy match: Bangalor → Bangalore', () => {
    const result = geocode('Bangalor', { fuzzy: true });
    assert.ok(result, 'fuzzy should return a result');
    assert.match(result.name, /Bangalore/i);
  });

  test('not found → null', () => {
    const result = geocode('Xyzpqrabc');
    assert.equal(result, null);
  });

  test('throws on non-string input', () => {
    assert.throws(() => geocode(123), TypeError);
    assert.throws(() => geocode(null), TypeError);
  });

  test('result has all expected public keys', () => {
    const result = geocode('Chennai');
    const keys = ['name','latitude','longitude','state','stateCode','population','country','countryCode'];
    for (const k of keys) {
      assert.ok(k in result, `missing key: ${k}`);
    }
  });

});

// ─── Reverse Geocode ─────────────────────────────────────────────────────────

describe('reverseGeocode()', () => {

  test('coordinates near Mumbai return Mumbai', () => {
    const result = reverseGeocode(19.076, 72.877);
    assert.ok(result, 'should return a result');
    assert.equal(result.name, 'Mumbai');
  });

  test('coordinates near Delhi return Delhi', () => {
    const result = reverseGeocode(28.65, 77.23);
    assert.ok(result, 'should return a result');
    assert.equal(result.name, 'Delhi');
  });

  test('result has distance field with value and unit', () => {
    const result = reverseGeocode(12.97, 77.59);
    assert.ok(result.distance, 'should have distance');
    assert.ok(typeof result.distance.value === 'number', 'distance.value is a number');
    assert.equal(result.distance.unit, 'km');
  });

  test('unit option: miles', () => {
    const result = reverseGeocode(28.65, 77.23, { unit: 'mi' });
    assert.equal(result.distance.unit, 'mi');
  });

  test('throws on non-numeric inputs', () => {
    assert.throws(() => reverseGeocode('28', 77), TypeError);
  });

  test('throws on out-of-range coordinates', () => {
    assert.throws(() => reverseGeocode(200, 77), RangeError);
  });

});

// ─── Search ──────────────────────────────────────────────────────────────────

describe('search()', () => {

  test('prefix "Hyd" returns Hyderabad', () => {
    const results = search('Hyd');
    assert.ok(results.length > 0, 'should return results');
    assert.ok(results.some(c => c.name === 'Hyderabad'), 'Hyderabad should be in results');
  });

  test('prefix "chen" returns Chennai', () => {
    const results = search('chen');
    assert.ok(results.some(c => c.name === 'Chennai'));
  });

  test('respects limit option', () => {
    const results = search('a', { limit: 3 });
    assert.ok(results.length <= 3);
  });

  test('fuzzy mode: "Mumbi" finds Mumbai', () => {
    const results = search('Mumbi', { fuzzy: true });
    assert.ok(results.some(c => c.name === 'Mumbai'), 'fuzzy should find Mumbai');
  });

  test('empty query returns empty array', () => {
    const results = search('');
    assert.deepEqual(results, []);
  });

  test('results are in public shape', () => {
    const results = search('Jaipur');
    if (results.length > 0) {
      assert.ok('latitude' in results[0]);
      assert.ok('state' in results[0]);
    }
  });

});

// ─── Bounding Box ─────────────────────────────────────────────────────────────

describe('bbox()', () => {

  test('Maharashtra bbox contains Mumbai', () => {
    const results = bbox({ minLat: 15.6, maxLat: 22.1, minLon: 72.6, maxLon: 80.9 });
    assert.ok(results.length > 0, 'should return cities');
    assert.ok(results.some(c => c.name === 'Mumbai'), 'Mumbai should be in MH bbox');
  });

  test('results only include cities within the box', () => {
    const minLat = 26.0, maxLat = 28.0, minLon = 74.0, maxLon = 77.0;
    const results = bbox({ minLat, maxLat, minLon, maxLon });
    for (const c of results) {
      assert.ok(c.latitude  >= minLat && c.latitude  <= maxLat, `${c.name} lat out of box`);
      assert.ok(c.longitude >= minLon && c.longitude <= maxLon, `${c.name} lon out of box`);
    }
  });

  test('respects limit option', () => {
    const results = bbox({ minLat: 8.0, maxLat: 37.0, minLon: 68.0, maxLon: 98.0 }, { limit: 5 });
    assert.ok(results.length <= 5);
  });

  test('throws on missing numeric values', () => {
    assert.throws(() => bbox({ minLat: 'a', maxLat: 37, minLon: 68, maxLon: 98 }), TypeError);
  });

});

// ─── Utility ─────────────────────────────────────────────────────────────────

describe('stats()', () => {
  test('returns total, source, coverage, version', () => {
    const s = stats();
    assert.ok(typeof s.total === 'number' && s.total > 100, 'should have 100+ cities');
    assert.ok(typeof s.version === 'string');
    assert.ok(s.coverage.includes('India'));
  });
});

describe('listAll()', () => {
  test('returns an array of public-shape objects', () => {
    const all = listAll();
    assert.ok(Array.isArray(all) && all.length > 100);
    assert.ok('latitude' in all[0]);
    assert.ok('state'    in all[0]);
  });
});

// ─── searchByState ────────────────────────────────────────────────────────────

describe('searchByState()', () => {

  test('full name match: Maharashtra returns Mumbai', () => {
    const results = searchByState('Maharashtra');
    assert.ok(results.length > 0, 'should return cities');
    assert.ok(results.some(c => c.name === 'Mumbai'), 'Mumbai must be in Maharashtra results');
  });

  test('2-letter code match: MH returns Maharashtra cities', () => {
    const results = searchByState('MH');
    assert.ok(results.length > 0, 'should return cities');
    assert.ok(results.every(c => c.stateCode === 'MH'), 'all results must belong to MH');
  });

  test('partial state name: Prad returns multiple states', () => {
    // 'Prad' matches Andhra Pradesh, Madhya Pradesh, Himachal Pradesh, Uttar Pradesh, Arunachal Pradesh
    const results = searchByState('Pradesh');
    assert.ok(results.length > 0, 'partial match should work');
  });

  test('empty query returns empty array', () => {
    const results = searchByState('');
    assert.deepEqual(results, []);
  });

  test('results are sorted by population descending', () => {
    const results = searchByState('Karnataka');
    assert.ok(results.length >= 2, 'Karnataka should have multiple cities');
    assert.ok(results[0].population >= results[1].population, 'first city should have higher population');
  });

  test('results have full public shape', () => {
    const results = searchByState('Goa');
    assert.ok(results.length > 0);
    const keys = ['name','latitude','longitude','state','stateCode','population','country'];
    for (const k of keys) {
      assert.ok(k in results[0], `missing key: ${k}`);
    }
  });

});
