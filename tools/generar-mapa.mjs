// Genera el SVG del mapa de cobertura (se pega dentro de .cov-map en index.html).
//  - Departamentos: geoBoundaries URY ADM1 (datos de OpenStreetMap, ODbL)
//  - Rutas: relaciones de OpenStreetMap (ODbL), recortadas cerca de los carteles de soportes.js
//
// Uso (desde la carpeta tools/):
//   npm i topojson-server topojson-client topojson-simplify
//   curl -L -o data/departamentos.geojson https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/9469f09/releaseData/gbOpen/URY/ADM1/geoBoundaries-URY-ADM1.geojson
//   curl -X POST --data-urlencode "data@rutas.overpassql" -o data/rutas.json https://overpass.kumi.systems/api/interpreter
//   node generar-mapa.mjs   → escribe mapa.svg.html
import fs from 'fs';
import * as topoServer from 'topojson-server';
import * as topoClient from 'topojson-client';
import * as topoSimplify from 'topojson-simplify';

const gb = JSON.parse(fs.readFileSync('data/departamentos.geojson'));
const osm = JSON.parse(fs.readFileSync('data/rutas.json'));
globalThis.window = {}; eval(fs.readFileSync('../soportes.js', 'utf8'));
const S = globalThis.window.SOPORTES;

// Proyección Mercator: conserva la forma de cada zona (Montevideo incluido)
const LON0 = -58.5, LAT0 = -30.0, K = 83;
const M = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) * 180 / Math.PI;
const M0 = M(LAT0);
const P = ([lon, lat]) => [(lon - LON0) * K, (M0 - M(lat)) * K];
const mapCoords = (c) => (typeof c[0] === 'number' ? P(c) : c.map(mapCoords));

const proj = { type: 'FeatureCollection', features: gb.features.map((f) => ({ type: 'Feature', properties: { name: f.properties.shapeName }, geometry: { type: f.geometry.type, coordinates: mapCoords(f.geometry.coordinates) } })) };

// Simplificación con bordes compartidos: más detalle cerca de Montevideo y en la costa sur
const topo = topoSimplify.presimplify(topoServer.topology({ deps: proj }));
const [mvdX, mvdY] = P([-56.19, -34.86]);
// Tolerancias (en unidades del mapa ≈ 0,9 km): fino cerca de Montevideo, medio en la costa sur, grueso en el interior
const MVD_R = 16, T_MVD = 0.02, T_COAST = 0.06, T_REST = 0.3;
const [, coastY2] = P([0, -34.55]);
const inMvd = (x, y) => Math.hypot(x - mvdX, y - mvdY) < MVD_R;
const thr = (x, y) => (inMvd(x, y) ? T_MVD ** 2 : y > coastY2 ? T_COAST ** 2 : T_REST ** 2);
topo.arcs = topo.arcs.map((arc) => arc.filter((p, i) => i === 0 || i === arc.length - 1 || p[2] >= thr(p[0], p[1])));
const deps = topoClient.feature(topo, topo.objects.deps).features;

// Límites del dibujo
let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
deps.forEach((f) => (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates).flat().flat().forEach(([x, y]) => { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }));
const PAD = 2, ox = -minX + PAD, oy = -minY + PAD;
const W = Math.ceil(maxX - minX + PAD * 2), H = Math.ceil(maxY - minY + PAD * 2);
const fx = (n) => Math.round(n * 100) / 100;
const pt = ([x, y]) => `${fx(x + ox)} ${fx(y + oy)}`;
// Path relativo: primer punto absoluto y el resto como diferencias (ocupa mucho menos)
const relD = (pts, close) => {
  let out = '', px = 0, py = 0;
  pts.forEach(([x0, y0], i) => {
    const prec = inMvd(x0, y0) ? 100 : 10;
    const x = Math.round((x0 + ox) * prec) / prec, y = Math.round((y0 + oy) * prec) / prec;
    if (i === 0) out += `M${x} ${y}`;
    else { const dx = Math.round((x - px) * 100) / 100, dy = Math.round((y - py) * 100) / 100; if (dx || dy) out += `l${dx} ${dy}`.replace(/ -/g, '-'); }
    px = x; py = y;
  });
  return out.replace(/(^|[^\d])0\./g, '$1.') + (close ? 'z' : '');
};
const ringD = (r) => relD(r.slice(0, -1), true);

// Orden de pintado: de sur a norte
const centroidY = (f) => { const r = (f.geometry.type === 'Polygon' ? f.geometry.coordinates[0] : f.geometry.coordinates[0][0]); return r.reduce((a, p) => a + p[1], 0) / r.length; };
deps.sort((a, b) => centroidY(b) - centroidY(a));
const depsSvg = deps.map((f) => `<path data-name="${f.properties.name}" d="${(f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates).flatMap((poly) => poly.map(ringD)).join('')}"/>`).join('');

// Rutas: una dirección de cada tramo (sin ramales), recortadas al radio de sus carteles
const REF = { '1': 'Ruta 1', '5': 'Ruta 5', IB: 'Interbalnearia', '101': 'Ruta 101', '102': 'Ruta 102' };
const MVD = [-56.1913, -34.9055];
const km = ([lo1, la1], [lo2, la2]) => { const r = Math.PI / 180, a = Math.sin(((la2 - la1) * r) / 2) ** 2 + Math.cos(la1 * r) * Math.cos(la2 * r) * Math.sin(((lo2 - lo1) * r) / 2) ** 2; return 12742 * Math.asin(Math.sqrt(a)); };
const dp = (pts, tol) => { if (pts.length < 3) return pts; let dmax = 0, idx = 0; const a = pts[0], b = pts[pts.length - 1];
  for (let i = 1; i < pts.length - 1; i++) { const p = pts[i]; const dx = b[0] - a[0], dy = b[1] - a[1]; const L = Math.hypot(dx, dy) || 1e-9; const d = Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / L; if (d > dmax) { dmax = d; idx = i; } }
  return dmax > tol ? [...dp(pts.slice(0, idx + 1), tol).slice(0, -1), ...dp(pts.slice(idx), tol)] : [a, b]; };
const routesSvg = [];
const stats = {};
for (const rel of osm.elements) {
  const name = REF[rel.tags.ref];
  const carteles = S.ruteros.filter((r) => r[1] === name);
  const radius = Math.max(...carteles.map((r) => km(MVD, [r[6], r[5]]))) + 15;
  const segs = [];
  for (const m of rel.members) {
    if (m.type !== 'way' || !m.geometry || m.role === 'link' || m.role === 'backward') continue;
    let cur = [];
    for (const g of m.geometry) {
      const ll = [g.lon, g.lat];
      if (km(MVD, ll) <= radius) cur.push(P(ll)); else { if (cur.length > 1) segs.push(cur); cur = []; }
    }
    if (cur.length > 1) segs.push(cur);
  }
  const d = segs.map((s) => relD(dp(s, 0.015), false)).join('');
  stats[name] = { carteles: carteles.length, radius: Math.round(radius), segs: segs.length, bytes: d.length };
  routesSvg.push({ ref: rel.tags.ref, name, d });
}

const svg = `<svg class="map-svg" id="mapSvg" viewBox="0 0 ${W} ${H}" data-proj='${JSON.stringify({ lon0: LON0, lat0: LAT0, k: K, ox: fx(ox), oy: fx(oy) })}' aria-hidden="true">
            <g class="m-deps">${depsSvg}</g>
            <defs>${routesSvg.map((r) => `<path id="rt-${r.ref}" vector-effect="non-scaling-stroke" d="${r.d}"/>`).join('')}</defs>
            <g class="m-routes">${routesSvg.map((r) => `<g class="m-route" data-route="${r.name}"><use href="#rt-${r.ref}" class="r-casing"/><use href="#rt-${r.ref}" class="r-line"/><use href="#rt-${r.ref}" class="r-hit"/></g>`).join('')}</g>
          </svg>`;
fs.writeFileSync('mapa.svg.html', svg);
console.log('viewBox', W, H, 'total KB', (svg.length / 1024).toFixed(1), 'deps KB', (depsSvg.length / 1024).toFixed(1));
console.log(stats);
console.log('orden', deps.map((f) => f.properties.name).join(', '));
