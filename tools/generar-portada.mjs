// Prepara la ilustración de la portada (tools/portada-original.webp: líneas blancas sobre naranja).
//
// Escribe:
//  - ../assets/portada/ciudad.webp (sin pérdida): rojo = líneas; azul = momento en que se dibuja
//    cada línea (0 al empezar, 255 al final). El dibujo arranca en el centro de la ruta y avanza
//    siguiendo los trazos. main.js lo pinta con WebGL; sin WebGL, un filtro SVG muestra el rojo.
//  - silueta.txt: el contorno de la ciudad para el <path class="hero-sil"> de index.html
//    (tapa la parte del 30 que queda detrás de los edificios).
//
// Uso (desde la carpeta tools/):
//   npm i sharp
//   node generar-portada.mjs
import fs from 'fs';
import sharp from 'sharp';

const { data, info } = await sharp('portada-original.webp').raw().toBuffer({ resolveWithObject: true });
const W = info.width, C = info.channels;
// Solo la parte de la ciudad: el cielo de arriba queda vacío
const Y0 = 505, H = info.height - Y0, N = W * H;

// Líneas: cuánto blanco hay en cada píxel (el fondo es naranja parejo, con algo de ruido)
const A = new Float32Array(N);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = ((y + Y0) * W + x) * C;
  const byBlue = (data[i + 2] - 22) / 228, byGreen = (data[i + 1] - 96) / 154;
  A[y * W + x] = Math.max(0, Math.min(1, (byBlue + byGreen) / 2));
}

// Orden del dibujo: distancia desde el centro de la ruta caminando por las líneas
// (cruzar fondo cuesta mucho más, así el trazo sigue los dibujos)
const SEED = [1000, 905];
const dist = new Float32Array(N).fill(Infinity);
const heapI = new Int32Array(N * 4), heapD = new Float32Array(N * 4);
let hn = 0;
const swap = (p, q) => { const i = heapI[p], d = heapD[p]; heapI[p] = heapI[q]; heapD[p] = heapD[q]; heapI[q] = i; heapD[q] = d; };
const push = (i, d) => {
  let k = hn++; heapI[k] = i; heapD[k] = d;
  while (k > 0) { const p = (k - 1) >> 1; if (heapD[p] <= heapD[k]) break; swap(p, k); k = p; }
};
const pop = () => {
  const i = heapI[0], d = heapD[0];
  hn--; heapI[0] = heapI[hn]; heapD[0] = heapD[hn];
  for (let k = 0; ;) {
    const l = 2 * k + 1, r = l + 1; let m = k;
    if (l < hn && heapD[l] < heapD[m]) m = l;
    if (r < hn && heapD[r] < heapD[m]) m = r;
    if (m === k) break; swap(m, k); k = m;
  }
  return [i, d];
};
const cost = (a) => 1 + 14 * Math.pow(1 - a, 1.5);
const seed = (SEED[1] - Y0) * W + SEED[0];
dist[seed] = 0; push(seed, 0);
const STEPS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];
while (hn > 0) {
  const [i, d] = pop();
  if (d > dist[i]) continue;
  const x = i % W, y = (i / W) | 0;
  for (const [dx, dy, s] of STEPS) {
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
    const j = ny * W + nx, nd = d + s * cost(A[j]);
    if (nd < dist[j]) { dist[j] = nd; push(j, nd); }
  }
}
// Se normaliza con el percentil 99,5 de las líneas (unos pocos puntos sueltos no estiran el tiempo)
const onLines = [];
for (let i = 0; i < N; i++) if (A[i] > 0.3) onLines.push(dist[i]);
onLines.sort((a, b) => a - b);
const DMAX = onLines[Math.floor(onLines.length * 0.995)];
const T = new Float32Array(N);
for (let i = 0; i < N; i++) T[i] = Math.min(1, dist[i] / DMAX);

// El brillo alrededor de las líneas se calcula en el navegador, así el archivo pesa menos
const tex = Buffer.alloc(N * 3);
for (let i = 0; i < N; i++) {
  const a = Math.round(A[i] * 255);
  tex[i * 3] = a;
  // El fondo también lleva su momento (un poco después que la línea más cercana): así, al
  // interpolar la textura, los bordes de las líneas no aparecen antes de tiempo
  tex[i * 3 + 2] = Math.round(T[i] * 255);
}
fs.mkdirSync('../assets/portada', { recursive: true });
await sharp(tex, { raw: { width: W, height: H, channels: 3 } }).webp({ lossless: true, effort: 6 }).toFile('../assets/portada/ciudad.webp');

// Silueta: el punto más alto de cada columna, suavizado para cerrar huecos finos entre edificios
const top = new Float32Array(W).fill(H);
for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) if (A[y * W + x] > 0.5) { top[x] = y; break; }
const R = 5, sil = new Float32Array(W);
for (let x = 0; x < W; x++) { let m = H; for (let k = -R; k <= R; k++) m = Math.min(m, top[Math.min(W - 1, Math.max(0, x + k))]); sil[x] = m; }
// Un punto cada 8 px, un poco por debajo del borde para que no asome por fuera de la línea
let d = `M0 ${H}`;
for (let x = 0; x <= W; x += 8) d += `L${x} ${Math.round(sil[Math.min(W - 1, x)] + 3)}`;
d += `L${W} ${H}Z`;
fs.writeFileSync('silueta.txt', d + '\n');
console.log(`ciudad ${W}x${H} (desde y=${Y0}); silueta ${d.length} caracteres`);
