// Activador · contenidos y reglas
//
// ESCENAS: lo que se puede mostrar en pantalla.
//   tipo "imagen":  { src, duracion }
//   tipo "video":   { src, duracion }   (sin duracion, pasa a la siguiente al terminar el video)
//   tipo "mensaje": { titulo, texto, imagen?, fondo?, duracion }
// En títulos y textos se pueden usar {saludo}, {hora}, {temp}, {personas} y {vehiculos}.
//
// TANDA: la rotación que se ve cuando no pasa nada.
//
// REGLAS: qué dispara qué. Todas las condiciones de "cuando" se tienen que cumplir a la vez.
//   Con "mostrar" la regla es un EVENTO: interrumpe la tanda en el momento.
//   Con "tanda" la regla es un CONTEXTO: reemplaza la rotación mientras se cumpla, sin cortar la escena actual.
//
//   Condiciones disponibles (ver README para el detalle):
//     cámara:   personas (mín.), cerca (0 a 1), vehiculos (mín.), movimiento (0 a 1), gesto
//     contexto: horario ["07:00","10:00"], dias [1..5] (0 = domingo), temperaturaMin, temperaturaMax, lluvia, uvMin
//     otros:    sonido (0 a 1), tecla ("1", "a", ...), toque (true)
//
//   Opciones de la regla (en segundos):
//     durante      cuánto se tiene que cumplir la condición antes de disparar (evita falsos positivos)
//     minimo       tiempo mínimo en pantalla
//     maximo       tiempo máximo en pantalla aunque la condición siga
//     mantener     cuánto sigue en pantalla después de que la condición deja de cumplirse
//     enfriamiento cuánto espera antes de poder dispararse de nuevo
//     prioridad    si se cumplen varias, gana la más alta (y puede interrumpir a una más baja)
//     activa:false la deja apagada sin borrarla

const A = '../assets/';

export default {
  // Ubicación de la pantalla (para el clima). Por defecto, Montevideo.
  ubicacion: { nombre: 'Montevideo', lat: -34.9011, lon: -56.1645 },

  camara: {
    fps: 8,              // cuadros por segundo que se analizan
    confianza: 0.5,      // puntaje mínimo para aceptar una detección (0 a 1)
    espejo: true,        // vista previa en espejo en el panel
  },

  escenas: {
    'marca':        { tipo: 'mensaje', titulo: 'Movimagen', texto: 'Más de 30 años conectando marcas con personas.', imagen: A + 'hero/home.jpg', duracion: 8 },
    'rutero':       { tipo: 'imagen', src: A + 'soportes/rutero-movimagen.webp', duracion: 7 },
    'shopping':     { tipo: 'imagen', src: A + 'soportes/shopping-brou.webp', duracion: 7 },
    'wall':         { tipo: 'imagen', src: A + 'soportes/wall-tesla.webp', duracion: 7 },
    'pantalla':     { tipo: 'imagen', src: A + 'soportes/pantalla-mostaza.webp', duracion: 7 },

    'hola':         { tipo: 'mensaje', titulo: '¡{saludo}!', texto: 'Esta pantalla reacciona cuando pasás. Así de cerca puede estar tu marca.', duracion: 6 },
    'cerca':        { tipo: 'mensaje', titulo: 'Ahora sí, te vemos', texto: 'Contenido que cambia cuando te acercás.', fondo: '#ffffff', duracion: 6 },
    'grupo':        { tipo: 'mensaje', titulo: '¡Hola a los {personas}!', texto: 'Una pantalla, muchas miradas.', imagen: A + 'hero/9692.jpg', duracion: 6 },
    'saludo-mano':  { tipo: 'mensaje', titulo: '¡Hola! 👋', texto: 'Te devolvemos el saludo.', fondo: '#ffffff', duracion: 5 },
    'pulgar':       { tipo: 'mensaje', titulo: '¡Gracias! 👍', texto: 'Nos alegra que te guste.', duracion: 5 },
    'transito':     { tipo: 'mensaje', titulo: 'Mucho tránsito hoy', texto: 'Mientras esperás, te acompañamos.', imagen: A + 'hero/9691.jpg', duracion: 8 },
    'movimiento':   { tipo: 'imagen', src: A + 'hero/9693.jpg', duracion: 6 },
    'aplauso':      { tipo: 'mensaje', titulo: '¡Eso!', texto: 'Esta pantalla también escucha.', duracion: 5 },

    'manana':       { tipo: 'mensaje', titulo: 'Buen día, {ciudad}', texto: 'Son las {hora}. Arrancamos.', imagen: A + 'hero/9691.jpg', duracion: 8 },
    'noche':        { tipo: 'mensaje', titulo: 'Buenas noches', texto: 'La ciudad sigue mirando.', imagen: A + 'hero/9693.jpg', duracion: 8 },
    'calor':        { tipo: 'mensaje', titulo: '{temp}° en {ciudad}', texto: 'Día para algo bien frío.', imagen: A + 'proyectos/gatorade.png', duracion: 8 },
    'frio':         { tipo: 'mensaje', titulo: '{temp}° en {ciudad}', texto: 'Abrigate. Nosotros seguimos en la calle.', duracion: 8 },
    'lluvia':       { tipo: 'mensaje', titulo: 'Llueve en {ciudad}', texto: 'Que la lluvia no tape tu mensaje.', imagen: A + 'hero/9692.jpg', duracion: 8 },
    'uv':           { tipo: 'mensaje', titulo: 'Índice UV alto', texto: 'Usá protector solar.', duracion: 8 },
  },

  tanda: ['marca', 'rutero', 'shopping', 'wall', 'pantalla'],

  reglas: [
    // Eventos de cámara
    { nombre: 'Saludo con la mano', cuando: { gesto: 'Open_Palm' }, mostrar: 'saludo-mano', prioridad: 50, durante: 0.4, enfriamiento: 10 },
    { nombre: 'Pulgar arriba',      cuando: { gesto: 'Thumb_Up' },  mostrar: 'pulgar',      prioridad: 50, durante: 0.4, enfriamiento: 10 },
    { nombre: 'Persona cerca',      cuando: { cerca: 0.5 },         mostrar: 'cerca',       prioridad: 40, durante: 0.8, enfriamiento: 20 },
    { nombre: 'Grupo',              cuando: { personas: 3 },        mostrar: 'grupo',       prioridad: 30, durante: 1.5, enfriamiento: 30 },
    { nombre: 'Persona',            cuando: { personas: 1 },        mostrar: 'hola',        prioridad: 20, durante: 1,   enfriamiento: 30 },
    { nombre: 'Tránsito',           cuando: { vehiculos: 4 },       mostrar: 'transito',    prioridad: 15, durante: 5,   enfriamiento: 120, activa: false },
    { nombre: 'Movimiento',         cuando: { movimiento: 0.08 },   mostrar: 'movimiento',  prioridad: 5,  durante: 0.5, enfriamiento: 60,  activa: false },

    // Otros eventos
    { nombre: 'Ruido / aplauso',    cuando: { sonido: 0.5 },        mostrar: 'aplauso',     prioridad: 45, durante: 0.2, enfriamiento: 20, activa: false },
    { nombre: 'Toque en pantalla',  cuando: { toque: true },        mostrar: 'hola',        prioridad: 60, enfriamiento: 3 },
    { nombre: 'Botón 1',            cuando: { tecla: '1' },         mostrar: 'hola',        prioridad: 90, enfriamiento: 0 },
    { nombre: 'Botón 2',            cuando: { tecla: '2' },         mostrar: 'cerca',       prioridad: 90, enfriamiento: 0 },
    { nombre: 'Botón 3',            cuando: { tecla: '3' },         mostrar: 'grupo',       prioridad: 90, enfriamiento: 0 },
    { nombre: 'Botón 4',            cuando: { tecla: '4' },         mostrar: 'saludo-mano', prioridad: 90, enfriamiento: 0 },

    // Contextos: cambian la rotación
    { nombre: 'Lluvia',             cuando: { lluvia: true },             tanda: ['lluvia', 'marca', 'rutero', 'shopping'], prioridad: 30 },
    { nombre: 'Calor',              cuando: { temperaturaMin: 26 },       tanda: ['calor', 'marca', 'wall', 'pantalla'],    prioridad: 20 },
    { nombre: 'Frío',               cuando: { temperaturaMax: 8 },        tanda: ['frio', 'marca', 'rutero', 'shopping'],   prioridad: 20 },
    { nombre: 'UV alto',            cuando: { uvMin: 8 },                 tanda: ['uv', 'marca', 'wall', 'pantalla'],       prioridad: 15 },
    { nombre: 'Mañana',             cuando: { horario: ['06:00', '10:00'] }, tanda: ['manana', 'marca', 'rutero', 'shopping'], prioridad: 10 },
    { nombre: 'Noche',              cuando: { horario: ['21:00', '05:00'] }, tanda: ['noche', 'marca', 'wall', 'pantalla'],    prioridad: 10 },
  ],
};
