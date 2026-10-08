# Activador · contenido que reacciona

Reproductor para pantallas (DOOH, tótems, pantallas de shopping) que cambia lo que se muestra según lo que pasa frente a la pantalla y alrededor: si alguien pasa, si se acerca, si saluda con la mano, la hora, el clima, el ruido o un botón. HTML y JS sin build, igual que la landing.

## Probarlo
Desde la raíz del repo:

```bash
python3 -m http.server 8000
```

y abrir `http://localhost:8000/activador/?panel`. La cámara y el micrófono necesitan `localhost` o `https`.

- **D** abre y cierra el panel de control: vista de la cámara con lo que detecta, valores de cada señal, estado de cada regla, últimos cambios y disparos del día (se pueden bajar en CSV).
- **F** o doble clic: pantalla completa.
- **1 a 4**: disparan escenas a mano (sirven para probar y para botones físicos).
- Simular contexto por la dirección: `?temp=30`, `?lluvia=1`, `?uv=9`, `?hora=08:30`. `?camara=0` arranca sin cámara.

## Panel de administración
`http://localhost:8000/activador/panel.html`: contenidos, reglas y pantallas sin tocar código. Los datos están en Supabase, en el proyecto **sunsignal**, en tablas propias que empiezan con `activador_` (no se mezclan con las de sunsignal). Las fotos y videos van al bucket `activador`.

- **Entrar**: con mail y contraseña. Solo pueden entrar los mails de la sección Equipo. La primera vez, cada persona toca "Crear cuenta" y confirma desde el mail que le llega.
- **Pantallas**: cada una tiene su enlace (`index.html?pantalla=CLAVE`), que es lo que se abre en el equipo de la pantalla. Ahí se elige la ciudad (para el clima) y la rotación, y se ve si está en línea y qué está mostrando. "Mostrar ahora" manda un contenido al instante.
- **Contenidos**: subir fotos y videos (o arrastrarlos), y crear mensajes con la marca con vista previa.
- **Reglas**: "cuando… → mostrar / rotar…" con menús, sin código. Se pueden encender y apagar.
- **Estadísticas**: disparos por día y por regla, con descarga en CSV.

Al guardar, las pantallas se recargan solas. Si la red bloquea la conexión en vivo (WebSockets), igual toman los cambios en hasta 2 minutos, pero "Mostrar ahora" no llega. Las pantallas guardan la última configuración: si se corta internet, siguen con lo que tenían, aunque las fotos subidas al panel necesitan conexión la primera vez.

Sin `?pantalla=` en la dirección, el reproductor usa `config.js` como antes.

La clave de la pantalla va en su enlace: quien la tenga puede ver su configuración y mandarle "Mostrar ahora" con contenidos que ya existen. Para cambiarla, borrar la pantalla y crear otra.

## Cómo funciona (sin panel)
Todo se arma en `config.js`:

1. **Escenas**: lo que se puede mostrar. Imagen, video o mensaje con la marca (título, texto, foto de fondo). Los textos aceptan `{saludo}`, `{hora}`, `{temp}`, `{ciudad}`, `{personas}` y `{vehiculos}`, que se completan en vivo.
2. **Tanda**: la rotación de siempre, cuando no pasa nada.
3. **Reglas**: qué dispara qué. Hay dos tipos:
   - **Evento** (`mostrar`): interrumpe la tanda en el momento. Ej.: alguien se acerca → escena "cerca". Se queda mientras la condición siga (con un mínimo y un máximo), y después espera un rato (`enfriamiento`) antes de volver a dispararse.
   - **Contexto** (`tanda`): cambia la rotación mientras se cumpla, sin cortar lo que se está viendo. Ej.: llueve → la tanda de lluvia.

   Si se cumplen varias, gana la de mayor `prioridad`; un evento de prioridad más alta puede interrumpir a uno más bajo. `durante` pide que la condición se sostenga un momento antes de disparar, para evitar falsos positivos.

```js
{ nombre: 'Persona cerca', cuando: { cerca: 0.5 }, mostrar: 'cerca', prioridad: 40, durante: 0.8, enfriamiento: 20 }
{ nombre: 'Lluvia', cuando: { lluvia: true }, tanda: ['lluvia', 'marca', 'rutero'], prioridad: 30 }
```

### Condiciones
| Condición | Ejemplo | Qué mide |
|---|---|---|
| `personas` | `personas: 3` | Cantidad mínima de personas en cuadro |
| `cerca` | `cerca: 0.5` | Qué parte del alto de la imagen ocupa la persona más cercana (0 a 1). 0,5 ≈ a 1–2 m con una webcam común |
| `vehiculos` | `vehiculos: 4` | Autos, buses, camiones, motos y bicis en cuadro |
| `gesto` | `gesto: 'Open_Palm'` | `Open_Palm` (mano abierta), `Thumb_Up`, `Thumb_Down`, `Victory`, `Pointing_Up`, `Closed_Fist`, `ILoveYou`. Acepta una lista |
| `movimiento` | `movimiento: 0.08` | Parte de la imagen que cambió entre cuadros (0 a 1). No necesita modelo |
| `horario` | `horario: ['21:00', '05:00']` | Franja horaria (puede cruzar la medianoche) |
| `dias` | `dias: [1, 2, 3, 4, 5]` | Días de la semana (0 = domingo) |
| `temperaturaMin` / `temperaturaMax` | `temperaturaMin: 26` | Temperatura actual en `ubicacion` |
| `lluvia` | `lluvia: true` | Si está lloviendo |
| `uvMin` | `uvMin: 8` | Índice UV |
| `sonido` | `sonido: 0.5` | Nivel del micrófono (0 a 1) |
| `tecla` | `tecla: '1'` | Una tecla, o un botón/pedal/sensor que se comporte como teclado |
| `toque` | `toque: true` | Un toque en la pantalla (tótems táctiles) |

Solo se enciende lo que usan las reglas activas: si ninguna usa `sonido`, no se pide el micrófono; si ninguna usa la cámara, no se pide la cámara. Las reglas de ejemplo de tránsito, movimiento y sonido vienen con `activa: false`.

### Tecnología
- Personas y vehículos: detector de objetos EfficientDet-Lite0 de MediaPipe. Gestos: Gesture Recognizer de MediaPipe. Se descargan del CDN la primera vez (unos 15 MB de modelos más el motor de MediaPipe) y corren en el navegador, con la placa de video si hay.
- Clima: [Open-Meteo](https://open-meteo.com) (gratis y sin clave), se consulta cada 15 minutos.
- Si no carga un modelo, sigue funcionando con movimiento, horario, clima y botones.

## Privacidad
Las imágenes de la cámara y el sonido se analizan en memoria, en el equipo de la pantalla. No se graban, no se guardan y no se envían a ningún servidor. Lo único que queda es un conteo de cuántas veces se disparó cada regla por día (en el navegador del equipo). No se identifica a nadie ni se estima edad, género o emociones.

Aun así, la imagen de una persona es un dato personal según la Ley 18.331. Recomendamos un cartel visible junto a la pantalla, por ejemplo: *"Esta pantalla usa una cámara para reaccionar cuando pasás. No graba ni guarda imágenes."*, y consultarlo con la asesoría legal antes de instalarlo en la vía pública.

## Instalación en una pantalla
- Equipo: mini PC o player Android con Chrome. Para cámara y gestos conviene algo con placa de video integrada reciente; para solo movimiento, horario y clima alcanza con cualquier player.
- Cámara: webcam USB 1080p gran angular arriba o abajo de la pantalla, a la altura de la cara. En exterior: carcasa estanca, y tener en cuenta contraluz, reflejos y que de noche sin luz la cámara no ve (hay cámaras con infrarrojo).
- Chrome en modo kiosco, sin pedir permisos cada vez:
  ```
  chrome --kiosk --autoplay-policy=no-user-gesture-required --use-fake-ui-for-media-stream https://…/activador/
  ```
  (o dar permiso de cámara una vez al sitio y usar solo `--kiosk`).
- La landing y el activador se publican juntos; el activador tiene `noindex` y no está enlazado desde la web.

## Otros disparadores evaluados
Qué más puede cambiar el contenido, cuánto cuesta y qué tan bien funciona en la calle. ✅ ya está en el activador · 🟡 se puede sumar · 🔴 no recomendado.

### Con la cámara
| Disparador | Para qué sirve | Confiabilidad en la calle | Privacidad | Estado |
|---|---|---|---|---|
| Presencia / movimiento | Despertar la pantalla, cambiar de escena cuando pasa alguien | Alta, pero se dispara también con autos, árboles o cambios de luz | Baja | ✅ |
| Cantidad de personas | Mensaje distinto para grupos o multitudes | Media-alta hasta ~8 m; baja con gente muy tapada | Baja | ✅ |
| Cercanía | Contenido "premio" para quien se acerca, interacción en tótems | Alta a 0,5–3 m | Baja | ✅ |
| Gestos con la mano | Saludar, pulgar arriba, "elegí con la mano" | Alta a menos de ~2 m; necesita invitar al gesto en pantalla | Baja | ✅ |
| Tránsito (cantidad de vehículos) | Ruteros y pantallas en avenidas: mensaje para el atasco | Media; la cámara tiene que encuadrar la calle y los autos no pueden verse muy chicos | Baja | ✅ |
| Atención (mira la pantalla) | Medir y premiar la mirada, "te estamos viendo" | Media a menos de 3 m (MediaPipe Face Landmarker) | Media | 🟡 |
| Sonrisa | "Sonreí y ganá", activaciones de marca | Media a menos de 2 m (Face Landmarker, gestos de la cara) | Media | 🟡 |
| Pose / cuerpo | Juegos, "imitá la pose", saltar | Media a 2–4 m (Pose Landmarker) | Media | 🟡 |
| Color de ropa | "Si tenés algo rojo…" (campañas de clubes) | Media-baja: depende mucho de la luz | Baja | 🟡 |
| Medición de audiencia | Reporte de cuántas personas pasaron y cuántas miraron, por hora | Media; con seguimiento entre cuadros para no contar dos veces | Media | 🟡 Buen valor para vender: dato propio de audiencia para cada soporte |
| Edad / género estimados | Segmentar el aviso | Baja y con sesgos | Alta (dato sensible) | 🔴 |
| Reconocimiento facial / patentes | Identificar personas o autos | — | Muy alta: requiere base legal y registro | 🔴 |

### Contexto (sin cámara)
| Disparador | Para qué sirve | Fuente | Costo | Estado |
|---|---|---|---|---|
| Horario y día | Desayuno a la mañana, after office, fin de semana | Reloj del equipo | Gratis | ✅ |
| Clima (temperatura, lluvia, UV) | Bebidas frías con calor, paraguas/delivery con lluvia, protector con UV alto | Open-Meteo | Gratis | ✅ |
| Feriados y fechas | Día de la Madre, Navidad, Carnaval, Noche de la Nostalgia | Lista fija en `config.js` | Gratis | 🟡 Fácil |
| Resultados deportivos en vivo | "¡Ganó Uruguay!" apenas termina el partido, gol en vivo | API de resultados deportivos | Pago | 🟡 Alto impacto en partidos de la selección |
| Tránsito real | Mensaje según la congestión en la ruta del rutero | APIs de Google Maps / Waze for Cities | Pago / convenio | 🟡 |
| Cotizaciones | Mensaje según el dólar (financieras, inmobiliarias) | BCU / APIs públicas | Gratis | 🟡 |
| Datos del anunciante | Precio, stock o promo que se actualiza solo ("quedan 20") | API o planilla del cliente | Según cliente | 🟡 Con un CMS o una planilla compartida |
| Calidad del aire, polen, olas | Nichos: salud, surf, outdoor | Open-Meteo | Gratis | 🟡 |

### Interacción y sensores
| Disparador | Para qué sirve | Hardware | Costo | Estado |
|---|---|---|---|---|
| Toque en pantalla | Tótems táctiles de shopping | Pantalla táctil | Incluido | ✅ |
| Botón físico / pedal | "Apretá el botón" en activaciones | Botonera USB que funciona como teclado | Bajo | ✅ (con `tecla`) |
| Sensor de presencia (PIR, ultrasonido, láser) | Presencia sin cámara: más barato y sin datos personales | Arduino tipo Leonardo/Pro Micro que manda una tecla | Bajo | ✅ (con `tecla`, sin cambiar el código) |
| Sonido / aplauso | Estadios, eventos, "aplaudí y mirá" | Micrófono USB | Bajo | ✅ |
| QR → celular → pantalla | La persona escanea, elige o juega desde el celular y la pantalla responde | Servidor en tiempo real (por ejemplo Supabase Realtime) | Bajo | 🟡 La interacción más usada en DOOH; no necesita cámara |
| Control remoto / programático | Disparar escenas desde una oficina o desde el sistema del anunciante | El mismo servidor en tiempo real | Bajo | 🟡 |
| Bluetooth / NFC | Celulares cerca, apoyar el teléfono | Lector o beacon | Medio | 🔴 Poca adopción del público |
| Peso / pisada | Alfombra que dispara al pisarla | Sensor de presión + placa | Medio | 🟡 Para activaciones puntuales |

### Recomendación
1. **Piloto con cámara en un tótem o pantalla de shopping**: es donde la gente pasa cerca y a pie, y la cámara está protegida. Personas + cercanía + saludo con la mano, con un aviso que invite a saludar.
2. **Contexto en toda la red** (horario y clima): no necesita hardware nuevo y sirve para vender campañas "contextuales" a bebidas, delivery, farmacias y seguros.
3. **Siguiente paso**: QR → celular → pantalla y control remoto con un servidor en tiempo real, y medición de audiencia como dato propio para los reportes a clientes.

## Cuestionario inmobiliario por cámara

En Contenidos, **+ Cuestionario inmobiliario** crea una experiencia editable: invitación a acercarse → «¿Estás buscando mudarte?» → Mercedes, Montevideo, Colonia o Paysandú → resultado de esa ciudad con QR. Si responde no, muestra una despedida. Agregá el contenido a la rotación de la pantalla de Mercedes o a una regla de cercanía.

Los cuatro destinos vienen configurados con enlaces del buscador público de Veocasas, comprobados el 8 de octubre de 2026: Mercedes, Montevideo, Colonia del Sacramento y Paysandú. Podés editar los enlaces para una campaña específica. Los filtros existentes se conservan y se añaden parámetros UTM para identificar ciudad y pantalla. El panel exige completar los cuatro antes de guardar.

- Gestos: 👍 sí / Mercedes; 👎 no / Montevideo; ✌️ Colonia; 🖐️ Paysandú. Hay que sostener el gesto (0,8 s por defecto) y soltarlo antes de contestar la siguiente pregunta.
- Toque y teclas 1–4 también permiten responder. Escape cancela. Las reglas normales no interrumpen una sesión; «Mostrar ahora» del administrador sí puede hacerlo.
- Al acercarse (45 % del alto del cuadro), empieza la primera pregunta. También se puede comenzar con 👍, toque o tecla 1.
- Sin respuesta durante 25 s, vuelve a la tanda. Si el detector cargó y no ve personas durante 8 s en una pregunta, cancela. El resultado permanece 20 s. Los tiempos se editan en el panel.
- Las respuestas y los QR **mostrados** se cuentan en el equipo y, para pantallas conectadas, mediante las estadísticas existentes de Supabase, con prefijo «Cuestionario». No se guardan imágenes ni identidad del visitante. Medir **escaneos reales** requiere que Veocasas registre las visitas con esos parámetros; mostrar un QR no prueba que se haya escaneado.
- Se guarda la configuración en un mensaje con un encabezado reservado en `texto`; no requiere nuevas tablas. No editar ese mensaje desde versiones anteriores del panel.

Para probar el flujo local sin cámara, abrir la ruta `/activador/?cuestionario=inmobiliario&camara=0`. La demostración incluye los cuatro filtros de Veocasas. Si se borra un enlace, muestra un aviso en lugar de un QR. Para verificarlo:

```bash
node --test activador/tests/cuestionario.test.mjs
# Con el servidor Python activo en 8000 y Playwright instalado:
node activador/tests/cuestionario-browser.cjs
node activador/tests/cuestionario-panel.cjs
# Opcional: descarga modelos reales y usa cámara sintética (necesita red):
node activador/tests/cuestionario-camara.cjs
```

Las pruebas de navegador validan el flujo y los enlaces del reproductor, y usan señales de cámara y backend del panel simulados. Los filtros de Veocasas se comprobaron por separado con solicitudes HTTPS y los filtros reconocidos por el servidor; Además, se comprobó la carga de ambos modelos reales de MediaPipe con la cámara sintética de Chromium. No se probó una cámara física ni el guardado en Supabase real. La biblioteca local QR es qrcode-generator 1.4.4 (MIT, ver `vendor/qrcode-LICENSE.txt`); no descarga un generador externo durante la sesión.
