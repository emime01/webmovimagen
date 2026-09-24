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
2. Portada: "30" con luz que sigue al mouse
3. Sobre nosotros: texto que se ilumina palabra por palabra al hacer scroll
4. Valores: confianza, flexibilidad y cercanía, con fotos que salen desde el centro
5. Cobertura: los números (30 años, 50+ soportes, departamentos con soportes, 5 terminales) junto al mapa. Se pintan de naranja solo los departamentos con soportes; al pasar por uno se ve un resumen de lo que hay. Las rutas con sus carteles aparecen solo al elegir Ruteros en Productos
6. Productos: filas con cinta animada al pasar el mouse. Al hacer clic en un producto (menos Buses) se vuelve al mapa mostrando solo las ubicaciones de ese tipo; el botón "Ver todos los soportes" quita el filtro
7. Proyectos: galería horizontal
8. Testimonios en carrusel
9. Clientes: logos en movimiento
10. Contacto: formulario de cotización (abre el correo) y datos de la empresa

Librerías por CDN: GSAP + ScrollTrigger y Lenis. Si no cargan, la página se muestra estática.

Las imágenes en `assets/` vienen de movimagen.com.uy.

## Idiomas
Español e inglés, con el selector ES / EN del menú (la elección se recuerda; también se puede abrir con `?lang=en`).
- El español está en `index.html`. Cada texto traducible tiene `data-i18n="clave"` (o `data-i18n-attr` para atributos como `alt`).
- El inglés de esos textos, y los que arma el código (mapa, formulario, cursor) en los dos idiomas, están en `i18n.js`.
- Para sumar un texto: ponerle `data-i18n` en el HTML y agregar su versión en inglés en `i18n.js`.

## Soportes del mapa
Están en `soportes.js` (ruteros, shoppings, pantallas, walls y aeropuertos de Duty Select con sus coordenadas). Para sumar uno, agregá una línea en la lista que corresponda: su departamento se detecta solo y el mapa, la leyenda y los textos se actualizan.

## Mapa
Límites de departamentos de geoBoundaries y trazado de rutas de OpenStreetMap (© colaboradores de OpenStreetMap, licencia ODbL: el crédito tiene que quedar visible en el mapa). Proyección Mercator, con más detalle en Montevideo y la costa. Para regenerarlo (por ejemplo, si se suma una ruta nueva), ver `tools/generar-mapa.mjs`.

## Pendiente
- Administrador de contenidos (en pausa): los textos ya están organizados por clave en `i18n.js` y `data-i18n`, así que se puede conectar a una base de datos cuando se retome
- Conectar el formulario a un backend (hoy arma un mail a info@movimagen.com)
- Fotos de mayor resolución para los proyectos (las actuales son de 400 px)

