'use strict';
//designed to make searching space.
//divide the map into halves(vertical and horizontal)
//so the selection will searched in the limited box formed with longitude and latitude lines.
//kind of BST(Binary search tree logic)
class KDTree {
  constructor() {
    this.root = null;
    this.size = 0;
  }

  build(points) {
    this.size = points.length;
    this.root = this._build(points.slice(), 0);
  }

  _build(pts, depth) { //implementation class
    if (pts.length === 0) return null;

    // Alternate axis: even depth → split by lat, odd → split by lon
    const axis = depth % 2;
    const key  = axis === 0 ? 'la' : 'lo';

    // Sort by split axis and choose median as node (guarantees balanced tree)
    pts.sort((a, b) => a[key] - b[key]);
    const mid = Math.floor(pts.length / 2);

    return {
      point : pts[mid],
      left  : this._build(pts.slice(0, mid),      depth + 1),
      right : this._build(pts.slice(mid + 1),     depth + 1),
    };
  }

  nearest(lat, lon) {
    const best = { point: null, distSq: Infinity };
    this._nearest(this.root, lat, lon, 0, best);
    return best.point;
  }

  _nearest(node, lat, lon, depth, best) {
    if (!node) return;

    // Check this node
    const d = this._distSq(lat, lon, node.point.la, node.point.lo);
    if (d < best.distSq) {
      best.distSq = d;
      best.point  = node.point;
    }

    // Decide which child subtree is "near" (same side as query)
    const axis  = depth % 2;
    const diff  = axis === 0 ? lat - node.point.la : lon - node.point.lo;
    const [near, far] = diff < 0
      ? [node.left,  node.right]
      : [node.right, node.left];

    // Always explore the near subtree
    this._nearest(near, lat, lon, depth + 1, best);

    // Only explore far subtree if the split-plane is within current best distance
    // diff*diff is the squared distance to the split plane on the split axis
    if (diff * diff < best.distSq) {
      this._nearest(far, lat, lon, depth + 1, best);
    }
  }
//searching the cities with the range.

  range(minLat, maxLat, minLon, maxLon) {
    const results = [];
    this._range(this.root, minLat, maxLat, minLon, maxLon, 0, results);
    return results;
  }

  _range(node, minLat, maxLat, minLon, maxLon, depth, results) {
    if (!node) return;

    const { la, lo } = node.point;

    // Include this point if inside bbox
    if (la >= minLat && la <= maxLat && lo >= minLon && lo <= maxLon) {
      results.push(node.point);
    }

    const axis = depth % 2;
    if (axis === 0) {
      // Split on latitude — only traverse children whose lat range overlaps bbox
      if (minLat <= node.point.la) this._range(node.left,  minLat, maxLat, minLon, maxLon, depth + 1, results);
      if (maxLat >= node.point.la) this._range(node.right, minLat, maxLat, minLon, maxLon, depth + 1, results);
    } else {
      // Split on longitude
      if (minLon <= node.point.lo) this._range(node.left,  minLat, maxLat, minLon, maxLon, depth + 1, results);
      if (maxLon >= node.point.lo) this._range(node.right, minLat, maxLat, minLon, maxLon, depth + 1, results);
    }
  }
  _distSq(lat1, lon1, lat2, lon2) {
    return (lat1 - lat2) ** 2 + (lon1 - lon2) ** 2;
  }
}

module.exports = { KDTree };
