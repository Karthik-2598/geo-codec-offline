'use strict';

//used to calculate the minimum number of edits required to change one word to another.
//DP 2D approach.
function levenshtein(a, b, maxDist = Infinity) {
  // Quick checks
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Keep 'a' as the shorter string for memory efficiency
  if (a.length > b.length) { [a, b] = [b, a]; }

  const m = a.length;
  const n = b.length;

  // If lengths differ by more than maxDist, distance is at least that difference
  if (n - m > maxDist) return maxDist + 1;

  // prev[j] = dp[i-1][j], curr[j] = dp[i][j]
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  let curr = new Array(n + 1);
 //i loops through ch of string 'a'
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    let rowMin = curr[0];
//j loops through ch of string 'b'
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,        // deletion
        prev[j]     + 1,        // insertion
        prev[j - 1] + cost      // substitution
      );
      if (curr[j] < rowMin) rowMin = curr[j];
    }

    // Early exit: entire row is already beyond tolerance
    if (rowMin > maxDist) return maxDist + 1;

    // Swap rows
    [prev, curr] = [curr, prev];
  }

  return prev[n];
}


function normalise(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s\-]/g, '')
    .trim();
}


function fuzzySearch(query, cities, opts = {}) {
  const { maxDistance = 2, limit = 10 } = opts;
  const normQuery = normalise(query);

  const candidates = [];

  for (const city of cities) {
    const normName = normalise(city.n);
    const dist = levenshtein(normQuery, normName, maxDistance);

    if (dist <= maxDistance) {
      candidates.push({ city, distance: dist });
    }
  }

  // Sort: closest edit distance first, then by population descending
  candidates.sort((a, b) =>
    a.distance !== b.distance //sort by distance and population in descending order
      ? a.distance - b.distance
      : (b.city.p || 0) - (a.city.p || 0)
  );

  return candidates.slice(0, limit);
}

module.exports = { levenshtein, fuzzySearch };
