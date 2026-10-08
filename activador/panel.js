// Activador · panel de administración (Supabase, proyecto sunsignal)
import { crearCliente, canalDe } from './nube.js';

const sb = await crearCliente();
const BUCKET = 'activador';

// ---------- Utilidades ----------
const $ = (sel, raiz = document) => raiz.querySelector(sel);
const el = (tag, props = {}, ...hijos) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k in e && !k.includes('-')) e[k] = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const h of hijos.flat()) if (h != null && h !== false) e.append(h instanceof Node ? h : String(h));
  return e;
};
// Un <select> con sus opciones ya cargadas: [[valor, texto], ...] o grupos { 'Grupo': [[valor, texto]] }
const selector = (opciones, valor, alCambiar, props = {}) => {
  const s = el('select', { ...props, onchange: (ev) => alCambiar?.(ev.target.value) });
  const agregar = (padre, lista) => lista.forEach(([v, t]) => padre.append(el('option', { value: String(v) }, t)));
  if (Array.isArray(opciones)) agregar(s, opciones);
  else {
    for (const [grupo, lista] of Object.entries(opciones)) {
      if (!grupo) { agregar(s, lista); continue; }
      const g = el('optgroup', { label: grupo });
      agregar(g, lista);
      s.append(g);
    }
  }
  if (valor != null) s.value = String(valor);
  return s;
};
let notaTimer;
const nota = (texto, error = false) => {
  const n = $('#nota');
  n.textContent = texto;
  n.className = 'nota' + (error ? ' error' : '');
  n.hidden = false;
  clearTimeout(notaTimer);
  notaTimer = setTimeout(() => { n.hidden = true; }, error ? 6000 : 3000);
};
const fallo = (error, contexto) => {
  console.error(contexto, error);
  nota((contexto ? contexto + ': ' : '') + (error?.message || error), true);
};
const plural = (n, uno, varios) => n + ' ' + (n === 1 ? uno : varios);
const haceCuanto = (fecha) => {
  const min = Math.round((Date.now() - Date.parse(fecha)) / 60000);
  if (min < 60) return 'hace ' + plural(min, 'minuto', 'minutos');
  const h = Math.round(min / 60);
  if (h < 48) return 'hace ' + plural(h, 'hora', 'horas');
  return 'hace ' + plural(Math.round(h / 24), 'día', 'días');
};

// ---------- Datos ----------
const datos = { escenas: [], pantallas: [], reglas: [], vivo: {} };
const canales = new Map();
const escenaPorId = (id) => datos.escenas.find((e) => e.id === id);
const nombresEscenas = (ids) => ids.map((id) => escenaPorId(id)?.nombre || '(borrado)').join(', ');

async function cargar() {
  const [e, p, r] = await Promise.all([
    sb.from('activador_escenas').select('*').order('creado'),
    sb.from('activador_pantallas').select('*').order('creado'),
    sb.from('activador_reglas').select('*').order('prioridad', { ascending: false }),
  ]);
  const error = e.error || p.error || r.error;
  if (error) return fallo(error, 'No se pudieron cargar los datos');
  datos.escenas = e.data; datos.pantallas = p.data; datos.reglas = r.data;
  conectarCanales();
  pintarPantallas();
  pintarEscenas();
  pintarReglas();
  pintarFiltroPantallas();
}

// Canal en vivo con cada pantalla: recibe su estado y le manda órdenes
const enVivo = new Set(); // claves con el canal abierto
function conectarCanales() {
  for (const p of datos.pantallas) {
    if (canales.has(p.clave)) continue;
    const canal = sb.channel(canalDe(p.clave))
      .on('broadcast', { event: 'estado' }, ({ payload }) => { datos.vivo[p.id] = { ...payload, t: Date.now() }; })
      .subscribe((estado) => { if (estado === 'SUBSCRIBED') enVivo.add(p.clave); else enVivo.delete(p.clave); });
    canales.set(p.clave, canal);
  }
}
// pantallas: lista de pantallas o null para todas
function avisar(pantallas, evento, payload = {}) {
  for (const p of pantallas || datos.pantallas) canales.get(p.clave)?.send({ type: 'broadcast', event: evento, payload });
}
// El latido de cada pantalla queda en la base: se relee cada 30 s por si no hay conexión en vivo
setInterval(async () => {
  if ($('#app').hidden || !datos.pantallas.length) return;
  const { data } = await sb.from('activador_pantallas').select('id, visto, estado');
  for (const f of data || []) Object.assign(datos.pantallas.find((p) => p.id === f.id) || {}, f);
}, 30000);
const pantallasDeRegla = (r) => (r.pantalla_id ? datos.pantallas.filter((p) => p.id === r.pantalla_id) : null);

// ---------- Acceso ----------
const avisoAcceso = $('#avisoAcceso');
const traducir = (m = '') => {
  if (/invalid login/i.test(m)) return 'Mail o contraseña incorrectos.';
  if (/not confirmed/i.test(m)) return 'Todavía no confirmaste tu mail: revisá tu correo.';
  if (/already registered/i.test(m)) return 'Ese mail ya tiene cuenta. Probá entrar u "Olvidé mi contraseña".';
  if (/password.*(6|characters)/i.test(m)) return 'La contraseña tiene que tener al menos 6 caracteres.';
  if (/rate limit/i.test(m)) return 'Demasiados intentos. Esperá unos minutos.';
  return m;
};
const mostrarAviso = (texto, error = false) => { avisoAcceso.textContent = texto; avisoAcceso.className = 'aviso' + (error ? ' error' : ''); };
const datosAcceso = () => {
  const f = $('#formAcceso');
  return { email: f.email.value.trim().toLowerCase(), password: f.clave.value };
};

$('#formAcceso').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  mostrarAviso('Entrando…');
  const { data, error } = await sb.auth.signInWithPassword(datosAcceso());
  if (error) return mostrarAviso(traducir(error.message), true);
  entrar(data.session);
});
$('#crearCuenta').addEventListener('click', async () => {
  const f = $('#formAcceso');
  if (!f.reportValidity()) return;
  mostrarAviso('Creando la cuenta…');
  const { data, error } = await sb.auth.signUp({ ...datosAcceso(), options: { emailRedirectTo: location.href.split('#')[0] } });
  if (error) return mostrarAviso(traducir(error.message), true);
  if (data.session) return entrar(data.session);
  mostrarAviso('Listo. Te mandamos un mail para confirmar la cuenta: tocá el enlace y después volvé acá a entrar.');
});
$('#olvide').addEventListener('click', async () => {
  const { email } = datosAcceso();
  if (!email) return mostrarAviso('Escribí tu mail arriba y volvé a tocar "Olvidé mi contraseña".', true);
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.href.split('#')[0] });
  if (error) return mostrarAviso(traducir(error.message), true);
  mostrarAviso('Te mandamos un mail para elegir una contraseña nueva.');
});
const salir = async () => { await sb.auth.signOut(); location.reload(); };
$('#salir').addEventListener('click', salir);
$('#salirSinPermiso').addEventListener('click', salir);

sb.auth.onAuthStateChange((evento) => {
  if (evento === 'PASSWORD_RECOVERY') setTimeout(pedirClaveNueva, 0);
});
function pedirClaveNueva() {
  const clave = el('input', { type: 'password', minLength: 6, required: true, autocomplete: 'new-password' });
  abrirDialogo('Elegí una contraseña nueva', [el('label', {}, 'Contraseña nueva', clave)], {
    textoGuardar: 'Cambiar contraseña',
    alGuardar: async () => {
      const { error } = await sb.auth.updateUser({ password: clave.value });
      if (error) { nota(traducir(error.message), true); return false; }
      nota('Contraseña cambiada.');
    },
  });
}

let miMail = '';
async function entrar(sesion) {
  miMail = sesion.user.email.toLowerCase();
  $('#acceso').hidden = true;
  const { data, error } = await sb.from('activador_editores').select('email').eq('email', miMail);
  if (error || !data.length) {
    $('#mailSinPermiso').textContent = miMail;
    $('#sinPermiso').hidden = false;
    return;
  }
  $('#miMail').textContent = miMail;
  $('#app').hidden = false;
  abrirPestana(location.hash.slice(1) || 'pantallas');
  await cargar();
}

// ---------- Pestañas ----------
function abrirPestana(nombre) {
  if (!$('[data-seccion="' + nombre + '"]')) nombre = 'pantallas';
  document.querySelectorAll('[data-pestana]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.pestana === nombre)));
  document.querySelectorAll('[data-seccion]').forEach((s) => { s.hidden = s.dataset.seccion !== nombre; });
  history.replaceState(null, '', '#' + nombre);
  if (nombre === 'estadisticas') cargarEstadisticas();
  if (nombre === 'equipo') cargarEquipo();
}
document.querySelectorAll('[data-pestana]').forEach((b) => b.addEventListener('click', () => abrirPestana(b.dataset.pestana)));

// ---------- Diálogo ----------
function abrirDialogo(titulo, cuerpo, { alGuardar, alBorrar, textoGuardar = 'Guardar' }) {
  const dlg = $('#dialogo');
  const form = $('#formDialogo');
  const guardar = el('button', { type: 'submit', class: 'boton primario' }, textoGuardar);
  form.replaceChildren(
    el('h2', {}, titulo),
    ...cuerpo,
    el('div', { class: 'botones' },
      alBorrar ? el('button', { type: 'button', class: 'boton peligro', onclick: async () => { if (await alBorrar()) dlg.close(); } }, 'Borrar') : el('span'),
      el('div', {},
        el('button', { type: 'button', class: 'boton', onclick: () => dlg.close() }, 'Cancelar'),
        guardar)),
  );
  form.onsubmit = async (ev) => {
    ev.preventDefault();
    guardar.disabled = true;
    try {
      if ((await alGuardar()) !== false) dlg.close();
    } catch (e) {
      fallo(e, 'No se pudo guardar');
    } finally {
      guardar.disabled = false;
    }
  };
  dlg.showModal();
}

// ---------- Miniaturas ----------
const EJEMPLO = { saludo: 'Buenas tardes', hora: '18:30', temp: '24', personas: '3', vehiculos: '5', ciudad: 'Montevideo' };
const ejemplo = (t) => String(t ?? '').replace(/\{(\w+)\}/g, (m, k) => EJEMPLO[k] ?? m);
const esClaro = (fondo) => /^#?f{3}(f{3})?$/i.test((fondo || '').trim());
function miniatura(e) {
  const claro = e?.tipo === 'mensaje' && esClaro(e.fondo);
  const m = el('div', { class: 'mini' + (claro ? ' claro' : '') });
  if (!e) return m;
  if (e.tipo === 'imagen') m.append(el('img', { src: e.src, alt: '', loading: 'lazy' }));
  else if (e.tipo === 'video') m.append(el('video', { src: e.src + '#t=0.5', muted: true, preload: 'metadata', playsInline: true }));
  else {
    if (e.fondo && !claro) m.style.background = e.fondo;
    if (e.imagen) m.append(el('img', { src: e.imagen, alt: '', loading: 'lazy' }));
    m.append(
      el('div', { class: 'mini-texto' }, el('b', {}, ejemplo(e.titulo)), el('i', {}, ejemplo(e.texto))),
      el('img', { class: 'marca-agua', src: claro ? '../assets/logo-color.png' : '../assets/logo-blanco.png', alt: '' }),
    );
  }
  return m;
}

// Lista de contenidos que se puede ordenar (rotación de una pantalla, contenidos de una regla)
function listaOrdenable(ids, alCambiar) {
  const raiz = el('div', { class: 'lista-orden' });
  const cambio = () => { pintar(); alCambiar?.(); };
  const pintar = () => {
    const ol = el('ol');
    ids.forEach((id, i) => {
      const e = escenaPorId(id);
      ol.append(el('li', {},
        miniatura(e),
        el('span', {}, e ? e.nombre : '(contenido borrado)'),
        el('button', { type: 'button', class: 'icono', title: 'Subir', 'aria-label': 'Subir', disabled: i === 0, onclick: () => { [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]]; cambio(); } }, '↑'),
        el('button', { type: 'button', class: 'icono', title: 'Bajar', 'aria-label': 'Bajar', disabled: i === ids.length - 1, onclick: () => { [ids[i + 1], ids[i]] = [ids[i], ids[i + 1]]; cambio(); } }, '↓'),
        el('button', { type: 'button', class: 'icono', title: 'Quitar', 'aria-label': 'Quitar', onclick: () => { ids.splice(i, 1); cambio(); } }, '✕'),
      ));
    });
    const agregar = selector([['', '+ Agregar contenido…'], ...datos.escenas.map((e) => [e.id, e.nombre])], '', (id) => {
      if (id) { ids.push(id); cambio(); }
    }, { 'aria-label': 'Agregar contenido' });
    raiz.replaceChildren(ids.length ? ol : el('p', { class: 'vacia' }, 'Sin contenidos todavía.'), agregar);
  };
  pintar();
  return raiz;
}

// ---------- Pantallas ----------
const CIUDADES = [
  ['Montevideo', -34.9011, -56.1645], ['Ciudad de la Costa', -34.8167, -55.95], ['Las Piedras', -34.7302, -56.2191],
  ['Canelones', -34.5228, -56.2778], ['Punta del Este', -34.962, -54.9505], ['Maldonado', -34.9, -54.95],
  ['Piriápolis', -34.8667, -55.2833], ['La Paloma', -34.6667, -54.1667], ['Rocha', -34.4833, -54.3333],
  ['Colonia del Sacramento', -34.4626, -57.84], ['Salto', -31.3833, -57.9667], ['Paysandú', -32.3214, -58.0756],
  ['Rivera', -30.9053, -55.5508], ['Tacuarembó', -31.7333, -55.9833], ['Artigas', -30.4, -56.4667],
  ['Mercedes', -33.2524, -58.0305], ['Fray Bentos', -33.1325, -58.2956], ['Durazno', -33.3806, -56.5236],
  ['Florida', -34.0956, -56.2142], ['San José de Mayo', -34.3375, -56.7136], ['Trinidad', -33.5165, -56.8993],
  ['Minas', -34.3759, -55.2377], ['Treinta y Tres', -33.2333, -54.3833], ['Melo', -32.3667, -54.1833],
];
const vivos = new Map(); // id de pantalla → elementos que se actualizan en vivo

function pintarPantallas() {
  const cont = $('#listaPantallas');
  vivos.clear();
  cont.replaceChildren(...(datos.pantallas.length
    ? datos.pantallas.map(tarjetaPantalla)
    : [el('div', { class: 'vacio' }, 'Todavía no hay pantallas. Creá la primera con "Nueva pantalla".')]));
}

function tarjetaPantalla(p) {
  const borrador = { nombre: p.nombre, ciudad: p.ciudad, lat: p.lat, lon: p.lon, tanda: [...p.tanda] };
  const enlace = new URL('index.html?pantalla=' + p.clave, location.href).href;
  const guardar = el('button', { class: 'boton primario', disabled: true }, 'Guardar cambios');
  const marcar = () => { guardar.disabled = false; };

  const ciudades = CIUDADES.some(([c]) => c === p.ciudad) ? CIUDADES : [[p.ciudad, p.lat, p.lon], ...CIUDADES];
  const ciudad = selector(ciudades.map(([c]) => [c, c]), p.ciudad, (c) => {
    const [nombre, lat, lon] = ciudades.find(([n]) => n === c);
    Object.assign(borrador, { ciudad: nombre, lat, lon });
    marcar();
  });

  let escenaAhora = datos.escenas[0]?.id || '';
  const mostrarAhora = el('div', { class: 'mostrar-ahora' },
    selector(datos.escenas.map((e) => [e.id, e.nombre]), escenaAhora, (id) => { escenaAhora = id; }, { 'aria-label': 'Contenido para mostrar ahora' }),
    el('button', { class: 'boton', onclick: () => {
      if (!escenaAhora) return;
      if (!enVivo.has(p.clave)) return nota('No hay conexión en vivo con las pantallas: puede que la red bloquee WebSockets.', true);
      avisar([p], 'mostrar', { escena: escenaAhora });
      nota('Enviado a "' + p.nombre + '".');
    } }, 'Mostrar ahora'));

  guardar.addEventListener('click', async () => {
    if (!borrador.nombre.trim()) return nota('La pantalla necesita un nombre.', true);
    if (!borrador.tanda.length) return nota('La rotación no puede quedar vacía.', true);
    guardar.disabled = true;
    const { error } = await sb.from('activador_pantallas').update({ ...borrador, nombre: borrador.nombre.trim() }).eq('id', p.id);
    if (error) { guardar.disabled = false; return fallo(error, 'No se pudo guardar'); }
    avisar([p], 'recargar');
    nota('Guardado. La pantalla se actualiza sola.');
    cargar();
  });

  const estado = el('span', { class: 'estado' });
  const vivo = el('div', { class: 'en-vivo' });
  vivos.set(p.id, { p, estado, vivo });
  pintarVivo(p, estado, vivo);

  return el('article', { class: 'tarjeta pantalla' },
    el('div', { class: 'pantalla-cabeza' },
      el('input', { class: 'nombre', value: p.nombre, 'aria-label': 'Nombre de la pantalla', oninput: (ev) => { borrador.nombre = ev.target.value; marcar(); } }),
      estado),
    vivo,
    el('div', { class: 'pantalla-grilla' },
      el('label', { class: 'ancho' }, 'Enlace para abrir en la pantalla',
        el('div', { class: 'enlace-pantalla' },
          el('input', { value: enlace, readOnly: true, onfocus: (ev) => ev.target.select() }),
          el('button', { type: 'button', class: 'boton', onclick: async () => {
            try { await navigator.clipboard.writeText(enlace); nota('Enlace copiado.'); } catch { nota('No se pudo copiar: seleccionalo y copialo a mano.', true); }
          } }, 'Copiar'),
          el('button', { type: 'button', class: 'boton', onclick: () => open(enlace, '_blank') }, 'Abrir'))),
      el('label', {}, 'Ciudad (para el clima)', ciudad),
      el('div'),
      el('div', { class: 'ancho' },
        el('label', {}, 'Rotación normal: lo que pasa cuando no se dispara ninguna regla'),
        listaOrdenable(borrador.tanda, marcar))),
    el('div', { class: 'pie-pantalla' },
      mostrarAhora,
      el('div', { class: 'acciones' },
        el('button', { class: 'boton peligro', onclick: () => borrarPantalla(p) }, 'Borrar'),
        guardar)));
}

function pintarVivo(p, estadoEl, vivoEl) {
  const ahora = Date.now();
  const v = datos.vivo[p.id];
  const fresco = v && ahora - v.t < 10000;
  const enLinea = fresco || (p.visto && ahora - Date.parse(p.visto) < 120000);
  estadoEl.className = 'estado' + (enLinea ? ' en-linea' : '');
  estadoEl.textContent = enLinea ? 'En línea' : p.visto ? 'Sin conexión · ' + haceCuanto(p.visto) : 'Nunca se conectó';
  const info = fresco ? v : p.estado;
  if (!info) { vivoEl.replaceChildren(el('span', {}, 'Abrí el enlace en el equipo de la pantalla para conectarla.')); return; }
  const partes = [
    el('span', {}, 'Mostrando: ', el('strong', {}, info.escena || '–'), info.regla ? ' · por "' + info.regla + '"' : ''),
    el('span', {}, 'Personas: ', el('strong', {}, info.personas ?? 0)),
  ];
  if (info.temperatura != null) partes.push(el('span', {}, 'Clima: ', el('strong', {}, info.temperatura + '°' + (info.lluvia ? ' · lluvia' : ''))));
  if (info.camara && info.camara !== 'ok') partes.push(el('span', {}, 'Cámara: ', el('strong', {}, info.camara)));
  if (!fresco) partes.push(el('span', {}, '(último dato recibido)'));
  vivoEl.replaceChildren(...partes);
}
setInterval(() => vivos.forEach(({ p, estado, vivo }) => pintarVivo(p, estado, vivo)), 2000);

$('#nuevaPantalla').addEventListener('click', async () => {
  const { error } = await sb.from('activador_pantallas').insert({
    nombre: 'Pantalla nueva ' + (datos.pantallas.length + 1),
    tanda: datos.escenas.slice(0, 5).map((e) => e.id),
  });
  if (error) return fallo(error, 'No se pudo crear la pantalla');
  nota('Pantalla creada. Abrí su enlace en el equipo de la pantalla.');
  cargar();
});

async function borrarPantalla(p) {
  if (!confirm('¿Borrar "' + p.nombre + '"? También se borran sus estadísticas y las reglas que son solo de esta pantalla. El enlace deja de funcionar.')) return;
  const { error } = await sb.from('activador_pantallas').delete().eq('id', p.id);
  if (error) return fallo(error, 'No se pudo borrar');
  canales.get(p.clave)?.unsubscribe();
  canales.delete(p.clave);
  nota('Pantalla borrada.');
  cargar();
}

// ---------- Contenidos ----------
const TIPOS = { imagen: 'Imagen', video: 'Video', mensaje: 'Mensaje' };
function usos(id) {
  const pantallas = datos.pantallas.filter((p) => p.tanda.includes(id)).length;
  const reglas = datos.reglas.filter((r) => r.escenas.includes(id)).length;
  if (!pantallas && !reglas) return 'Sin usar';
  return 'En ' + [pantallas && plural(pantallas, 'rotación', 'rotaciones'), reglas && plural(reglas, 'regla', 'reglas')].filter(Boolean).join(' y ');
}
function pintarEscenas() {
  const cont = $('#listaEscenas');
  cont.replaceChildren(...(datos.escenas.length
    ? datos.escenas.map((e) => el('button', { type: 'button', class: 'tarjeta escena', onclick: () => editarEscena(e) },
      miniatura(e),
      el('span', { class: 'escena-info' },
        el('strong', {}, e.nombre),
        el('small', {}, TIPOS[e.tipo] + ' · ' + (e.duracion ? e.duracion + ' s' : 'hasta que termina')),
        el('small', {}, usos(e.id)))))
    : [el('div', { class: 'vacio' }, 'Todavía no hay contenidos. Subí fotos o videos, o creá un mensaje.')]));
}

const limpiarNombre = (n) => n.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '-').slice(-80);
async function subirArchivos(archivos) {
  const aviso = $('#avisoSubida');
  let subidos = 0;
  for (const [i, f] of [...archivos].entries()) {
    const tipo = f.type.startsWith('image/') ? 'imagen' : f.type.startsWith('video/') ? 'video' : null;
    if (!tipo) { nota('"' + f.name + '" no es una foto ni un video.', true); continue; }
    aviso.textContent = 'Subiendo ' + (i + 1) + ' de ' + archivos.length + ': ' + f.name + '…';
    const ruta = crypto.randomUUID() + '-' + limpiarNombre(f.name);
    const { error } = await sb.storage.from(BUCKET).upload(ruta, f, { contentType: f.type, cacheControl: '31536000' });
    if (error) {
      fallo(/size|large|413/i.test(error.message) ? 'El archivo es demasiado grande.' : error, 'No se pudo subir "' + f.name + '"');
      continue;
    }
    const src = sb.storage.from(BUCKET).getPublicUrl(ruta).data.publicUrl;
    const { error: e2 } = await sb.from('activador_escenas').insert({
      nombre: f.name.replace(/\.[^.]+$/, ''), tipo, src, duracion: tipo === 'imagen' ? 8 : null,
    });
    if (e2) { fallo(e2, 'No se pudo guardar "' + f.name + '"'); continue; }
    subidos++;
  }
  aviso.textContent = '';
  if (subidos) { nota(plural(subidos, 'archivo subido', 'archivos subidos') + '. Sumalos a una rotación o a una regla.'); cargar(); }
}
$('#subir').addEventListener('change', (ev) => { subirArchivos(ev.target.files); ev.target.value = ''; });
const zona = $('[data-seccion="contenidos"]');
zona.addEventListener('dragover', (ev) => { ev.preventDefault(); zona.classList.add('soltar'); });
zona.addEventListener('dragleave', (ev) => { if (!zona.contains(ev.relatedTarget)) zona.classList.remove('soltar'); });
zona.addEventListener('drop', (ev) => { ev.preventDefault(); zona.classList.remove('soltar'); subirArchivos(ev.dataTransfer.files); });

$('#nuevoMensaje').addEventListener('click', () => editarEscena({ tipo: 'mensaje', nombre: '', titulo: '', texto: '', fondo: null, imagen: null, duracion: 8 }));

function editarEscena(e) {
  const b = { ...e };
  const previa = el('div', { class: 'vista-previa' });
  const repintar = () => previa.replaceChildren(miniatura(b));
  const campo = (etiqueta, clave, props = {}, tag = 'input') => el('label', {}, etiqueta,
    el(tag, { value: b[clave] ?? '', ...props, oninput: (ev) => { b[clave] = ev.target.value; repintar(); } }));

  const cuerpo = [campo('Nombre (para reconocerlo en el panel)', 'nombre', { required: true, placeholder: 'Ej.: Promo verano' })];
  if (b.tipo === 'mensaje') {
    const fotos = datos.escenas.filter((x) => x.tipo === 'imagen').map((x) => [x.src, x.nombre]);
    if (b.imagen && !fotos.some(([src]) => src === b.imagen)) fotos.unshift([b.imagen, 'Foto actual']);
    cuerpo.push(
      campo('Título', 'titulo', { placeholder: 'Ej.: ¡{saludo}!' }),
      campo('Texto', 'texto', { placeholder: 'Ej.: Hoy hacen {temp}° en {ciudad}' }, 'textarea'),
      el('p', { class: 'ayuda' }, 'Datos que se completan solos: {saludo} {hora} {temp} {ciudad} {personas}'),
      el('div', { class: 'dos' },
        el('label', {}, 'Color de fondo', selector([['', 'Naranja (letras blancas)'], ['#ffffff', 'Blanco (letras naranjas)']], esClaro(b.fondo) ? '#ffffff' : '', (v) => { b.fondo = v || null; repintar(); })),
        el('label', {}, 'Foto de fondo', selector([['', 'Sin foto'], ...fotos], b.imagen || '', (v) => { b.imagen = v || null; repintar(); }))),
      el('p', { class: 'ayuda' }, 'Para usar una foto de fondo, primero subila en Contenidos.'),
    );
  }
  const duracion = el('input', { type: 'number', min: 1, max: 600, step: 1, value: b.duracion ?? '', disabled: b.tipo === 'video' && !b.duracion, oninput: (ev) => { b.duracion = ev.target.value ? Number(ev.target.value) : null; } });
  cuerpo.push(el('div', { class: 'dos' },
    el('label', {}, 'Duración en pantalla (segundos)', duracion),
    b.tipo === 'video' ? el('label', { class: 'check' }, el('input', { type: 'checkbox', checked: !b.duracion, onchange: (ev) => {
      duracion.disabled = ev.target.checked;
      b.duracion = ev.target.checked ? null : Number(duracion.value) || 15;
      duracion.value = b.duracion ?? '';
    } }), 'Hasta que termine el video') : el('span')));
  cuerpo.push(previa);
  repintar();

  abrirDialogo(e.id ? 'Editar contenido' : 'Nuevo mensaje', cuerpo, {
    alBorrar: e.id ? () => borrarEscena(e) : null,
    alGuardar: async () => {
      if (!b.nombre?.trim()) { nota('Ponele un nombre.', true); return false; }
      if (b.tipo === 'mensaje' && !b.titulo?.trim() && !b.texto?.trim()) { nota('El mensaje necesita un título o un texto.', true); return false; }
      const fila = { nombre: b.nombre.trim(), titulo: b.titulo || null, texto: b.texto || null, fondo: b.fondo || null, imagen: b.imagen || null, duracion: b.duracion || null };
      if (b.tipo !== 'video' && !fila.duracion) fila.duracion = 8;
      const { error } = e.id
        ? await sb.from('activador_escenas').update(fila).eq('id', e.id)
        : await sb.from('activador_escenas').insert({ ...fila, tipo: 'mensaje' });
      if (error) { fallo(error, 'No se pudo guardar'); return false; }
      if (e.id) avisar(null, 'recargar');
      nota(e.id ? 'Guardado. Las pantallas se actualizan solas.' : 'Mensaje creado. Sumalo a una rotación o a una regla.');
      cargar();
    },
  });
}

async function borrarEscena(e) {
  if (!confirm('¿Borrar "' + e.nombre + '"? Se quita de todas las rotaciones y reglas.')) return false;
  const cambios = [
    ...datos.pantallas.filter((p) => p.tanda.includes(e.id))
      .map((p) => sb.from('activador_pantallas').update({ tanda: p.tanda.filter((x) => x !== e.id) }).eq('id', p.id)),
    ...datos.reglas.filter((r) => r.escenas.includes(e.id))
      .map((r) => sb.from('activador_reglas').update({ escenas: r.escenas.filter((x) => x !== e.id) }).eq('id', r.id)),
  ];
  const errores = (await Promise.all(cambios)).filter((r) => r.error);
  if (errores.length) { fallo(errores[0].error, 'No se pudo quitar de las rotaciones'); return false; }
  const { error } = await sb.from('activador_escenas').delete().eq('id', e.id);
  if (error) { fallo(error, 'No se pudo borrar'); return false; }
  // Si el archivo se subió desde el panel, también se borra del almacenamiento
  const marca = '/storage/v1/object/public/' + BUCKET + '/';
  if (e.src?.includes(marca)) await sb.storage.from(BUCKET).remove([decodeURIComponent(e.src.split(marca)[1])]);
  avisar(null, 'recargar');
  nota('Contenido borrado.');
  cargar();
  return true;
}

// ---------- Reglas ----------
const DIAS = [[1, 'Lun'], [2, 'Mar'], [3, 'Mié'], [4, 'Jue'], [5, 'Vie'], [6, 'Sáb'], [0, 'Dom']];
const DIAS_LARGOS = { 0: 'domingo', 1: 'lunes', 2: 'martes', 3: 'miércoles', 4: 'jueves', 5: 'viernes', 6: 'sábado' };
const conY = (lista) => (lista.length > 1 ? lista.slice(0, -1).join(', ') + ' o ' + lista.at(-1) : lista[0] || '');
const textoOpcion = (opciones, v) => opciones.find(([o]) => String(o) === String(v))?.[1] ?? v;

const CONDICIONES = {
  personas: { grupo: 'Cámara', nombre: 'Hay personas', campo: 'numero', def: 1, min: 1, sufijo: 'o más', frase: (v) => 'hay ' + plural(v, 'persona', 'personas') + (v > 1 ? ' o más' : '') },
  cerca: { grupo: 'Cámara', nombre: 'Alguien se acerca', campo: 'opciones', def: 0.5,
    opciones: [[0.3, 'a unos 3 metros'], [0.5, 'a 1 o 2 metros'], [0.75, 'a menos de 1 metro']], frase: (v, c) => 'alguien está ' + textoOpcion(c.opciones, v) },
  gesto: { grupo: 'Cámara', nombre: 'Gesto con la mano', campo: 'opciones', def: 'Open_Palm',
    opciones: [['Open_Palm', 'mano abierta (saludo)'], ['Thumb_Up', 'pulgar arriba'], ['Thumb_Down', 'pulgar abajo'], ['Victory', 'dedos en V'], ['Pointing_Up', 'dedo hacia arriba'], ['Closed_Fist', 'puño cerrado'], ['ILoveYou', 'mano 🤟']],
    frase: (v, c) => 'alguien hace ' + textoOpcion(c.opciones, v) },
  vehiculos: { grupo: 'Cámara', nombre: 'Hay vehículos', campo: 'numero', def: 4, min: 1, sufijo: 'o más', frase: (v) => 'hay ' + plural(v, 'vehículo', 'vehículos') + ' o más' },
  movimiento: { grupo: 'Cámara', nombre: 'Hay movimiento', campo: 'opciones', def: 0.08,
    opciones: [[0.03, 'poco'], [0.08, 'normal'], [0.15, 'mucho']], frase: (v, c) => 'hay ' + textoOpcion(c.opciones, v) + ' movimiento' },
  horario: { grupo: 'Hora y clima', nombre: 'Horario', campo: 'horario', def: ['18:00', '21:00'], frase: (v) => 'es entre las ' + v[0] + ' y las ' + v[1] },
  dias: { grupo: 'Hora y clima', nombre: 'Días de la semana', campo: 'dias', def: [1, 2, 3, 4, 5], frase: (v) => 'es ' + conY(DIAS.filter(([d]) => v.includes(d)).map(([d]) => DIAS_LARGOS[d])) },
  temperaturaMin: { grupo: 'Hora y clima', nombre: 'Hace calor', campo: 'numero', def: 26, sufijo: '° o más', frase: (v) => 'hacen ' + v + '° o más' },
  temperaturaMax: { grupo: 'Hora y clima', nombre: 'Hace frío', campo: 'numero', def: 10, sufijo: '° o menos', frase: (v) => 'hacen ' + v + '° o menos' },
  lluvia: { grupo: 'Hora y clima', nombre: 'Lluvia', campo: 'opciones', def: true, opciones: [[true, 'llueve'], [false, 'no llueve']], frase: (v) => (v ? 'llueve' : 'no llueve') },
  uvMin: { grupo: 'Hora y clima', nombre: 'Índice UV alto', campo: 'numero', def: 8, min: 1, sufijo: 'o más', frase: (v) => 'el índice UV es ' + v + ' o más' },
  sonido: { grupo: 'Interacción', nombre: 'Ruido (micrófono)', campo: 'opciones', def: 0.5,
    opciones: [[0.3, 'hay ruido'], [0.5, 'hay mucho ruido'], [0.7, 'hay un ruido muy fuerte']], frase: (v, c) => textoOpcion(c.opciones, v) },
  tecla: { grupo: 'Interacción', nombre: 'Tecla o botón físico', campo: 'texto', def: '1', frase: (v) => 'se aprieta la tecla "' + v + '"' },
  toque: { grupo: 'Interacción', nombre: 'Toque en la pantalla', campo: 'fijo', def: true, frase: () => 'alguien toca la pantalla' },
};
const fraseCondiciones = (cuando) => Object.entries(cuando).map(([k, v]) => {
  const c = CONDICIONES[k];
  return c ? c.frase(v, c) : k + ' = ' + JSON.stringify(v);
});
const opcionesCondiciones = () => {
  const grupos = {};
  for (const [k, c] of Object.entries(CONDICIONES)) (grupos[c.grupo] ??= []).push([k, c.nombre]);
  return grupos;
};

function pintarReglas() {
  const tarjeta = (r) => {
    const frases = fraseCondiciones(r.cuando);
    const donde = r.pantalla_id ? (datos.pantallas.find((p) => p.id === r.pantalla_id)?.nombre || 'Pantalla borrada') : 'Todas las pantallas';
    const meta = [donde, 'prioridad ' + r.prioridad];
    if (r.modo === 'mostrar' && r.enfriamiento) meta.push('no se repite antes de ' + r.enfriamiento + ' s');
    return el('article', { class: 'tarjeta regla' + (r.activa ? '' : ' apagada') },
      el('label', { class: 'interruptor', title: r.activa ? 'Encendida' : 'Apagada' },
        el('input', { type: 'checkbox', checked: r.activa, 'aria-label': 'Encender o apagar "' + r.nombre + '"', onchange: async (ev) => {
          const { error } = await sb.from('activador_reglas').update({ activa: ev.target.checked }).eq('id', r.id);
          if (error) return fallo(error, 'No se pudo cambiar');
          avisar(pantallasDeRegla(r), 'recargar');
          nota(ev.target.checked ? 'Regla encendida.' : 'Regla apagada.');
          cargar();
        } }),
        el('span')),
      el('div', { class: 'regla-texto' },
        el('strong', {}, r.nombre),
        el('p', {}, 'Cuando ', ...frases.flatMap((f, i) => [i ? ' y ' : '', el('b', {}, f)]),
          r.modo === 'mostrar' ? ' → muestra ' : ' → rota ', el('b', {}, nombresEscenas(r.escenas) || 'nada (elegí un contenido)')),
        el('span', { class: 'regla-meta' }, meta.join(' · '))),
      el('div', { class: 'regla-acciones' },
        el('button', { class: 'boton chico', onclick: () => editarRegla(r) }, 'Editar')));
  };
  const lista = (modo, id, vacio) => {
    const reglas = datos.reglas.filter((r) => r.modo === modo);
    $(id).replaceChildren(...(reglas.length ? reglas.map(tarjeta) : [el('div', { class: 'vacio' }, vacio)]));
  };
  lista('mostrar', '#reglasEventos', 'Sin reglas de este tipo. Ej.: "cuando alguien se acerca, mostrar la promo".');
  lista('tanda', '#reglasContextos', 'Sin reglas de este tipo. Ej.: "cuando llueve, rotar los avisos de lluvia".');
}

function editorValor(c, fila) {
  if (c.campo === 'numero') {
    return [el('input', { type: 'number', value: fila.v, min: c.min, step: 1, oninput: (ev) => { fila.v = Number(ev.target.value); } }), c.sufijo || ''];
  }
  if (c.campo === 'opciones') {
    return [selector(c.opciones, fila.v, (v) => { fila.v = c.opciones.find(([o]) => String(o) === v)[0]; })];
  }
  if (c.campo === 'horario') {
    const hora = (i) => el('input', { type: 'time', value: fila.v[i], required: true, oninput: (ev) => { fila.v[i] = ev.target.value; } });
    return ['de', hora(0), 'a', hora(1)];
  }
  if (c.campo === 'dias') {
    return [el('div', { class: 'dias' }, ...DIAS.map(([d, t]) => el('label', {},
      el('input', { type: 'checkbox', checked: fila.v.includes(d), onchange: (ev) => {
        fila.v = ev.target.checked ? [...fila.v, d] : fila.v.filter((x) => x !== d);
      } }), t)))];
  }
  if (c.campo === 'texto') {
    return [el('input', { value: fila.v, maxLength: 1, required: true, style: 'width:60px', oninput: (ev) => { fila.v = ev.target.value.toLowerCase(); } }),
      el('span', { class: 'ayuda' }, 'una tecla, número o letra')];
  }
  return [el('span', { class: 'ayuda' }, 'no necesita nada más')];
}

function editorCondiciones(cuando) {
  const filas = Object.entries(cuando).map(([k, v]) => ({ k, v: structuredClone(v) }));
  const raiz = el('div', { class: 'lista-orden' });
  const pintar = () => {
    const usadas = new Set(filas.map((f) => f.k));
    const nuevas = {};
    for (const [g, lista] of Object.entries(opcionesCondiciones())) {
      const libres = lista.filter(([k]) => !usadas.has(k));
      if (libres.length) nuevas[g] = libres;
    }
    raiz.replaceChildren(
      ...filas.map((f, i) => {
        const c = CONDICIONES[f.k];
        return el('div', { class: 'condicion' },
          selector(opcionesCondiciones(), f.k, (k) => { f.k = k; f.v = structuredClone(CONDICIONES[k].def); pintar(); }, { 'aria-label': 'Condición' }),
          el('div', { class: 'valor' }, ...(c ? editorValor(c, f) : [JSON.stringify(f.v)])),
          el('button', { type: 'button', class: 'icono', title: 'Quitar condición', 'aria-label': 'Quitar condición', onclick: () => { filas.splice(i, 1); pintar(); } }, '✕'));
      }),
      Object.keys(nuevas).length ? selector({ '': [['', '+ Agregar condición…']], ...nuevas }, '', (k) => {
        if (k) { filas.push({ k, v: structuredClone(CONDICIONES[k].def) }); pintar(); }
      }, { 'aria-label': 'Agregar condición' }) : '',
    );
  };
  pintar();
  return { raiz, valor: () => Object.fromEntries(filas.map((f) => [f.k, f.v])) };
}

function editarRegla(r) {
  const b = r
    ? { ...r, escenas: [...r.escenas] }
    : { nombre: '', pantalla_id: null, cuando: { personas: 1 }, modo: 'mostrar', escenas: [], prioridad: 20, durante: 1, enfriamiento: 30, minimo: 4, maximo: 20, mantener: 2, activa: true };
  const condiciones = editorCondiciones(b.cuando);
  const numero = (etiqueta, clave, ayuda, props = {}) => el('label', {}, etiqueta,
    el('input', { type: 'number', min: 0, step: 'any', value: b[clave], required: true, ...props, oninput: (ev) => { b[clave] = Number(ev.target.value); } }),
    el('span', { class: 'ayuda' }, ayuda));
  const soloEventos = el('div', { class: 'tres' },
    numero('Mínimo en pantalla (s)', 'minimo', 'aunque la condición deje de cumplirse'),
    numero('Máximo en pantalla (s)', 'maximo', 'aunque la condición siga'),
    numero('Se queda después (s)', 'mantener', 'cuando la condición termina'),
    numero('No repetir antes de (s)', 'enfriamiento', 'para que no aparezca todo el tiempo'),
    numero('Confirmar durante (s)', 'durante', 'evita disparos por un instante'));
  const modo = (valor, titulo, ayuda) => el('label', {},
    el('input', { type: 'radio', name: 'modo', value: valor, checked: b.modo === valor, onchange: () => { b.modo = valor; soloEventos.hidden = valor !== 'mostrar'; } }),
    el('span', {}, titulo, el('small', {}, ayuda)));
  soloEventos.hidden = b.modo !== 'mostrar';

  abrirDialogo(r ? 'Editar regla' : 'Nueva regla', [
    el('div', { class: 'dos' },
      el('label', {}, 'Nombre', el('input', { value: b.nombre, required: true, placeholder: 'Ej.: Persona cerca', oninput: (ev) => { b.nombre = ev.target.value; } })),
      el('label', {}, 'En qué pantallas', selector([['', 'Todas las pantallas'], ...datos.pantallas.map((p) => [p.id, p.nombre])], b.pantalla_id || '', (v) => { b.pantalla_id = v || null; }))),
    el('label', {}, 'Cuando…'),
    condiciones.raiz,
    el('p', { class: 'ayuda' }, 'Si ponés varias condiciones, se tienen que cumplir todas a la vez.'),
    el('div', { class: 'opciones-modo' },
      modo('mostrar', 'Interrumpir y mostrar en el momento', 'Corta lo que se está viendo. Ideal para la cámara, botones y toques.'),
      modo('tanda', 'Cambiar la rotación mientras se cumpla', 'No corta nada: cambia lo que va pasando. Ideal para horario y clima.')),
    el('label', {}, 'Contenidos'),
    listaOrdenable(b.escenas),
    el('details', {},
      el('summary', {}, 'Ajustes avanzados'),
      el('div', { class: 'tres' },
        numero('Prioridad', 'prioridad', 'si se cumplen varias, gana la más alta', { step: 1 })),
      soloEventos),
    el('label', { class: 'check' }, el('input', { type: 'checkbox', checked: b.activa, onchange: (ev) => { b.activa = ev.target.checked; } }), 'Regla encendida'),
  ], {
    alBorrar: r ? async () => {
      if (!confirm('¿Borrar la regla "' + r.nombre + '"?')) return false;
      const { error } = await sb.from('activador_reglas').delete().eq('id', r.id);
      if (error) { fallo(error, 'No se pudo borrar'); return false; }
      avisar(pantallasDeRegla(r), 'recargar');
      nota('Regla borrada.');
      cargar();
      return true;
    } : null,
    alGuardar: async () => {
      const cuando = condiciones.valor();
      if (!b.nombre.trim()) { nota('Ponele un nombre a la regla.', true); return false; }
      if (!Object.keys(cuando).length) { nota('Agregá al menos una condición.', true); return false; }
      if ('dias' in cuando && !cuando.dias.length) { nota('Elegí al menos un día.', true); return false; }
      if (!b.escenas.length) { nota('Elegí al menos un contenido.', true); return false; }
      const fila = {
        nombre: b.nombre.trim(), pantalla_id: b.pantalla_id, cuando, modo: b.modo, escenas: b.escenas, activa: b.activa,
        prioridad: Math.round(b.prioridad), durante: b.durante, enfriamiento: b.enfriamiento, minimo: b.minimo, maximo: Math.max(b.maximo, b.minimo), mantener: b.mantener,
      };
      const { error } = r
        ? await sb.from('activador_reglas').update(fila).eq('id', r.id)
        : await sb.from('activador_reglas').insert(fila);
      if (error) { fallo(error, 'No se pudo guardar'); return false; }
      // Si cambió de pantalla, se avisa a la anterior y a la nueva
      avisar(r?.pantalla_id && r.pantalla_id !== fila.pantalla_id ? null : pantallasDeRegla(fila), 'recargar');
      nota('Regla guardada. Las pantallas se actualizan solas.');
      cargar();
    },
  });
}
$('#nuevaRegla').addEventListener('click', () => editarRegla(null));

// ---------- Estadísticas ----------
const ZONA = 'America/Montevideo';
const hoyUy = () => new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(new Date());
const sumarDias = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const fechaCorta = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString('es-UY', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
let filasEstadisticas = [];

function pintarFiltroPantallas() {
  const actual = $('#filtroPantalla').value;
  const nuevo = selector([['', 'Todas'], ...datos.pantallas.map((p) => [p.id, p.nombre])], actual, cargarEstadisticas, { id: 'filtroPantalla' });
  if (![...nuevo.options].some((o) => o.value === actual)) nuevo.value = '';
  $('#filtroPantalla').replaceWith(nuevo);
}
$('#filtroDias').addEventListener('change', cargarEstadisticas);

async function cargarEstadisticas() {
  const dias = Number($('#filtroDias').value);
  const hasta = hoyUy();
  const desde = sumarDias(hasta, -(dias - 1));
  let consulta = sb.from('activador_disparos_por_dia').select('*').gte('dia', desde);
  const pantalla = $('#filtroPantalla').value;
  if (pantalla) consulta = consulta.eq('pantalla_id', pantalla);
  const { data, error } = await consulta;
  if (error) return fallo(error, 'No se pudieron cargar las estadísticas');
  filasEstadisticas = data;

  const porDia = new Map();
  for (let i = 0; i < dias; i++) porDia.set(sumarDias(desde, i), 0);
  const porRegla = new Map();
  let total = 0;
  for (const f of data) {
    total += f.disparos;
    porDia.set(f.dia, (porDia.get(f.dia) || 0) + f.disparos);
    porRegla.set(f.regla, (porRegla.get(f.regla) || 0) + f.disparos);
  }
  const reglas = [...porRegla].sort((a, b) => b[1] - a[1]);
  const cont = $('#estadisticas');
  if (!total) {
    cont.replaceChildren(el('div', { class: 'vacio' }, 'Todavía no hay disparos en este período. Aparecen acá cuando una pantalla conectada dispara una regla.'));
    return;
  }
  const maxDia = Math.max(...porDia.values(), 1);
  const maxRegla = reglas[0][1];
  const columnas = el('div', { class: 'columnas', role: 'img', 'aria-label': 'Disparos por día' },
    ...[...porDia].map(([dia, n]) => {
      const c = el('div', { tabIndex: 0, 'aria-label': fechaCorta(dia) + ': ' + plural(n, 'disparo', 'disparos') },
        el('i', { style: 'height:' + (n / maxDia) * 100 + '%' }));
      const mostrar = () => tooltip(c, fechaCorta(dia) + ' · ' + plural(n, 'disparo', 'disparos'));
      c.addEventListener('mouseenter', mostrar);
      c.addEventListener('focus', mostrar);
      c.addEventListener('mouseleave', ocultarTooltip);
      c.addEventListener('blur', ocultarTooltip);
      return c;
    }));
  const nombrePantalla = (id) => datos.pantallas.find((p) => p.id === id)?.nombre || 'Pantalla borrada';
  const tabla = [...data].sort((a, b) => b.dia.localeCompare(a.dia) || b.disparos - a.disparos);

  cont.replaceChildren(
    el('div', { class: 'indicadores' },
      el('div', { class: 'tarjeta indicador' }, el('small', {}, 'Disparos'), el('strong', {}, total.toLocaleString('es-UY')), el('span', {}, 'en ' + plural(dias, 'día', 'días'))),
      el('div', { class: 'tarjeta indicador' }, el('small', {}, 'Promedio por día'), el('strong', {}, (total / dias).toLocaleString('es-UY', { maximumFractionDigits: 1 })), el('span', {}, 'disparos')),
      el('div', { class: 'tarjeta indicador' }, el('small', {}, 'La que más se disparó'), el('strong', { style: 'font-size:20px' }, reglas[0][0]), el('span', {}, plural(reglas[0][1], 'vez', 'veces')))),
    el('div', { class: 'tarjeta grafico' },
      el('h4', {}, 'Disparos por día'),
      columnas,
      el('div', { class: 'eje-x' }, el('span', {}, fechaCorta(desde)), el('span', {}, fechaCorta(hasta)))),
    el('div', { class: 'tarjeta grafico' },
      el('h4', {}, 'Disparos por regla'),
      el('div', { class: 'barras' }, ...reglas.flatMap(([regla, n]) => [
        el('span', { title: regla }, regla),
        el('div', {}, el('i', { style: 'width:' + Math.max((n / maxRegla) * 80, 0.5) + '%' }), n.toLocaleString('es-UY')),
      ]))),
    el('details', { class: 'tarjeta grafico' },
      el('summary', {}, 'Ver tabla'),
      el('table', { class: 'tabla' },
        el('thead', {}, el('tr', {}, el('th', {}, 'Día'), el('th', {}, 'Pantalla'), el('th', {}, 'Regla'), el('th', {}, 'Disparos'))),
        el('tbody', {}, ...tabla.map((f) => el('tr', {},
          el('td', {}, fechaCorta(f.dia)), el('td', {}, nombrePantalla(f.pantalla_id)), el('td', {}, f.regla), el('td', {}, f.disparos)))))),
  );
}
function tooltip(objetivo, texto) {
  const t = $('#tooltip');
  const r = objetivo.getBoundingClientRect();
  t.textContent = texto;
  t.hidden = false;
  const ancho = t.offsetWidth / 2 + 8;
  t.style.left = Math.min(Math.max(r.left + r.width / 2, ancho), innerWidth - ancho) + 'px';
  t.style.top = r.top + r.height - (objetivo.firstChild?.offsetHeight || 0) + 'px';
}
const ocultarTooltip = () => { $('#tooltip').hidden = true; };

$('#descargarCsv').addEventListener('click', () => {
  if (!filasEstadisticas.length) return nota('No hay datos para descargar en este período.', true);
  const nombrePantalla = (id) => datos.pantallas.find((p) => p.id === id)?.nombre || 'Pantalla borrada';
  const celda = (t) => '"' + String(t).replace(/"/g, '""') + '"';
  const lineas = ['dia,pantalla,regla,disparos', ...filasEstadisticas.map((f) => [f.dia, celda(nombrePantalla(f.pantalla_id)), celda(f.regla), f.disparos].join(','))];
  const a = el('a', { href: URL.createObjectURL(new Blob(['﻿' + lineas.join('\n')], { type: 'text/csv' })), download: 'activador-disparos-' + hoyUy() + '.csv' });
  a.click();
});

// ---------- Equipo ----------
async function cargarEquipo() {
  const { data, error } = await sb.from('activador_editores').select('email').order('email');
  if (error) return fallo(error, 'No se pudo cargar el equipo');
  $('#listaEquipo').replaceChildren(...data.map(({ email }) => el('li', { class: 'tarjeta' },
    el('span', {}, email),
    email === miMail ? el('span', { class: 'ayuda' }, 'vos') : el('button', { class: 'boton chico peligro', onclick: async () => {
      if (!confirm('¿Quitarle el acceso a ' + email + '?')) return;
      const { error: e } = await sb.from('activador_editores').delete().eq('email', email);
      if (e) return fallo(e, 'No se pudo quitar');
      cargarEquipo();
    } }, 'Quitar'))));
}
$('#formEquipo').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const email = ev.target.email.value.trim().toLowerCase();
  const { error } = await sb.from('activador_editores').insert({ email });
  if (error) return fallo(/duplicate/i.test(error.message) ? 'Ese mail ya está en el equipo.' : error, 'No se pudo agregar');
  ev.target.reset();
  nota('Agregado. Ahora esa persona tiene que tocar "Crear cuenta" con ese mail.');
  cargarEquipo();
});

// ---------- Arranque ----------
const { data: { session } } = await sb.auth.getSession();
if (session) entrar(session);
else $('#acceso').hidden = false;
