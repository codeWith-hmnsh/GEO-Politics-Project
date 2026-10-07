// Builds compact country (admin-0) and state (admin-1) geometry for the globe.
// Source: Natural Earth via world-atlas (admin-0, 1:50m) and natural-earth-vector (admin-1, 1:10m), public domain.
// Usage: npm run geo:build   (downloads the admin-1 file once into .cache/)
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { feature } from "topojson-client";
import countries from "i18n-iso-countries";

const require = createRequire(import.meta.url);
const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const OUT = join(ROOT, "public", "geo");
const CACHE = join(ROOT, ".cache");
const ADM1_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson";

const round = (n) => Math.round(n * 100) / 100;

// Douglas–Peucker simplification on [lng, lat] points.
function simplify(points, tol) {
  if (points.length <= 4) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = points[a];
    const [bx, by] = points[b];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy);
    let maxD = 0;
    let idx = -1;
    for (let i = a + 1; i < b; i++) {
      // Closed rings start and end on the same point: fall back to distance from that point.
      const d =
        len < 1e-9
          ? Math.hypot(points[i][0] - ax, points[i][1] - ay)
          : Math.abs(dy * points[i][0] - dx * points[i][1] + bx * ay - by * ax) / len;
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (maxD > tol && idx > 0) {
      keep[idx] = 1;
      stack.push([a, idx], [idx, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

function polygonsOf(geometry) {
  if (!geometry) return [];
  if (geometry.type === "Polygon") return [geometry.coordinates];
  if (geometry.type === "MultiPolygon") return geometry.coordinates;
  return [];
}

function cleanRing(ring, tol) {
  const pts = tol ? simplify(ring, tol) : ring;
  const out = [];
  for (const [x, y] of pts) {
    const p = [round(x), round(y)];
    const last = out[out.length - 1];
    if (!last || last[0] !== p[0] || last[1] !== p[1]) out.push(p);
  }
  return out.length >= 4 ? out : null;
}

function bboxOf(ring) {
  let minX = 999, minY = 999, maxX = -999, maxY = -999;
  for (const [x, y] of ring) {
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  return [minX, minY, maxX, maxY];
}

// Label anchors where the bounding box of the largest polygon is a poor centre.
const CENTROID_FIX = {
  USA: [39, -98], RUS: [60, 90], CAN: [58, -100], FRA: [46.6, 2.4], NOR: [61, 9], IDN: [-2, 117],
  JPN: [36.5, 138.5], GBR: [53, -1.8], CHL: [-33, -71], CHN: [34, 104], IND: [22.5, 79], ISR: [31.3, 34.9],
  MYS: [3.8, 102], DNK: [56, 9.3], KOR: [36.4, 127.9], VNM: [16, 107.5], HRV: [45.3, 16], GRC: [39.3, 22],
  NZL: [-41.5, 172.5], PHL: [12.5, 122], ITA: [42.8, 12.5],
};
const NO_ISO = { Kosovo: "XKX", "N. Cyprus": "XNC", Somaliland: "XSL", "Siachen Glacier": "XSG" };

function buildCountries() {
  const topo = require("world-atlas/countries-50m.json");
  const fc = feature(topo, topo.objects.countries);
  const list = [];
  for (const f of fc.features) {
    const name = f.properties.name;
    const iso3 =
      (f.id && countries.numericToAlpha3(f.id)) || NO_ISO[name] || "X" + name.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase();
    const polygons = polygonsOf(f.geometry)
      .map((poly) => poly.map((ring) => cleanRing(ring, 0)).filter(Boolean))
      .filter((poly) => poly.length);
    if (!polygons.length) continue;
    let best = null;
    let bestArea = -1;
    for (const poly of polygons) {
      const b = bboxOf(poly[0]);
      const area = (b[2] - b[0]) * (b[3] - b[1]);
      if (b[2] - b[0] < 180 && area > bestArea) {
        bestArea = area;
        best = b;
      }
    }
    best ??= bboxOf(polygons[0][0]);
    const centroid = CENTROID_FIX[iso3] ?? [round((best[1] + best[3]) / 2), round((best[0] + best[2]) / 2)];
    list.push({ iso3, name, centroid, area: round(bestArea), polygons });
  }
  list.sort((a, b) => a.name.localeCompare(b.name));
  writeFileSync(join(OUT, "countries.json"), JSON.stringify(list));
  console.log(`countries.json: ${list.length} countries`);
}

async function buildAdmin1() {
  mkdirSync(CACHE, { recursive: true });
  const file = join(CACHE, "ne_10m_admin_1.geojson");
  if (!existsSync(file)) {
    console.log("downloading Natural Earth admin-1 (≈40 MB)…");
    const res = await fetch(ADM1_URL);
    if (!res.ok) throw new Error(`admin-1 download failed: ${res.status}`);
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  const fc = JSON.parse(readFileSync(file, "utf8"));
  const byCountry = new Map();
  for (const f of fc.features) {
    const p = f.properties;
    const iso3 = p.adm0_a3;
    if (!iso3 || iso3 === "-99") continue;
    const rings = polygonsOf(f.geometry).map((poly) => poly[0]);
    if (!rings.length) continue;
    if (!byCountry.has(iso3)) byCountry.set(iso3, { states: [], rings: [] });
    const entry = byCountry.get(iso3);
    entry.states.push({ name: p.name_en || p.name || "", label: [round(p.latitude ?? 0), round(p.longitude ?? 0)] });
    entry.rings.push(...rings);
  }
  const dir = join(OUT, "adm1");
  mkdirSync(dir, { recursive: true });
  let total = 0;
  let written = 0;
  for (const [iso3, { states, rings }] of byCountry) {
    if (states.length < 2) continue;
    const lines = interiorLines(rings).map((l) => cleanLine(l, 0.004)).filter(Boolean);
    if (!lines.length) continue;
    const json = JSON.stringify({ iso3, states, lines });
    total += json.length;
    written++;
    writeFileSync(join(dir, `${iso3}.json`), json);
  }
  console.log(`adm1/: ${written} countries, ${(total / 1e6).toFixed(1)} MB`);
}

// State borders shared by two states (edges that appear in two rings). Coastlines and country borders
// are left out, so they never double up with the admin-0 lines.
function interiorLines(rings) {
  const key = ([x, y]) => `${x.toFixed(4)},${y.toFixed(4)}`;
  const count = new Map();
  const point = new Map();
  for (const ring of rings) {
    for (let i = 0; i < ring.length - 1; i++) {
      const a = key(ring[i]);
      const b = key(ring[i + 1]);
      if (a === b) continue;
      point.set(a, ring[i]);
      point.set(b, ring[i + 1]);
      const e = a < b ? `${a}|${b}` : `${b}|${a}`;
      count.set(e, (count.get(e) ?? 0) + 1);
    }
  }
  const adj = new Map();
  for (const [e, n] of count) {
    if (n < 2) continue;
    const [a, b] = e.split("|");
    if (!adj.has(a)) adj.set(a, new Set());
    if (!adj.has(b)) adj.set(b, new Set());
    adj.get(a).add(b);
    adj.get(b).add(a);
  }
  const used = new Set();
  const edge = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const walk = (start, next) => {
    const line = [start, next];
    used.add(edge(start, next));
    let prev = start;
    let cur = next;
    while (adj.get(cur)?.size === 2) {
      const nxt = [...adj.get(cur)].find((n) => n !== prev);
      if (!nxt || used.has(edge(cur, nxt))) break;
      used.add(edge(cur, nxt));
      line.push(nxt);
      prev = cur;
      cur = nxt;
    }
    return line;
  };
  const lines = [];
  // Start from junctions and ends first, then close remaining loops.
  const order = [...adj.keys()].sort((a, b) => (adj.get(a).size === 2) - (adj.get(b).size === 2));
  for (const a of order) {
    for (const b of adj.get(a)) {
      if (!used.has(edge(a, b))) lines.push(walk(a, b).map((k) => point.get(k)));
    }
  }
  return lines;
}

function cleanLine(line, tol) {
  const out = [];
  for (const [x, y] of simplify(line, tol)) {
    const p = [round(x), round(y)];
    const last = out[out.length - 1];
    if (!last || last[0] !== p[0] || last[1] !== p[1]) out.push(p);
  }
  return out.length >= 2 ? out : null;
}

mkdirSync(OUT, { recursive: true });
buildCountries();
await buildAdmin1();
