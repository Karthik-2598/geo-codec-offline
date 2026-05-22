'use strict';

function haversine(lat1, lon1, lat2, lon2, unit = 'km') {
  const R = unit === 'mi' ? EARTH_RADIUS_MI : EARTH_RADIUS_KM;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

//calculation done using the spherical trigonometry.

module.exports = { haversine };
