// Activador · motor de reglas, reproductor y panel de control
import configLocal from './config.js';
import { crearCuestionario, leerCuestionario, inmobiliario, MARCA } from './cuestionario.js';
import { crearSenales, iniciarCamara, iniciarClima, iniciarSonido, iniciarEntradas } from './disparadores.js';
import { conectarPantalla } from './nube.js';

const params = new URLSearchParams(location.search);
const escenario = document.getElementById('escenario');

// Con ?pantalla=CLAVE los contenidos y las reglas vienen del panel; sin eso, de config.js
let nube = null;
if (params.get('pantalla')) {
  try {
    nube = await conectarPantalla(params.get('pantalla'));
  } catch (e) {
    escenario.innerHTML = '<div class="capa visible escena-mensaje" style="--fondo:#eb691c"><div class="mensaje"><h1>Sin conexión</h1><p></p></div></div>';
    escenario.querySelector('p').textContent = e.message + ' Se reintenta en un minuto.';
    setTimeout(() => location.reload(), 60000);
    throw e;
  }
}
const config = nube ? { ...configLocal, ...nube.config } : configLocal;
if (params.get('cuestionario') === 'inmobiliario' && !nube) {
  document.title = 'Veocasas · Tu próximo hogar';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#e32219');
  config.escenas = { ...config.escenas, inmobiliario: { tipo: 'mensaje', titulo: 'Tu próximo hogar', texto: MARCA + JSON.stringify({ ...inmobiliario(), presentacion: 'veocasas' }), duracion: 18 } };
  config.tanda = ['inmobiliario'];
  config.ubicacion = { nombre: 'Mercedes', lat: -33.2524, lon: -58.0305 };
}
const panel = document.getElementById('panel');
const s = crearSenales();

// ---------- Simulación por URL (para probar sin esperar al clima o a la hora) ----------
// ?temp=30  ?lluvia=1  ?uv=9  ?hora=08:30
const forzado = {};
if (params.has('temp')) forzado.temperatura = Number(params.get('temp'));
if (params.has('lluvia')) forzado.lluvia = params.get('lluvia') === '1';
if (params.has('uv')) forzado.uv = Number(params.get('uv'));
if (Object.keys(forzado).length) { s.climaForzado = forzado; s.clima = { ...forzado }; }
const horaForzada = params.get('hora');
const reloj = () => {
  const d = new Date();
  if (horaForzada) { const [h, m] = horaForzada.split(':').map(Number); d.setHours(h, m || 0); }
  return d;
};

// ---------- Condiciones ----------
const minutos = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0); };
const enHorario = (fecha, [desde, hasta]) => {
  const ahora = fecha.getHours() * 60 + fecha.getMinutes();
  const a = minutos(desde), b = minutos(hasta);
  return a <= b ? ahora >= a && ahora < b : ahora >= a || ahora < b; // rango que cruza la medianoche
};
const PULSO = 400; // ms que dura "apretada" una tecla o un toque

const CONDICIONES = {
  personas: (v) => s.personas >= v,
  cerca: (v) => s.cercania >= v,
  vehiculos: (v) => s.vehiculos >= v,
  movimiento: (v) => s.movimiento >= v,
  gesto: (v) => [].concat(v).includes(s.gesto),
  sonido: (v) => s.sonido >= v,
  tecla: (v, ahora) => ahora - (s.teclas[String(v).toLowerCase()] ?? -Infinity) < PULSO,
  toque: (v, ahora) => (ahora - s.toque < PULSO) === v,
  horario: (v) => enHorario(s.fecha, v),
  dias: (v) => v.includes(s.fecha.getDay()),
  temperaturaMin: (v) => s.clima?.temperatura >= v,
  temperaturaMax: (v) => s.clima?.temperatura <= v,
  lluvia: (v) => !!s.clima && s.clima.lluvia === v,
  uvMin: (v) => s.clima?.uv >= v,
};

const reglas = config.reglas.map((r, i) => ({
  id: i,
  durante: 0, minimo: 4, maximo: 20, mantener: 2, enfriamiento: 30, prioridad: 0,
  ...r,
  desde: null, lista: false, libreDesde: 0, indice: 0,
}));
for (const r of reglas) {
  for (const clave of Object.keys(r.cuando)) {
    if (!CONDICIONES[clave]) console.warn('Activador: condición desconocida "' + clave + '" en la regla "' + r.nombre + '"');
  }
  for (const id of [].concat(r.mostrar || [], r.tanda || [], config.tanda)) {
    if (!config.escenas[id]) console.warn('Activador: la escena "' + id + '" no existe (regla "' + r.nombre + '")');
  }
}
const activas = reglas.filter((r) => r.activa !== false);
const eventos = activas.filter((r) => r.mostrar);
const contextos = activas.filter((r) => r.tanda);
const usa = (...claves) => activas.some((r) => claves.some((c) => c in r.cuando));

const evaluar = (r, ahora) => Object.entries(r.cuando).every(([clave, v]) => CONDICIONES[clave]?.(v, ahora));

// ---------- Conteo de disparos (queda en este navegador) ----------
const CLAVE_CONTEO = 'activador-conteo';
let conteo = {};
try { conteo = JSON.parse(localStorage.getItem(CLAVE_CONTEO)) || {}; } catch { /* sin almacenamiento */ }
const contar = (nombre) => {
  const dia = new Date().toISOString().slice(0, 10);
  conteo[dia] ??= {};
  conteo[dia][nombre] = (conteo[dia][nombre] || 0) + 1;
  try { localStorage.setItem(CLAVE_CONTEO, JSON.stringify(conteo)); } catch { /* sin almacenamiento */ }
};
const registro = [];
const anotar = (texto) => {
  registro.unshift(new Date().toLocaleTimeString('es-UY') + '  ' + texto);
  registro.length = Math.min(registro.length, 12);
};

// ---------- Reproductor ----------
const plantilla = (t) => String(t ?? '').replace(/\{(\w+)\}/g, (_, k) => {
  const h = s.fecha.getHours();
  const valores = {
    saludo: h >= 6 && h < 13 ? 'Buen día' : h >= 13 && h < 20 ? 'Buenas tardes' : 'Buenas noches',
    hora: s.fecha.toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' }),
    temp: s.clima?.temperatura ?? '–',
    personas: Math.max(s.personas, 2),
    vehiculos: s.vehiculos,
    ciudad: config.ubicacion.nombre,
  };
  return valores[k] ?? '{' + k + '}';
});

const cuestionario = crearCuestionario({ raiz: escenario, senales: s, pantalla: params.get('pantalla'),
  registrar: nombre => { contar(nombre); nube?.disparo(nombre); anotar(nombre); },
  terminar: () => { if (evento) cerrar(performance.now()); siguienteDeTanda(); },
});
let escenaActual = null;
let finEscena = Infinity;
const mostrar = (id) => {
  const e = config.escenas[id];
  if (!e) return;
  cuestionario.cancelar();
  const preguntas = leerCuestionario(e);
  if (preguntas) { escenaActual = id; finEscena = Infinity; cuestionario.abrir(preguntas); return; }
  const capa = document.createElement('div');
  capa.className = 'capa escena-' + e.tipo;
  if (e.tipo === 'imagen') {
    capa.innerHTML = '<img alt="">';
    capa.firstChild.src = e.src;
  } else if (e.tipo === 'video') {
    const v = document.createElement('video');
    Object.assign(v, { src: e.src, muted: true, autoplay: true, playsInline: true, loop: !!e.duracion });
    if (!e.duracion) v.addEventListener('ended', () => { finEscena = 0; });
    capa.append(v);
  } else {
    capa.style.setProperty('--fondo', e.fondo || '#eb691c');
    if (e.fondo && e.fondo.toLowerCase() === '#ffffff') capa.classList.add('claro');
    if (e.imagen) capa.innerHTML = '<img alt="" class="fondo-foto">';
    capa.insertAdjacentHTML('beforeend', '<div class="mensaje"><img src="../assets/logo-blanco.png" alt="Movimagen" class="logo"><h1></h1><p></p></div>');
    if (e.imagen) capa.querySelector('.fondo-foto').src = e.imagen;
    capa.dataset.titulo = e.titulo || '';
    capa.dataset.texto = e.texto || '';
    pintarTextos(capa);
  }
  escenario.append(capa);
  requestAnimationFrame(() => requestAnimationFrame(() => capa.classList.add('visible')));
  // La capa anterior se va cuando la nueva terminó de aparecer
  const anteriores = [...escenario.querySelectorAll('.capa')].filter((c) => c !== capa);
  setTimeout(() => anteriores.forEach((c) => c.remove()), 700);
  escenaActual = id;
  finEscena = performance.now() + (e.duracion ? e.duracion * 1000 : 60000);
};
const pintarTextos = (capa) => {
  const h1 = capa.querySelector('h1'), p = capa.querySelector('p');
  if (!h1 || capa.classList.contains('escena-cuestionario')) return;
  const t = plantilla(capa.dataset.titulo), x = plantilla(capa.dataset.texto);
  if (h1.textContent !== t) h1.textContent = t;
  if (p.textContent !== x) p.textContent = x;
};

// ---------- Motor ----------
let evento = null; // { regla, inicio, ultimaVez }
let tanda = config.tanda;
let indiceTanda = -1;

const tandaVigente = () => {
  const r = contextos.filter((c) => c.lista).sort((a, b) => b.prioridad - a.prioridad)[0];
  return r ? r.tanda : config.tanda;
};
const siguienteDeTanda = () => {
  const nueva = tandaVigente();
  if (nueva !== tanda) {
    tanda = nueva;
    indiceTanda = -1;
    anotar('Rotación: ' + (contextos.find((c) => c.tanda === nueva)?.nombre || 'normal'));
  }
  indiceTanda = (indiceTanda + 1) % tanda.length;
  mostrar(tanda[indiceTanda]);
};
const abrir = (r, ahora) => {
  const lista = [].concat(r.mostrar);
  const id = lista[r.indice++ % lista.length];
  evento = { regla: r, inicio: ahora, ultimaVez: ahora };
  mostrar(id);
  contar(r.nombre);
  nube?.disparo(r.nombre);
  anotar('▶ ' + r.nombre);
};
const cerrar = (ahora) => {
  evento.regla.libreDesde = ahora + evento.regla.enfriamiento * 1000;
  evento = null;
};

const paso = () => {
  const ahora = performance.now();
  s.fecha = reloj();
  if (cuestionario.paso(ahora)) return;
  for (const r of activas) {
    const cumple = evaluar(r, ahora);
    if (!cumple) r.desde = null;
    else r.desde ??= ahora;
    r.lista = cumple && ahora - r.desde >= r.durante * 1000;
  }
  const candidata = eventos
    .filter((r) => r.lista && ahora >= r.libreDesde)
    .sort((a, b) => b.prioridad - a.prioridad)[0];

  if (evento) {
    const r = evento.regla;
    if (r.lista) evento.ultimaVez = ahora;
    const enPantalla = ahora - evento.inicio;
    const termina = enPantalla >= r.maximo * 1000 ||
      (enPantalla >= r.minimo * 1000 && ahora - evento.ultimaVez >= r.mantener * 1000);
    if (candidata && candidata !== r && candidata.prioridad > r.prioridad) {
      cerrar(ahora);
      abrir(candidata, ahora);
    } else if (termina) {
      cerrar(ahora);
      siguienteDeTanda();
    } else if (ahora >= finEscena && [].concat(r.mostrar).length > 1) {
      mostrar([].concat(r.mostrar)[r.indice++ % [].concat(r.mostrar).length]);
    }
  } else if (candidata) {
    abrir(candidata, ahora);
  } else if (ahora >= finEscena) {
    siguienteDeTanda();
  }
};

// ---------- Panel de control (tecla D o ?panel) ----------
const fmt = (n) => (Math.round(n * 100) / 100).toFixed(2);
const panelCanvas = panel.querySelector('canvas');
const pctx = panelCanvas.getContext('2d');
const pintarPanel = () => {
  if (!document.body.classList.contains('con-panel')) return;
  const ahora = performance.now();
  const cam = s.camara;
  // Vista de la cámara con lo que detecta
  pctx.fillStyle = '#111';
  pctx.fillRect(0, 0, panelCanvas.width, panelCanvas.height);
  if (cam.video) {
    const W = panelCanvas.width, H = panelCanvas.height;
    pctx.save();
    if (config.camara.espejo) { pctx.translate(W, 0); pctx.scale(-1, 1); }
    pctx.drawImage(cam.video, 0, 0, W, H);
    pctx.lineWidth = 2;
    pctx.font = '11px Montserrat, sans-serif';
    for (const c of cam.cajas) {
      pctx.strokeStyle = c.tipo === 'person' ? '#eb691c' : '#4cc9f0';
      pctx.strokeRect(c.x * W, c.y * H, c.w * W, c.h * H);
    }
    pctx.fillStyle = '#fff';
    for (const mano of cam.manos) for (const p of mano) pctx.fillRect(p.x * W - 1.5, p.y * H - 1.5, 3, 3);
    pctx.restore();
  }
  const filas = [
    ['Cámara', cam.estado],
    ['Movimiento', fmt(s.movimiento)],
    ['Personas', s.personas],
    ['Cercanía', fmt(s.cercania)],
    ['Vehículos', s.vehiculos],
    ['Gesto', s.gesto || '–'],
    ['Clima', s.clima ? s.clima.temperatura + '° · ' + (s.clima.lluvia ? 'lluvia' : 'sin lluvia') + ' · UV ' + (s.clima.uv ?? '–') : '–'],
    ['', s.climaEstado],
    ['Sonido', s.sonidoEstado === 'ok' ? fmt(s.sonido) : s.sonidoEstado],
    ['Hora', s.fecha.toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' }) + (horaForzada ? ' (simulada)' : '')],
    ['En pantalla', (config.escenas[escenaActual]?.nombre || escenaActual || '–') + (evento ? ' · por "' + evento.regla.nombre + '"' : '')],
  ];
  panel.querySelector('.senales').innerHTML = filas.map(([a, b]) => '<dt>' + a + '</dt><dd>' + esc(b) + '</dd>').join('');
  panel.querySelector('.reglas').innerHTML = reglas.map((r) => {
    let estado = 'apagada';
    if (r.activa !== false) {
      if (evento?.regla === r) estado = 'en pantalla';
      else if (r.lista && r.tanda && r.tanda === tanda) estado = 'rotación';
      else if (ahora < r.libreDesde) estado = 'espera ' + Math.ceil((r.libreDesde - ahora) / 1000) + ' s';
      else if (r.lista) estado = 'lista';
      else if (r.desde !== null) estado = 'confirmando';
      else estado = '';
    }
    const clase = estado === 'en pantalla' || estado === 'rotación' ? 'on' : estado === 'apagada' ? 'off' : '';
    return '<li class="' + clase + '"><span>' + esc(r.nombre) + '</span><em>' + estado + '</em></li>';
  }).join('');
  panel.querySelector('.registro').textContent = registro.join('\n');
  const hoy = conteo[new Date().toISOString().slice(0, 10)] || {};
  panel.querySelector('.conteo').innerHTML = Object.entries(hoy).map(([k, v]) => '<dt>' + esc(k) + '</dt><dd>' + v + '</dd>').join('') || '<dt>Sin disparos todavía</dt><dd></dd>';
};
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const alternarPanel = () => document.body.classList.toggle('con-panel');
if (params.has('panel')) alternarPanel();
addEventListener('keydown', (e) => {
  if (e.key === 'd' || e.key === 'D') alternarPanel();
  if (e.key === 'f' || e.key === 'F') pantallaCompleta();
});
panel.querySelector('.cerrar').addEventListener('click', alternarPanel);
panel.querySelector('.csv').addEventListener('click', () => {
  const lineas = ['fecha,regla,disparos'];
  for (const [dia, porRegla] of Object.entries(conteo)) {
    for (const [regla, n] of Object.entries(porRegla)) lineas.push(dia + ',"' + regla.replace(/"/g, '""') + '",' + n);
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([lineas.join('\n')], { type: 'text/csv' }));
  a.download = 'activador-disparos.csv';
  a.click();
});
panel.querySelector('.borrar').addEventListener('click', () => {
  if (!confirm('¿Borrar el conteo de disparos de este equipo?')) return;
  conteo = {};
  try { localStorage.removeItem(CLAVE_CONTEO); } catch { /* sin almacenamiento */ }
});

// Pantalla completa con doble clic o la tecla F; el puntero se oculta si no se mueve
const pantallaCompleta = () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
};
escenario.addEventListener('dblclick', pantallaCompleta);
let quieto;
addEventListener('pointermove', () => {
  document.body.classList.remove('sin-puntero');
  clearTimeout(quieto);
  quieto = setTimeout(() => document.body.classList.add('sin-puntero'), 3000);
});

// ---------- Arranque ----------
// Se precargan las imágenes para que los cambios sean inmediatos
for (const e of Object.values(config.escenas)) for (const src of [e.src, e.imagen]) if (src && e.tipo !== 'video') new Image().src = src;

iniciarEntradas(s, escenario);
const hayCuestionarios = Object.values(config.escenas).some(leerCuestionario);
const usaObjetos = hayCuestionarios || usa('personas', 'cerca', 'vehiculos');
const usaGestos = hayCuestionarios || usa('gesto');
if (params.get('camara') !== '0' && (usaObjetos || usaGestos || usa('movimiento'))) {
  iniciarCamara(s, config.camara, { objetos: usaObjetos, gestos: usaGestos });
}
if (usa('temperaturaMin', 'temperaturaMax', 'lluvia', 'uvMin') || /\{temp\}/.test(JSON.stringify(config.escenas))) {
  iniciarClima(s, config.ubicacion);
}
if (usa('sonido')) iniciarSonido(s);

s.fecha = reloj();
siguienteDeTanda();
setInterval(paso, 100);

// ---------- Conexión con el panel ----------
if (nube) {
  // "Mostrar ahora" desde el panel: entra como un evento de prioridad máxima
  nube.alMostrar((id) => {
    const e = config.escenas[id];
    if (!e) return;
    const t = e.duracion || 10;
    if (evento) cerrar(performance.now());
    abrir({ nombre: 'Desde el panel', mostrar: [id], indice: 0, prioridad: 1000, minimo: t, maximo: t, mantener: 0, enfriamiento: 0 }, performance.now());
  });
  // Solo números: nunca se envían imágenes
  const estado = () => ({
    escena: config.escenas[escenaActual]?.nombre || escenaActual,
    regla: evento?.regla.nombre || null,
    camara: s.camara.estado,
    personas: s.personas,
    cercania: Math.round(s.cercania * 100) / 100,
    vehiculos: s.vehiculos,
    gesto: s.gesto,
    temperatura: s.clima?.temperatura ?? null,
    lluvia: s.clima?.lluvia ?? null,
  });
  nube.latido(estado());
  setInterval(() => nube.latido(estado()), 60000);
  setInterval(() => nube.estadoEnVivo(estado()), 2000);
}
setInterval(() => { pintarPanel(); escenario.querySelectorAll('.capa').forEach(pintarTextos); }, 200);
