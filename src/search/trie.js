'use strict';


class TrieNode {
  constructor() {
    this.children = new Map();
    this.cities = [];
  }
}

class Trie {
  constructor() {
    this.root = new TrieNode();
    this.count = 0;
  }

  // ─── Normalisation ───────────────────────────────────────────────────────
//before putting in trie, normalise it into lowercase and remove accents, symbols.
  _normalise(str) {
    return str
      .toLowerCase()
      .normalize('NFD')                // decompose accented chars into base + mark
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s\-]/g, '')  // keep only alphanumeric, space, hyphen
      .trim();
  }

  // ─── Insert ──────────────────────────────────────────────────────────────
//trie logic, loop through city, each ch in city if not exists, create a new node.
  insert(name, city, alts = []) {
    this._insertOne(name, city);
    for (const alt of alts) {
      this._insertOne(alt, city);
    }
    this.count++;
  }

  _insertOne(name, city) {
    const key = this._normalise(name);
    if (!key) return;

    let node = this.root;
    for (const ch of key) {
      if (!node.children.has(ch)) {
        node.children.set(ch, new TrieNode());
      }
      node = node.children.get(ch);
    }
    // Avoid duplicates: only push if this city isn't already at this terminal
    if (!node.cities.includes(city)) {
      node.cities.push(city);
    }
  }

  // ─── Search ──────────────────────────────────────────────────────────────
  search(prefix, limit = 10) {
    const key = this._normalise(prefix);
    if (!key) return []; //if ch missing, return empty array

    // Walk to the prefix node
    let node = this.root;
    for (const ch of key) {
      if (!node.children.has(ch)) return []; // No cities with this prefix
      node = node.children.get(ch);
    }

    // Collect all cities in the subtree rooted at the prefix node
    const results = [];
    this._collect(node, results, limit);

    // Sort by population descending so larger cities surface first
    return results.sort((a, b) => (b.p || 0) - (a.p || 0));
  }

 
  _collect(node, results, limit) {
    if (results.length >= limit) return;

    for (const city of node.cities) {
      if (!results.includes(city)) results.push(city);
      if (results.length >= limit) return;
    }

    for (const child of node.children.values()) {
      this._collect(child, results, limit);
      if (results.length >= limit) return;
    } //to grab every sungle city that lives below this node.
  }

  // ─── Exact lookup ────────────────────────────────────────────────────────

  exact(name) {
    const key = this._normalise(name);
    let node = this.root;
    for (const ch of key) {
      if (!node.children.has(ch)) return [];
      node = node.children.get(ch);
    }
    return node.cities.slice();
  }
}

module.exports = { Trie };
