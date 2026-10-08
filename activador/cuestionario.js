import { pintarPresentacion, prepararPresentacion } from './presentacion-veocasas.js';
// Cuestionarios guardados como mensajes: compatibles con las tablas existentes.
export const MARCA = 'activador:cuestionario:v1\n';
export const GESTOS = ['Pointing_Up', 'Victory', 'Thumb_Up', 'Open_Palm'];
export const GESTOS_RESPUESTA = ['Open_Palm', 'Victory'];
export const ICONOS = ['☝️', '✌️', '👍', '🖐️'];
export const ICONOS_RESPUESTA = ['🖐️', '✌️'];
export function inmobiliario() {
  const ciudades = ['Mercedes', 'Montevideo', 'Colonia', 'Paysandú'];
  // Filtros comprobados en el buscador público de Veocasas (2026-10-08).
  // Colonia corresponde a Colonia del Sacramento.
  const enlaces = {
    "Mercedes": "https://veocasas.com/propiedades?location=17&neighborhoods=2134a58b-307b-498d-8ec2-fde9b7791f2f",
    "Montevideo": "https://veocasas.com/propiedades?location=1",
    "Colonia": "https://veocasas.com/propiedades?location=5&neighborhoods=b0132850-8866-474b-9aff-8b91376f8e6d",
    "Paysandú": "https://veocasas.com/propiedades?location=11&neighborhoods=ec42c906-78ff-4915-96c6-0b208e90b059"
};
  return {
    version: 1, titulo: 'Tu próximo hogar puede empezar acá.', invitacion: 'Acercate. Elegí. Descubrí.',
    pregunta: '¿Estás pensando en mudarte?', destino: '¿Dónde te gustaría vivir?',
    despedida: 'Cuando quieras dar el paso, te esperamos.',
    espera: 25, resultado: 20, sostener: 0.8,
    ciudades: ciudades.map(nombre => ({ nombre, titulo: 'Tu próximo hogar te espera en ' + nombre + '.',
      texto: 'Escaneá el QR y mirá las propiedades disponibles en Veocasas.',
      url: enlaces[nombre] })),
  };
}
export function leerCuestionario(escena) {
  if (escena?.tipo !== 'mensaje' || !escena.texto?.startsWith(MARCA)) return null;
  try { return validarCuestionario(JSON.parse(escena.texto.slice(MARCA.length))); } catch { return null; }
}
export function validarCuestionario(c) {
  if (!c || c.version !== 1 || !Array.isArray(c.ciudades) || c.ciudades.length !== 4) throw new Error('Se necesitan cuatro destinos.');
  for (const k of ['titulo', 'invitacion', 'pregunta', 'destino', 'despedida']) if (typeof c[k] !== 'string' || !c[k].trim()) throw new Error('Completá los textos del cuestionario.');
  for (const k of ['espera', 'resultado', 'sostener']) if (!Number.isFinite(c[k]) || c[k] < (k === 'sostener' ? 0.3 : 3) || c[k] > (k === 'sostener' ? 3 : 120)) throw new Error('Revisá los tiempos del cuestionario.');
  for (const d of c.ciudades) {
    if (!d.nombre?.trim() || !d.titulo?.trim() || typeof d.texto !== 'string') throw new Error('Completá cada destino.');
    if (d.url === '') continue;
    const u = new URL(d.url);
    if (u.protocol !== 'https:' || u.username || u.password || d.url.length > 1000) throw new Error('Usá enlaces HTTPS de hasta 1000 caracteres, sin credenciales.');
  }
  return c;
}
export function enlaceResultado(destino, pantalla) {
  const u = new URL(destino.url);
  u.searchParams.set('utm_source', 'activador');
  u.searchParams.set('utm_medium', 'qr');
  u.searchParams.set('utm_campaign', 'inmobiliario');
  u.searchParams.set('utm_content', pantalla || 'local');
  u.searchParams.set('utm_term', destino.nombre);
  return u.href;
}

export function crearCuestionario({ raiz, senales, pantalla, registrar, terminar }) {
  let ciudadResultado = null;
  let actual = null, estado = '', limite = 0, gesto = null, desde = 0, bloqueado = false, liberando = 0, ausencia = 0;
  const elemento = (tag, texto, clase) => { const e = document.createElement(tag); e.textContent = texto; if (clase) e.className = clase; return e; };
  function pintar(titulo, texto, opciones = []) {
    const iconos = estado === 'destino' ? ICONOS : ICONOS_RESPUESTA;
    if (actual.presentacion === 'veocasas') {
      pintarPresentacion({ raiz, estado, titulo, texto, opciones, responder, iconos, ciudad: ciudadResultado });
      return;
    }
    raiz.replaceChildren();
    const capa = elemento('section', '', 'capa visible escena-cuestionario');
    const logo = document.createElement('img'); logo.src = '../assets/logo-blanco.png'; logo.alt = 'Movimagen'; logo.className = 'quiz-logo';
    capa.append(logo, elemento('p', estado === 'invitacion' ? 'Una experiencia para vos' : estado === 'mudanza' ? 'Pregunta 1 de 2' : estado === 'destino' ? 'Pregunta 2 de 2' : 'Tu próximo paso', 'quiz-paso'), elemento('h1', titulo), elemento('p', texto, 'quiz-texto'));
    const lista = elemento('div', '', 'quiz-opciones');
    opciones.forEach((nombre, i) => { const b = elemento('button', '', 'quiz-opcion'); b.type = 'button'; b.append(elemento('span', iconos[i], 'quiz-gesto'), elemento('strong', nombre), elemento('small', 'Tecla ' + (i + 1))); b.addEventListener('click', () => responder(i)); lista.append(b); });
    capa.append(lista);
    const progreso = document.createElement('progress'); progreso.max = 1; progreso.value = 0; progreso.className = 'quiz-progreso'; progreso.setAttribute('aria-label', 'Tiempo sosteniendo el gesto'); progreso.hidden = estado === 'resultado'; capa.append(progreso);
    capa.append(elemento('p', opciones.length ? 'Sostené el gesto para elegir. También podés tocar una opción.' : '', 'quiz-ayuda'));
    raiz.append(capa);
  }
  function cambiar(paso) {
    estado = paso; gesto = null; desde = 0; ausencia = 0;
    limite = performance.now() + actual.espera * 1000;
    if (paso === 'mudanza') pintar(actual.pregunta, 'Elegí tu respuesta', ['Sí, quiero mudarme', 'Por ahora no']);
    if (paso === 'destino') pintar(actual.destino, 'Elegí una ciudad', actual.ciudades.map(d => d.nombre));
  }
  function responder(i) {
    if (!actual) return;
    bloqueado = true; liberando = 0; gesto = null;
    if (estado === 'invitacion' && i === 0) { registrar('Cuestionario · inicio'); cambiar('mudanza'); }
    else if (estado === 'mudanza' && i < 2) {
      registrar('Cuestionario · mudanza · ' + (i === 0 ? 'sí' : 'no'));
      if (i === 0) cambiar('destino');
      else { estado = 'resultado'; limite = performance.now() + actual.resultado * 1000; pintar(actual.despedida, 'Gracias por participar.'); }
    } else if (estado === 'destino' && i < 4) {
      const d = actual.ciudades[i]; ciudadResultado = d.nombre; registrar('Cuestionario · destino · ' + d.nombre);
      estado = 'resultado'; limite = performance.now() + actual.resultado * 1000;
      pintar(d.titulo, actual.presentacion === 'veocasas' ? 'Encontrá propiedades para vos.' : d.texto);
      if (!d.url) { raiz.firstChild.append(elemento('p', 'El enlace de Veocasas para esta ciudad todavía no está configurado.', 'quiz-ayuda')); return; }
      const url = enlaceResultado(d, pantalla);
      const qr = window.qrcode(0, 'M'); qr.addData(url); qr.make();
      const enlace = document.createElement('a'); enlace.href = url; enlace.target = '_blank'; enlace.rel = 'noopener'; enlace.className = 'quiz-qr'; enlace.setAttribute('aria-label', 'Consultar por ' + d.nombre);
      // SVG producido localmente por la biblioteca QR, nunca HTML de usuario.
      enlace.innerHTML = qr.createSvgTag({ cellSize: 5, margin: 20, scalable: true });
      const qrCont = raiz.querySelector('.quiz-resultado-qr');
      if (qrCont) qrCont.prepend(enlace);
      else raiz.firstChild.append(enlace, elemento('p', 'Escaneá para consultar · ' + d.nombre, 'quiz-ayuda'));
      registrar('Cuestionario · QR mostrado · ' + d.nombre);
    }
  }
  const tecla = e => {
    if (!actual || e.repeat || e.target.closest('input,textarea,select')) return;
    if (e.key === 'Escape') { cerrar(); return; }
    if (/^[1-4]$/.test(e.key)) { e.preventDefault(); responder(Number(e.key) - 1); }
  };
  addEventListener('keydown', tecla);
  function cerrar() { if (!actual) return; actual = null; estado = ''; senales.teclas = {}; senales.toque = -Infinity; terminar(); }
  return {
    abrir(c) { if (c.presentacion === 'veocasas') prepararPresentacion(); ciudadResultado = null; actual = c; estado = 'invitacion'; limite = performance.now() + 18000; bloqueado = true; liberando = 0; ausencia = 0; gesto = null; desde = 0; pintar(c.titulo, c.invitacion, ['Empezar']); },
    cancelar() { actual = null; estado = ''; },
    get activa() { return !!actual; },
    paso(ahora) {
      if (!actual) return false;
      if (ahora >= limite) { registrar('Cuestionario · ' + (estado === 'resultado' ? 'fin' : 'tiempo agotado')); cerrar(); return true; }
      if (estado === 'invitacion' && senales.cercania >= 0.45) { registrar('Cuestionario · inicio'); cambiar('mudanza'); bloqueado = true; }
      if (['mudanza', 'destino'].includes(estado)) {
        if (senales.camara.estado === 'ok' && senales.personas === 0) { ausencia ||= ahora; if (ahora - ausencia > 8000) { registrar('Cuestionario · abandono'); cerrar(); return true; } } else ausencia = 0;
      }
      const g = senales.gesto;
      if (bloqueado) { if (!g) { liberando ||= ahora; if (ahora - liberando >= 350) bloqueado = false; } else liberando = 0; }
      else if (g && ['invitacion', 'mudanza', 'destino'].includes(estado)) {
        const gestos = estado === 'destino' ? GESTOS : GESTOS_RESPUESTA;
        const i = gestos.indexOf(g), cantidad = estado === 'destino' ? 4 : estado === 'mudanza' ? 2 : 1;
        if (i >= 0 && i < cantidad) {
          if (g !== gesto) { gesto = g; desde = ahora; }
          const tiempo = (ahora - desde) / (actual.sostener * 1000);
          const barra = raiz.querySelector('progress'); if (barra) barra.value = Math.min(1, tiempo);
          if (tiempo >= 1) { responder(i); bloqueado = true; liberando = 0; gesto = null; }
        } else { gesto = null; const barra = raiz.querySelector('progress'); if (barra) barra.value = 0; }
      } else { gesto = null; const barra = raiz.querySelector('progress'); if (barra) barra.value = 0; }
      return true;
    },
  };
}
