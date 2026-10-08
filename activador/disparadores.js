// Activador · fuentes de señales
// Cada fuente escribe en el objeto "s" (señales) y el motor lo lee varias veces por segundo.
// Las imágenes de la cámara y el sonido del micrófono se procesan en memoria, en este equipo:
// no se graban ni se envían a ningún lado.

const MEDIAPIPE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.0';
const MODELOS = {
  objetos: 'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite',
  gestos: 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
};
const VEHICULOS = ['car', 'bus', 'truck', 'motorcycle', 'bicycle'];

export function crearSenales() {
  return {
    fecha: new Date(),
    // Cámara
    camara: { estado: 'apagada', video: null, cajas: [], manos: [] },
    movimiento: 0,
    personas: 0,
    cercania: 0,
    vehiculos: 0,
    gesto: null,
    // Contexto
    clima: null,
    climaEstado: 'apagado',
    // Interacción
    sonido: 0,
    sonidoEstado: 'apagado',
    teclas: {},
    toque: -Infinity,
  };
}

// ---------- Cámara ----------
// usa: { objetos, gestos } según lo que pidan las reglas activas
export async function iniciarCamara(s, op, usa) {
  const cam = s.camara;
  cam.estado = 'pidiendo permiso';
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      audio: false,
    });
  } catch (e) {
    cam.estado = 'sin cámara (' + e.name + ')';
    return;
  }
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.srcObject = stream;
  await video.play();
  cam.video = video;
  cam.estado = 'ok';

  // Movimiento: diferencia entre cuadros sobre una imagen chica en escala de grises
  const lienzo = document.createElement('canvas');
  lienzo.width = 64; lienzo.height = 48;
  const ctx = lienzo.getContext('2d', { willReadFrequently: true });
  let previo = null;
  const medirMovimiento = () => {
    ctx.drawImage(video, 0, 0, 64, 48);
    const px = ctx.getImageData(0, 0, 64, 48).data;
    const gris = new Uint8Array(64 * 48);
    for (let i = 0; i < gris.length; i++) gris[i] = (px[i * 4] * 3 + px[i * 4 + 1] * 6 + px[i * 4 + 2]) / 10;
    if (previo) {
      let cambian = 0;
      for (let i = 0; i < gris.length; i++) if (Math.abs(gris[i] - previo[i]) > 25) cambian++;
      s.movimiento = s.movimiento * 0.6 + (cambian / gris.length) * 0.4;
    }
    previo = gris;
  };

  // Modelos (se cargan en segundo plano; mientras tanto funciona el movimiento)
  let detector = null, reconocedor = null;
  if (usa.objetos || usa.gestos) {
    cam.estado = 'cargando modelos';
    cargarModelos(op, usa).then((m) => {
      detector = m.detector; reconocedor = m.reconocedor;
      cam.estado = 'ok';
    }).catch((e) => {
      console.warn('Activador: no se pudieron cargar los modelos', e);
      cam.estado = 'ok (solo movimiento: no cargaron los modelos)';
    });
  }

  const historial = { personas: [], vehiculos: [] };
  const mediana = (lista, valor) => {
    lista.push(valor);
    if (lista.length > 5) lista.shift();
    return [...lista].sort((a, b) => a - b)[Math.floor(lista.length / 2)];
  };

  let turno = 0;
  const ciclo = () => {
    if (video.readyState >= 2) {
      medirMovimiento();
      const ahora = performance.now();
      // Si están los dos modelos, se alternan para no cargar el equipo
      const tocaGestos = reconocedor && (!detector || turno++ % 2 === 1);
      if (detector && !tocaGestos) {
        const r = detector.detectForVideo(video, ahora);
        const alto = video.videoHeight || 480;
        const ancho = video.videoWidth || 640;
        cam.cajas = r.detections.map((d) => ({
          tipo: d.categories[0].categoryName,
          puntaje: d.categories[0].score,
          x: d.boundingBox.originX / ancho, y: d.boundingBox.originY / alto,
          w: d.boundingBox.width / ancho, h: d.boundingBox.height / alto,
        }));
        const personas = cam.cajas.filter((c) => c.tipo === 'person');
        s.personas = mediana(historial.personas, personas.length);
        s.vehiculos = mediana(historial.vehiculos, cam.cajas.filter((c) => VEHICULOS.includes(c.tipo)).length);
        // Cercanía: qué parte del alto del cuadro ocupa la persona más grande
        s.cercania = personas.reduce((max, c) => Math.max(max, c.h), 0);
      }
      if (tocaGestos) {
        const r = reconocedor.recognizeForVideo(video, ahora);
        const g = r.gestures.map((lista) => lista[0]).find((c) => c && c.categoryName !== 'None' && c.score > 0.6);
        s.gesto = g ? g.categoryName : null;
        cam.manos = r.landmarks;
      }
    }
    setTimeout(ciclo, 1000 / op.fps);
  };
  ciclo();
}

async function cargarModelos(op, usa) {
  const { FilesetResolver, ObjectDetector, GestureRecognizer } = await import(MEDIAPIPE + '/vision_bundle.mjs');
  const archivos = await FilesetResolver.forVisionTasks(MEDIAPIPE + '/wasm');
  // Se intenta con la placa de video y, si falla, con el procesador
  const crear = async (Clase, opciones) => {
    try {
      return await Clase.createFromOptions(archivos, { ...opciones, baseOptions: { ...opciones.baseOptions, delegate: 'GPU' } });
    } catch {
      return Clase.createFromOptions(archivos, { ...opciones, baseOptions: { ...opciones.baseOptions, delegate: 'CPU' } });
    }
  };
  const [detector, reconocedor] = await Promise.all([
    usa.objetos ? crear(ObjectDetector, {
      baseOptions: { modelAssetPath: MODELOS.objetos },
      runningMode: 'VIDEO',
      scoreThreshold: op.confianza,
      maxResults: 15,
      categoryAllowlist: ['person', ...VEHICULOS],
    }) : null,
    usa.gestos ? crear(GestureRecognizer, {
      baseOptions: { modelAssetPath: MODELOS.gestos },
      runningMode: 'VIDEO',
      numHands: 2,
    }) : null,
  ]);
  return { detector, reconocedor };
}

// ---------- Clima (Open-Meteo, gratis y sin clave) ----------
export function iniciarClima(s, ubicacion) {
  const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + ubicacion.lat + '&longitude=' + ubicacion.lon +
    '&current=temperature_2m,precipitation,weather_code,uv_index,is_day&timezone=auto';
  const consultar = async () => {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const c = (await r.json()).current;
      // Códigos de lluvia, llovizna, chaparrones y tormenta (WMO)
      const llueve = c.precipitation > 0 || (c.weather_code >= 51 && c.weather_code <= 67) || c.weather_code >= 80;
      s.clima = { ...s.clima, temperatura: Math.round(c.temperature_2m), lluvia: llueve, uv: c.uv_index, dia: c.is_day === 1, ...s.climaForzado };
      s.climaEstado = 'ok · ' + new Date().toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      s.climaEstado = 'sin datos (' + e.message + ')';
      if (s.climaForzado) s.clima = { ...s.climaForzado };
    }
  };
  consultar();
  setInterval(consultar, 15 * 60 * 1000);
}

// ---------- Sonido (nivel del micrófono) ----------
export async function iniciarSonido(s) {
  s.sonidoEstado = 'pidiendo permiso';
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
  } catch (e) {
    s.sonidoEstado = 'sin micrófono (' + e.name + ')';
    return;
  }
  const audio = new AudioContext();
  const analizador = audio.createAnalyser();
  analizador.fftSize = 1024;
  audio.createMediaStreamSource(stream).connect(analizador);
  const datos = new Float32Array(analizador.fftSize);
  // Algunos navegadores arrancan el audio en pausa hasta que alguien toca la pantalla
  const reanudar = () => audio.state === 'suspended' && audio.resume();
  addEventListener('pointerdown', reanudar);
  addEventListener('keydown', reanudar);
  reanudar();
  s.sonidoEstado = 'ok';
  setInterval(() => {
    analizador.getFloatTimeDomainData(datos);
    let suma = 0;
    for (const v of datos) suma += v * v;
    const nivel = Math.min(1, Math.sqrt(suma / datos.length) * 5);
    s.sonido = nivel > s.sonido ? nivel : s.sonido * 0.85 + nivel * 0.15;
  }, 50);
}

// ---------- Teclas y toques ----------
// Las botoneras USB, pedales y placas tipo Arduino que se comportan como teclado entran por acá.
export function iniciarEntradas(s, escenario) {
  addEventListener('keydown', (e) => {
    if (e.repeat || e.target.closest('input, textarea, select')) return;
    s.teclas[e.key.toLowerCase()] = performance.now();
  });
  escenario.addEventListener('pointerdown', () => { s.toque = performance.now(); });
}
