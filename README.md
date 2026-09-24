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
   Portada: "30" con luz que sigue al mouse
2. Sobre nosotros: texto que se ilumina palabra por palabra al hacer scroll
3. Valores: confianza, flexibilidad y cercanía, con fotos de campañas flotando
4. Números: 30 años, 50+ soportes, 19 departamentos, 5 terminales
5. Productos: filas con nombre grande centrado (Buses, Shoppings, Pantallas gigantes, Walls, Duty Select, Ruteros) y ventana que se abre y pasa fotos al hacer scroll
6. Proyectos: foto que se abre al hacer scroll y galería horizontal
7. Testimonios en carrusel
8. Clientes: logos en movimiento
9. Contacto: formulario de cotización (abre el correo) y datos de la empresa

Librerías por CDN: GSAP + ScrollTrigger y Lenis. Si no cargan, la página se muestra estática.

Las imágenes en `assets/` vienen de movimagen.com.uy.

## Pendiente
- Conectar el formulario a un backend (hoy arma un mail a info@movimagen.com)
- Fotos de mayor resolución para los proyectos (las actuales son de 400 px)
