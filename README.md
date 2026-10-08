# Movimagen · Landing

Landing de una sola página para Movimagen (publicidad exterior, Uruguay). HTML, CSS y JS sin dependencias ni build.

## Ver en local
Abrí `index.html` en el navegador, o levantá un servidor:

```bash
python3 -m http.server 8000
```

## Secciones
Inspirada en ghuynguyen.vercel.app, con el contenido de la web actual de Movimagen. Colores de marca: naranja #EB691C y blanco. Fuente: Montserrat.

1. Carga: ventana con fotos de campañas que se agranda hasta ser la portada
2. Portada: la ciudad ilustrada de Movimagen se dibuja sola desde el centro de la ruta (WebGL) y se ilumina donde pasa el mouse; "+30 años" asoma por detrás de los edificios. Sin WebGL se ve la ilustración quieta
3. En la calle: "Soportes que la ciudad mira todos los días", la ventana que se abre y pasa fotos de soportes (300vh)
4. Productos: filas con cinta animada al pasar el mouse. Al hacer clic en un producto se vuelve al mapa mostrando solo las ubicaciones de ese tipo (en Buses se pintan los departamentos por donde circulan, definidos en `soportes.js`); el botón "Ver todos los soportes" quita el filtro
5. Cobertura: los números (30 años, +100 soportes, departamentos con soportes, 5 terminales) junto al mapa. Se pintan de naranja solo los departamentos con soportes; al pasar por uno se ve un resumen de lo que hay. Las rutas con sus carteles aparecen solo al elegir Ruteros en Productos
6. Proyectos: galería horizontal
7. Clientes y testimonios, juntos en un mismo bloque naranja: logos en movimiento y lo que dicen los clientes
8. Sobre nosotros: texto que se ilumina palabra por palabra al hacer scroll. Debajo, "Conocé al equipo": fila con las 15 personas del equipo que se desliza hacia la derecha (con el dedo, el trackpad o arrastrando con el mouse). Las fotos están en `assets/equipo/`
9. Valores: confianza, flexibilidad y cercanía, con fotos que salen desde el centro
10. Contacto: formulario de cotización (llega por mail a info@movimagen.com mediante FormSubmit, con respuesta automática a quien consulta) y datos de la empresa. Botón fijo de WhatsApp (+598 94 143 599) en toda la página

El botón "Pedí tu cotización" está siempre en el menú y también en la portada; los dos llevan al formulario.

**Activar el formulario:** la primera consulta que se envíe hace que FormSubmit mande un mail a info@movimagen.com con un botón "Activate". Hay que tocarlo una vez; desde ahí las consultas llegan solas. La dirección y el número de WhatsApp están al principio de las secciones Formulario y WhatsApp de `main.js`.

Librerías por CDN: GSAP + ScrollTrigger y Lenis. Si no cargan, la página se muestra estática.

Las imágenes en `assets/` vienen de movimagen.com.uy.

## Idiomas
Español e inglés, con el selector ES / EN del menú (la elección se recuerda; también se puede abrir con `?lang=en`).
- El español está en `index.html`. Cada texto traducible tiene `data-i18n="clave"` (o `data-i18n-attr` para atributos como `alt`).
- El inglés de esos textos, y los que arma el código (mapa, formulario, cursor) en los dos idiomas, están en `i18n.js`.
- Para sumar un texto: ponerle `data-i18n` en el HTML y agregar su versión en inglés en `i18n.js`.

## Soportes del mapa
Están en `soportes.js` (ruteros, shoppings, pantallas, walls y aeropuertos de Duty Select con sus coordenadas). Para sumar uno, agregá una línea en la lista que corresponda: su departamento se detecta solo y el mapa y los textos se actualizan.

## Mapa
Límites de departamentos de geoBoundaries y trazado de rutas de OpenStreetMap (© colaboradores de OpenStreetMap, licencia ODbL: el crédito tiene que quedar visible en el mapa). Proyección Mercator, con más detalle en Montevideo y la costa. Para regenerarlo (por ejemplo, si se suma una ruta nueva), ver `tools/generar-mapa.mjs`.

## Portada
La ilustración original está en `tools/portada-original.webp`. `tools/generar-portada.mjs` la convierte en `assets/portada/ciudad.webp` (las líneas y el orden en que se dibujan) y en la silueta que tapa el 30 (el `<path>` de `.hero-sil` en `index.html`). Si se cambia la ilustración, hay que volver a correrlo.

## Activador
En `activador/` hay un reproductor para pantallas que cambia el contenido según lo que ve una cámara (personas, cercanía, gestos, tránsito) y según otros disparadores (horario, clima, sonido, botones, toque). Se abre en `/activador/`; no está enlazado desde la landing. Uso, configuración, privacidad y la evaluación de otros disparadores en `activador/README.md`.

## Pendiente
- Administrador de contenidos (en pausa): los textos ya están organizados por clave en `i18n.js` y `data-i18n`, así que se puede conectar a una base de datos cuando se retome
- Fotos de mayor resolución para los proyectos (las actuales son de 400 px)

