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
5. Cobertura: los números (30 años, 50+ soportes, 19 departamentos, 5 terminales) junto al mapa de Uruguay. El mapa se dibuja, se pinta de naranja, muestra todos los soportes y recorre Montevideo y la Interbalnearia. Al pasar por un punto se ve el detalle
6. Productos: filas con cinta animada al pasar el mouse y ventana que pasa fotos
7. Proyectos: galería horizontal
8. Testimonios en carrusel
9. Clientes: logos en movimiento
10. Contacto: formulario de cotización (abre el correo) y datos de la empresa

Librerías por CDN: GSAP + ScrollTrigger y Lenis. Si no cargan, la página se muestra estática.

Las imágenes en `assets/` vienen de movimagen.com.uy. Límites de departamentos y rutas: Natural Earth (dominio público).

## Soportes del mapa
Están en `soportes.js` (ruteros, shoppings, pantallas, walls y aeropuertos de Duty Select con sus coordenadas). Para sumar uno, agregá una línea en la lista que corresponda; el mapa, la leyenda y los textos se actualizan solos.

## Pendiente
- Conectar el formulario a un backend (hoy arma un mail a info@movimagen.com)
- Fotos de mayor resolución para los proyectos (las actuales son de 400 px)

