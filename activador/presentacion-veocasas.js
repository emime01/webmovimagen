// Placas aprobadas de la muestra: los controles se superponen en el lienzo 9:16.
// El QR ilustrativo queda completamente cubierto por el QR real del reproductor.
const BASE = './assets/veocasas/';
let precargadas = false;
export function prepararPresentacion() {
  if (precargadas) return;
  precargadas = true;
  for (const archivo of ['01-invitacion', '02-pregunta', '03-ciudades', '04-resultado-mercedes']) {
    const img = new Image(); img.src = BASE + archivo + '.webp';
  }
}
export function pintarPresentacion({ raiz, estado, titulo, texto, opciones, responder, iconos, ciudad }) {
  raiz.replaceChildren();
  const capa = document.createElement('section');
  capa.className = 'capa visible escena-cuestionario quiz-presentacion';
  const placa = document.createElement('div'); placa.className = 'quiz-placa quiz-' + estado;
  const imagenes = { invitacion: '01-invitacion', mudanza: '02-pregunta', destino: '03-ciudades', resultado: '04-resultado-mercedes' };
  if (estado !== 'resultado' || ciudad) {
    const imagen = document.createElement('img'); imagen.src = BASE + imagenes[estado] + '.webp'; imagen.alt = ''; imagen.className = 'quiz-arte'; placa.append(imagen);
  } else {
    const logo = document.createElement('img'); logo.src = BASE + 'logo.webp'; logo.alt = 'Veocasas'; logo.className = 'quiz-marca'; placa.append(logo);
  }
  const encabezado = document.createElement('div'); encabezado.className = estado === 'resultado' ? 'quiz-resultado-titulo' : 'quiz-accessible';
  const h1 = document.createElement('h1'); h1.textContent = titulo;
  const p = document.createElement('p'); p.textContent = texto;
  encabezado.append(h1, p); placa.append(encabezado);
  const lista = document.createElement('div'); lista.className = 'quiz-opciones';
  opciones.forEach((nombre, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'quiz-opcion quiz-hit';
    b.setAttribute('aria-label', nombre + ' · ' + iconos[i] + ' · tecla ' + (i + 1));
    const label = document.createElement('span'); label.className = 'quiz-accessible'; label.textContent = nombre; b.append(label);
    b.addEventListener('click', () => responder(i)); lista.append(b);
  });
  placa.append(lista);
  const barra = document.createElement('progress'); barra.max = 1; barra.value = 0; barra.className = 'quiz-progreso'; barra.hidden = estado === 'resultado'; barra.setAttribute('aria-label', 'Tiempo sosteniendo el gesto'); placa.append(barra);
  if (estado === 'resultado' && ciudad) {
    const resultado = document.createElement('div'); resultado.className = 'quiz-resultado-qr';
    const detalles = document.createElement('div'); detalles.className = 'quiz-resultado-detalles';
    const tituloQr = document.createElement('strong'); tituloQr.textContent = 'Escaneá y explorá ' + ciudad;
    const marca = document.createElement('p'); marca.textContent = 'Propiedades en Veocasas'; detalles.append(tituloQr, marca); resultado.append(detalles); placa.append(resultado);
  }
  capa.append(placa); raiz.append(capa);
}
