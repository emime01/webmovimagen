(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const hasGsap = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  document.getElementById("year").textContent = new Date().getFullYear();

  /* ---------- Separar palabras ---------- */
  const splitWords = (el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map((w) => `<span class="w">${w}</span>`).join(" ");
    return $$(".w", el);
  };
  const aboutWords = $$("[data-words]").map(splitWords);
  $$(".t-item blockquote").forEach((q) => {
    splitWords(q).forEach((w, i) => (w.style.transitionDelay = `${i * 0.025}s`));
  });

  /* ---------- Logos de clientes ---------- */
  const LOGOS = Array.from({ length: 33 }, (_, i) => `assets/clientes/c${i + 1}.${i < 21 ? "png" : "jpg"}`);
  $("#logoRows").innerHTML = [LOGOS.slice(0, 17), LOGOS.slice(17)]
    .map((row, r) => {
      const chips = row.map((src) => `<div class="logo-chip"><img src="${src}" alt="Logo de cliente de Movimagen" loading="lazy" /></div>`).join("");
      return `<div class="logo-row${r ? " rev" : ""}">${chips}${chips.replace(/alt="[^"]*"/g, 'alt="" aria-hidden="true"')}</div>`;
    })
    .join("");

  /* ---------- Cintas de productos ---------- */
  $$("#productList li").forEach((li) => {
    const name = li.querySelector("h3").textContent;
    const imgs = li.dataset.imgs.split(",");
    const unit = [0, 1, 2, 3].map((i) => `<span>${name}</span><img src="${imgs[i % imgs.length]}" alt="" loading="lazy" />`).join("");
    li.insertAdjacentHTML("beforeend", `<div class="p-mq" aria-hidden="true"><div class="p-mq-inner"><div class="p-mq-track">${unit}${unit}</div></div></div>`);
  });

  /* ---------- Menú y cursor según el fondo ---------- */
  // Sobre fondo blanco se ven naranjas; sobre naranja o fotos, blancos.
  const isWhiteAt = (x, y) => {
    for (const el of document.elementsFromPoint(x, y)) {
      if (el.closest(".nav, .cursor")) continue;
      if (el.closest(".mk")) return true;
      if (el.matches(".m-deps path.lit") || el.closest(".product-list li.active")) return false;
      if (el.closest(".sc-frame, .loader")) return false;
      if (el.closest(".theme-white")) return true;
      if (el.closest(".theme-orange")) return false;
    }
    return false;
  };
  let themeQueued = false;
  const updateTheme = () => {
    themeQueued = false;
    document.body.classList.toggle("on-white", isWhiteAt(innerWidth / 2, 30));
  };
  const queueTheme = () => { if (!themeQueued) { themeQueued = true; requestAnimationFrame(updateTheme); } };
  window.addEventListener("scroll", queueTheme, { passive: true });

  /* ---------- Formulario ---------- */
  // Sin backend: arma el correo con todos los datos para info@movimagen.com
  $("#quoteForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    const body = [
      `Nombre: ${d.nombre}`,
      `E-mail: ${d.email}`,
      `Teléfono: ${d.telefono || "-"}`,
      `Plazo: ${d.plazo} ${d.unidad}`,
      `Inicio: ${d.inicio}  ·  Fin: ${d.fin}`,
      `Inversión mensual estimada: $ ${d.inversion}`,
      "",
      d.mensaje,
    ].join("\n");
    window.location.href = `mailto:info@movimagen.com?subject=${encodeURIComponent("Solicitud de cotización - " + d.nombre)}&body=${encodeURIComponent(body)}`;
    $("#formNote").textContent = "¡Gracias por tu consulta! Te enviaremos una propuesta a la brevedad.";
  });

  /* ---------- Testimonios ---------- */
  const tItems = $$(".t-item");
  const tBars = $("#tBars");
  tBars.innerHTML = tItems.map((_, i) => `<button aria-label="Testimonio ${i + 1}"><i></i></button>`).join("");
  const barFills = $$("i", tBars);
  let tIndex = 0, tStart = performance.now();
  const T_DURATION = 7000;
  const showTestimonial = (i) => {
    tIndex = (i + tItems.length) % tItems.length;
    tItems.forEach((el, k) => el.classList.toggle("active", k === tIndex));
    barFills.forEach((b, k) => (b.style.width = k < tIndex ? "100%" : "0%"));
    tStart = performance.now();
  };
  const tickTestimonials = (now) => {
    const p = Math.min((now - tStart) / T_DURATION, 1);
    barFills[tIndex].style.width = `${p * 100}%`;
    if (p >= 1) showTestimonial(tIndex + 1);
    requestAnimationFrame(tickTestimonials);
  };
  $$("button", tBars).forEach((b, i) => b.addEventListener("click", () => showTestimonial(i)));
  showTestimonial(0);
  if (!reduceMotion) requestAnimationFrame(tickTestimonials);

  /* ---------- Contadores ---------- */
  const countUp = (el) => {
    const end = +el.dataset.count;
    const suffix = el.dataset.suffix || "";
    if (reduceMotion) { el.textContent = end + suffix; return; }
    const start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / 1800, 1);
      el.textContent = Math.round(end * (1 - Math.pow(1 - p, 4))) + (p === 1 ? suffix : "");
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  /* ---------- Cobertura: números + mapa de soportes ---------- */
  // Límites de departamentos (geoBoundaries) y rutas: © colaboradores de OpenStreetMap (ODbL).
  // Proyección Mercator, para que cada zona conserve su forma real. Los soportes salen de soportes.js.
  const mapSvg = $("#mapSvg");
  const covMap = $("#covMap");
  const covSection = $("#cobertura");
  const covSticky = $("#covSticky");
  const pinsLayer = $("#covPins");
  const PROJ = JSON.parse(mapSvg.dataset.proj);
  const merc = (lat) => (Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) * 180) / Math.PI;
  const project = (lat, lng) => [(lng - PROJ.lon0) * PROJ.k + PROJ.ox, (merc(PROJ.lat0) - merc(lat)) * PROJ.k + PROJ.oy];
  const [, , VB_W, VB_H] = mapSvg.getAttribute("viewBox").split(" ").map(Number);
  const RATIO = VB_H / VB_W;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp01 = (p, a, b) => clamp((p - a) / (b - a), 0, 1);
  const clean = (t) => t.replace(/\s*⟲/g, "").trim();
  const fmtKm = (n) => String(n).replace(".", ",");
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const joinList = (arr) => (arr.length > 1 ? `${arr.slice(0, -1).join(", ")} y ${arr[arr.length - 1]}` : arr.join(""));

  const DATA = Object.assign({ ruteros: [], shoppings: [], pantallas: [], walls: [], duty: [] }, window.SOPORTES);
  const TYPES = {
    rutero: { one: "rutero", many: "ruteros", label: "Ruteros", tag: "Rutero" },
    pantalla: { one: "pantalla gigante", many: "pantallas gigantes", label: "Pantallas gigantes", tag: "Pantalla gigante" },
    wall: { one: "wall", many: "walls", label: "Walls", tag: "Wall" },
    shopping: { one: "shopping", many: "shoppings", label: "Shoppings", tag: "Shopping" },
    duty: { one: "aeropuerto", many: "aeropuertos", label: "Duty Select", tag: "Duty Select" },
  };
  const ORDER = ["rutero", "pantalla", "wall", "shopping", "duty"];

  const sites = [
    ...DATA.ruteros.map(([name, route, km, dir, size, lat, lng]) => {
      const extra = clean(name).split(" · ")[1];
      const kmTxt = (clean(name).match(/km\s*([\d.]+)/i) || [])[1] || km;
      return { type: "rutero", lat, lng, route, km, title: `${route} km ${kmTxt}`, detail: [`Sentido ${dir}`, extra && extra !== dir ? extra : "", size].filter(Boolean).join(" · ") };
    }),
    ...DATA.pantallas.map(([place, kind, lat, lng]) => ({ type: "pantalla", lat, lng, title: place, detail: kind })),
    ...DATA.walls.map(([place, lat, lng]) => ({ type: "wall", lat, lng, title: place, detail: "Medianera" })),
    ...DATA.shoppings.map(([name, n, lat, lng]) => {
      const pde = /punta del este/i.test(name);
      return { type: "shopping", lat, lng, n, title: clean(name).replace(/\s*Punta del Este$/i, ""), detail: `${pde ? "Punta del Este · " : ""}${n} soportes` };
    }),
    ...DATA.duty.map(([place, kind, lat, lng]) => ({ type: "duty", lat, lng, title: place, detail: kind })),
  ].map((site) => ({ ...site, xy: project(site.lat, site.lng) }));

  // Cada soporte se asigna al departamento donde cae (así un soporte nuevo pinta su departamento solo)
  const depPaths = $$(".m-deps path");
  const depOf = (xy) => {
    try {
      const pt = new DOMPoint(xy[0], xy[1]);
      const hit = depPaths.find((p) => p.isPointInFill(pt));
      if (hit) return hit.dataset.name;
    } catch (e) { /* navegador sin isPointInFill: se usa el respaldo */ }
    let best = null, bestD = Infinity;
    depPaths.forEach((p) => {
      const b = p.getBBox();
      const d = Math.hypot(b.x + b.width / 2 - xy[0], b.y + b.height / 2 - xy[1]);
      if (d < bestD) { bestD = d; best = p.dataset.name; }
    });
    return best;
  };
  sites.forEach((x) => (x.dep = depOf(x.xy)));
  const byDep = {};
  sites.forEach((x) => (byDep[x.dep] ||= []).push(x));
  const supportDeps = depPaths.filter((p) => byDep[p.dataset.name]); // de sur a norte (orden del SVG)
  const ofType = (t) => sites.filter((x) => x.type === t);
  const countOf = (t) => ofType(t).length;
  const shopSoportes = ofType("shopping").reduce((n, x) => n + x.n, 0);
  // Los aeropuertos son circuitos de pantallas: no se suman como un soporte
  const totalSoportes = countOf("rutero") + countOf("pantalla") + countOf("wall") + shopSoportes;

  // Rutas dibujadas con la cantidad de carteles de cada una
  const routeInfo = $$(".m-route").map((g) => {
    const name = g.dataset.route;
    const carteles = sites.filter((x) => x.type === "rutero" && x.route === name).sort((a, b) => a.km - b.km);
    const tramos = [];
    carteles.forEach((x) => { const t = tramos[tramos.length - 1]; if (t && x.km - t[t.length - 1].km <= 3) t.push(x); else tramos.push([x]); });
    const path = $(g.querySelector("use").getAttribute("href"));
    return { g, name, carteles, tramos, path, anchor: carteles.length ? carteles[Math.floor(carteles.length / 2)].xy : null };
  });
  const routesByCount = routeInfo.filter((r) => r.carteles.length).sort((a, b) => b.carteles.length - a.carteles.length);
  // Las rutas se revelan con un círculo que crece desde Montevideo (de donde salen todas)
  const NS = "http://www.w3.org/2000/svg";
  const routeClip = document.createElementNS(NS, "clipPath");
  routeClip.id = "routeClip";
  routeClip.setAttribute("clipPathUnits", "userSpaceOnUse");
  const clipCircle = document.createElementNS(NS, "circle");
  const [mvdCX, mvdCY] = project(-34.9, -56.19);
  clipCircle.setAttribute("cx", mvdCX);
  clipCircle.setAttribute("cy", mvdCY);
  clipCircle.setAttribute("r", 0);
  routeClip.appendChild(clipCircle);
  mapSvg.querySelector("defs").appendChild(routeClip);
  $(".m-routes").setAttribute("clip-path", "url(#routeClip)");
  const ROUTE_REACH = Math.max(VB_W, VB_H); // radio que alcanza a cubrir todas las rutas
  const revealRoutes = (t) => clipCircle.setAttribute("r", t >= 1 ? ROUTE_REACH * 2 : ROUTE_REACH * 0.35 * t);
  const tramoTxt = (t) => (t.length === 1 ? `km ${fmtKm(t[0].km)}` : `km ${fmtKm(t[0].km)}–${fmtKm(t[t.length - 1].km)} (${t.length})`);

  // Textos
  const nDeps = supportDeps.length;
  const depCounts = (t) => {
    const c = {};
    ofType(t).forEach((x) => (c[x.dep] = (c[x.dep] || 0) + 1));
    return Object.entries(c).sort((a, b) => b[1] - a[1]).map(([d, n]) => `${n} en ${d}`);
  };
  // "3 medianeras en Montevideo." o "4 pantallas gigantes: 3 en Montevideo y 1 en Maldonado."
  const byDepText = (t, one, many) => {
    const parts = depCounts(t);
    const total = plural(countOf(t), one, many);
    return parts.length === 1 ? `${total} ${parts[0].replace(/^\d+ /, "")}.` : `${total}: ${joinList(parts)}.`;
  };
  const CAPTIONS = {
    start: ["Uruguay", "Dónde están nuestros soportes."],
    paint: `Soportes fijos en ${nDeps} departamentos.`,
    routes: ["Rutas nacionales", `${plural(countOf("rutero"), "cartel", "carteles")} en ${plural(routesByCount.length, "ruta", "rutas")}.`],
    hold: ["Todo el país", `${totalSoportes} soportes fijos en ${nDeps} departamentos. ${finePointer ? "Pasá el mouse por un departamento" : "Tocá un departamento"} para ver qué hay en cada uno.`],
    rutero: ["Ruteros", `${plural(countOf("rutero"), "cartel", "carteles")} en ${plural(routesByCount.length, "ruta", "rutas")}: ${joinList(routesByCount.map((r) => `${r.name} (${r.carteles.length})`))}.`],
    pantalla: ["Pantallas gigantes", byDepText("pantalla", "pantalla gigante", "pantallas gigantes")],
    wall: ["Walls", byDepText("wall", "medianera", "medianeras")],
    shopping: ["Shoppings", `${shopSoportes} soportes en ${plural(countOf("shopping"), "shopping", "shoppings")}: ${joinList(ofType("shopping").sort((a, b) => b.n - a.n).map((x) => `${x.title} (${x.n})`))}.`],
    duty: ["Duty Select", `Circuito de pantallas en los free shops de ${countOf("duty") === 1 ? "el aeropuerto" : "los aeropuertos"} de ${joinList(ofType("duty").map((x) => x.title.replace(/^Aeropuerto de /, "")))}.`],
  };

  // Leyenda: el inventario completo (en el mapa filtrado se resalta el tipo activo)
  $("#covLegend").innerHTML = ORDER.filter(countOf)
    .map((t) => `<li data-type="${t}"><i class="shape shape-${t}"></i>${TYPES[t].label} <span data-n="${countOf(t)}">(0)</span></li>`)
    .join("");
  const legendItems = $$("#covLegend li");
  const legendNums = $$("#covLegend span");

  // Resumen simplificado de un departamento (opcionalmente, de un solo tipo)
  const summaryHTML = (list, onlyType) =>
    ORDER.filter((t) => !onlyType || t === onlyType)
      .map((t) => {
        const xs = list.filter((x) => x.type === t);
        if (!xs.length) return "";
        const shape = `<i class="shape shape-${t}"></i>`;
        if (t === "rutero") return `<li>${shape}<strong>${plural(xs.length, "rutero", "ruteros")}</strong><span>${joinList([...new Set(xs.map((x) => x.route))])}</span></li>`;
        if (t === "shopping") return `<li>${shape}<strong>${plural(xs.length, "shopping", "shoppings")}</strong><span>${joinList(xs.map((x) => x.title))} · ${xs.reduce((n, x) => n + x.n, 0)} soportes</span></li>`;
        if (t === "duty") return xs.map((x) => `<li>${shape}<strong>Circuito de pantallas</strong><span>${x.title}</span></li>`).join("");
        return `<li>${shape}<strong>${plural(xs.length, TYPES[t].one, TYPES[t].many)}</strong>${onlyType ? `<span>${joinList(xs.map((x) => x.title))}</span>` : ""}</li>`;
      })
      .join("");

  // Marcadores: solo se muestran cuando el mapa se filtra desde Productos
  const markers = sites
    .filter((x) => x.type !== "rutero")
    .map((site, i) => {
      const el = document.createElement("div");
      el.className = `mk mk-${site.type} ping`;
      el.innerHTML = `<i>${site.type === "shopping" ? site.n : ""}</i>`;
      el.setAttribute("role", "button");
      el.tabIndex = -1;
      el.setAttribute("aria-label", `${TYPES[site.type].tag}: ${site.title}. ${site.detail}`);
      el.style.setProperty("--d", `${(i % 5) * 0.4}s`);
      pinsLayer.appendChild(el);
      return { el, site, shown: false, sx: 0, sy: 0 };
    });

  // Etiquetas (se ubican solas donde no se pisan)
  const makeLabel = (xy, text, kind) => {
    const el = document.createElement("div");
    el.className = `mk-anchor l-${kind}`;
    el.innerHTML = `<span class="mk-label">${text}</span>`;
    pinsLayer.appendChild(el);
    return { el, xy };
  };
  // Las etiquetas de ruta van arriba o abajo de la línea, con un punto que marca el tramo
  const ROUTE_PREFER = ["above", "below", "above-right", "above-left", "below-right", "below-left", "right", "left"];
  const routeLabels = routesByCount.map((r) => Object.assign(makeLabel(r.anchor, `${r.name} (${r.carteles.length})`, "route"), { prefer: ROUTE_PREFER }));
  let filterLabels = [];

  // Cámara
  const FULL = { cx: VB_W / 2, cy: VB_H / 2, w: VB_W * 1.1 };
  const cam = { ...FULL };
  const fitCam = (xys, minW) => {
    const xs = xys.map((p) => p[0]), ys = xys.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: Math.min(FULL.w, Math.max((x1 - x0) * 1.4, ((y1 - y0) * 1.4) / RATIO, minW)) };
  };
  const camFor = (f) => {
    if (!f) return { ...FULL };
    if (f === "rutero") return fitCam(ofType("rutero").map((x) => x.xy), 60);
    return fitCam(ofType(f).map((x) => x.xy), Math.max(covMap.clientWidth / 55, 9));
  };
  const placeAll = () => {
    const ctm = mapSvg.getScreenCTM();
    if (!ctm) return;
    const box = covMap.getBoundingClientRect();
    const pt = mapSvg.createSVGPoint();
    const put = (el, xy, store) => {
      pt.x = xy[0]; pt.y = xy[1];
      const scr = pt.matrixTransform(ctm);
      const x = scr.x - box.left, y = scr.y - box.top;
      el.style.transform = `translate(${x}px, ${y}px)`;
      if (store) { store.sx = x; store.sy = y; }
    };
    markers.forEach((m) => put(m.el, m.site.xy, m));
    [...routeLabels, ...filterLabels].forEach((l) => put(l.el, l.xy));
  };
  const applyCam = () => {
    const h = cam.w * RATIO;
    mapSvg.setAttribute("viewBox", `${cam.cx - cam.w / 2} ${cam.cy - h / 2} ${cam.w} ${h}`);
    placeAll();
  };
  let camTween = null;
  const moveCam = (target, animate) => {
    if (camTween) camTween.kill();
    if (animate && hasGsap && !reduceMotion) camTween = gsap.to(cam, { ...target, duration: 1.3, ease: "power3.inOut", onUpdate: applyCam });
    else { Object.assign(cam, target); applyCam(); }
  };

  const placeLabels = (labels, target, avoid = []) => {
    const bw = covMap.clientWidth, bh = covMap.clientHeight;
    const scale = bw / target.w;
    const vbx = target.cx - target.w / 2, vby = target.cy - (target.w * RATIO) / 2;
    const toScreen = (xy) => [(xy[0] - vbx) * scale, (xy[1] - vby) * scale];
    const dots = avoid.map((xy) => { const [x, y] = toScreen(xy); return [x - 8, y - 8, x + 8, y + 8]; });
    const taken = [];
    const overlaps = (r, list, pad) => list.some((t) => r[0] < t[2] + pad && r[2] + pad > t[0] && r[1] < t[3] + pad && r[3] + pad > t[1]);
    labels.forEach((l) => {
      const lab = l.el.firstChild;
      l.el.dataset.pos = "right";
      const w = lab.offsetWidth, h = lab.offsetHeight, G = 12, D = 6;
      const [x, y] = toScreen(l.xy);
      const opts = {
        right: [x + G, y - h / 2], left: [x - G - w, y - h / 2], above: [x - w / 2, y - G - h], below: [x - w / 2, y + G],
        "above-right": [x + D, y - G - h], "below-right": [x + D, y + G], "above-left": [x - D - w, y - G - h], "below-left": [x - D - w, y + G],
      };
      const order = (l.prefer || Object.keys(opts)).map((k) => [k, opts[k]]);
      l.el.dataset.pos = "none";
      for (const avoidDots of [true, false]) {
        const found = order.find(([, [lx, ly]]) => {
          const r = [lx, ly, lx + w, ly + h];
          const inside = lx > 6 && ly > 6 && r[2] < bw - 6 && r[3] < bh - 6;
          return inside && !overlaps(r, taken, 5) && !(avoidDots && overlaps(r, dots, 1));
        });
        if (found) { l.el.dataset.pos = found[0]; const [lx, ly] = found[1]; taken.push([lx, ly, lx + w, ly + h]); break; }
      }
    });
  };
  // Etiquetas del filtro: los puntos muy juntos se agrupan ("Montevideo (3)")
  const buildFilterLabels = (f, target) => {
    filterLabels.forEach((l) => l.el.remove());
    filterLabels = [];
    if (!f || f === "rutero") return;
    const scale = covMap.clientWidth / target.w;
    const groups = [];
    ofType(f).forEach((x) => {
      const g = groups.find((gr) => Math.hypot((gr[0].xy[0] - x.xy[0]) * scale, (gr[0].xy[1] - x.xy[1]) * scale) < 26);
      if (g) g.push(x); else groups.push([x]);
    });
    filterLabels = groups.map((g) => makeLabel(g.length === 1 ? g[0].xy : [g.reduce((a, x) => a + x.xy[0], 0) / g.length, g.reduce((a, x) => a + x.xy[1], 0) / g.length], g.length === 1 ? g[0].title : `${g[0].dep} (${g.length})`, "filter"));
    placeLabels(filterLabels, target, ofType(f).map((x) => x.xy));
    placeAll();
  };

  // Tarjeta de detalle
  const covCard = $("#covCard");
  let cardFor = null, hideTimer;
  const showCardAt = (html, x, y, key) => {
    clearTimeout(hideTimer);
    if (cardFor !== key) covCard.innerHTML = html;
    const sb = covSticky.getBoundingClientRect();
    const w = covCard.offsetWidth, h = covCard.offsetHeight;
    covCard.classList.toggle("below", y - h - 24 < 64);
    covCard.style.left = `${clamp(x, w / 2 + 12, sb.width - w / 2 - 12)}px`;
    covCard.style.top = `${y}px`;
    covCard.classList.add("show");
    cardFor = key;
  };
  const hideCard = () => {
    covCard.classList.remove("show");
    markers.forEach((o) => o.el.classList.remove("active"));
    routeInfo.forEach((r) => r.g.classList.remove("hover"));
    cardFor = null;
  };
  const relToSticky = (cx, cy) => { const sb = covSticky.getBoundingClientRect(); return [cx - sb.left, cy - sb.top]; };

  const showMarkerCard = (m) => {
    markers.forEach((o) => o.el.classList.toggle("active", o === m));
    const near = markers.filter((o) => o.shown && Math.hypot(o.sx - m.sx, o.sy - m.sy) < 16);
    const list = near.length ? near : [m];
    const html = list.length === 1
      ? `<p class="cc-tag">(${TYPES[m.site.type].tag})</p><p class="cc-title">${m.site.title}</p><p class="cc-detail">${m.site.detail}</p>`
      : `<p class="cc-tag">(${list.length} soportes en esta zona)</p><ul class="cc-list">${list.map(({ site: x }) => `<li><strong>${x.title}</strong><span>${TYPES[x.type].tag} · ${x.detail}</span></li>`).join("")}</ul>`;
    const mb = covMap.getBoundingClientRect();
    const [x, y] = relToSticky(mb.left + m.sx, mb.top + m.sy);
    showCardAt(html, x, y, m);
  };
  const showDepCard = (path, cx, cy) => {
    const list = byDep[path.dataset.name] || [];
    const html = `<p class="cc-title">${path.dataset.name}</p><ul class="cc-sum">${summaryHTML(list, filter)}</ul>`;
    const [x, y] = relToSticky(cx, cy);
    showCardAt(html, x, y, `dep:${path.dataset.name}:${filter}`);
  };
  const showRouteCard = (r, cx, cy) => {
    routeInfo.forEach((o) => o.g.classList.toggle("hover", o === r));
    const html = `<p class="cc-tag">(Ruta)</p><p class="cc-title">${r.name}</p><p class="cc-detail">${plural(r.carteles.length, "cartel", "carteles")}</p><p class="cc-tramos">${r.tramos.map(tramoTxt).join(" · ")}</p>`;
    const [x, y] = relToSticky(cx, cy);
    showCardAt(html, x, y, r);
  };

  // Estado del mapa
  let filter = null;   // tipo elegido desde Productos
  let holding = false; // terminó el recorrido de entrada: el mapa es interactivo
  const covCount = $("#covCount"), covZone = $("#covZone"), covText = $("#covText"), covReset = $("#covReset");
  const routesLayer = $(".m-routes");
  let lastCaption = "";
  const setCaption = (zone, text, animate = true) => {
    if (zone + text === lastCaption) return;
    lastCaption = zone + text;
    covZone.textContent = zone;
    covText.textContent = text;
    if (animate && hasGsap) gsap.fromTo([covZone, covText], { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.05, ease: "expo.out", overwrite: true });
  };
  const setLit = (fn) => depPaths.forEach((p) => p.classList.toggle("lit", !!fn(p)));
  const setDash = (el, len, t) => {
    el.style.strokeDasharray = t >= 1 ? "none" : `${len} ${len}`;
    el.style.strokeDashoffset = t >= 1 ? 0 : len * (1 - t);
  };

  const renderHold = () => {
    covSection.classList.toggle("is-filtered", !!filter);
    covSection.dataset.filter = filter || "";
    covCount.textContent = nDeps;
    setLit((p) => (byDep[p.dataset.name] || []).some((x) => !filter || x.type === filter));
    depPaths.forEach((p) => setDash(p, 0, 1));
    revealRoutes(1);
    routesLayer.classList.toggle("hide", !!filter && filter !== "rutero");
    markers.forEach((m) => {
      const on = !!filter && m.site.type === filter;
      if (on !== m.shown) { m.shown = on; m.el.classList.toggle("show", on); m.el.tabIndex = on ? 0 : -1; }
    });
    legendNums.forEach((el) => (el.textContent = `(${el.dataset.n})`));
    legendItems.forEach((li) => li.classList.toggle("on", !filter || li.dataset.type === filter));
    covReset.hidden = !filter;
    setCaption(...(filter ? CAPTIONS[filter] : CAPTIONS.hold));
  };

  const setFilter = (f, animate = true) => {
    filter = f || null;
    hideCard();
    const target = camFor(filter);
    buildFilterLabels(filter, target);
    placeLabels(routeLabels, target);
    if (holding) renderHold();
    moveCam(target, animate);
  };
  covReset.addEventListener("click", () => setFilter(null));

  // Recorrido de entrada según el avance del scroll (0 → 1)
  const HOLD = 0.6;
  const measureDraw = () => {
    const scale = covMap.clientWidth / FULL.w; // px por unidad con el país entero a la vista
    depPaths.forEach((p) => (p.dataset.len = p.getTotalLength() * scale));
  };
  const updateCoverage = (p) => {
    if (p >= HOLD) {
      if (!holding) { holding = true; covSection.classList.add("is-holding"); renderHold(); }
      return;
    }
    if (holding) {
      holding = false;
      covSection.classList.remove("is-holding");
      hideCard();
      if (filter) setFilter(null);
      markers.forEach((m) => { m.shown = false; m.el.classList.remove("show"); m.el.tabIndex = -1; });
      covReset.hidden = true;
    }
    // 1) se dibujan todos los departamentos
    const draw = lerp01(p, 0, 0.2);
    depPaths.forEach((path, i) => setDash(path, +path.dataset.len || 0, clamp(draw * 1.6 - (i / depPaths.length) * 0.6, 0, 1)));
    // 2) se pintan de naranja los que tienen soportes, de sur a norte
    const lit = Math.round(lerp01(p, 0.18, 0.4) * supportDeps.length);
    supportDeps.forEach((path, i) => path.classList.toggle("lit", i < lit));
    covCount.textContent = lit;
    // 3) se dibujan las rutas con sus carteles
    const rt = lerp01(p, 0.42, 0.56);
    revealRoutes(rt);
    covSection.classList.toggle("show-routes", p > 0.52);
    routesLayer.classList.remove("hide");
    const cnt = lerp01(p, 0.4, 0.56);
    legendNums.forEach((el) => (el.textContent = `(${Math.round(+el.dataset.n * cnt)})`));
    legendItems.forEach((li) => li.classList.add("on"));
    if (p < 0.18) setCaption(...CAPTIONS.start);
    else if (p < 0.42) setCaption(supportDeps.length ? supportDeps[Math.max(0, lit - 1)].dataset.name : "Uruguay", CAPTIONS.paint, false);
    else setCaption(...CAPTIONS.routes);
  };

  // Interacción: departamentos, rutas y marcadores
  depPaths.forEach((path) => {
    const on = () => holding && path.classList.contains("lit");
    path.addEventListener("pointermove", (e) => { if (on() && e.pointerType === "mouse") showDepCard(path, e.clientX, e.clientY); });
    path.addEventListener("pointerleave", () => { if (typeof cardFor === "string" && cardFor.startsWith("dep:")) hideTimer = setTimeout(hideCard, 80); });
    path.addEventListener("click", (e) => { if (!on()) return; e.stopPropagation(); showDepCard(path, e.clientX, e.clientY); });
  });
  routeInfo.forEach((r) => {
    const hit = r.g.querySelector(".r-hit");
    hit.addEventListener("pointermove", (e) => { if (holding && e.pointerType === "mouse") showRouteCard(r, e.clientX, e.clientY); });
    hit.addEventListener("pointerleave", () => { if (cardFor === r) hideTimer = setTimeout(hideCard, 80); });
    hit.addEventListener("click", (e) => { if (!holding) return; e.stopPropagation(); showRouteCard(r, e.clientX, e.clientY); });
  });
  markers.forEach((m) => {
    if (finePointer) {
      m.el.addEventListener("pointerenter", () => showMarkerCard(m));
      m.el.addEventListener("pointerleave", () => { hideTimer = setTimeout(hideCard, 150); });
    }
    m.el.addEventListener("click", (e) => { e.stopPropagation(); showMarkerCard(m); });
    m.el.addEventListener("focus", () => showMarkerCard(m));
    m.el.addEventListener("blur", () => { hideTimer = setTimeout(hideCard, 150); });
  });
  document.addEventListener("click", (e) => { if (cardFor && !e.target.closest(".mk, .m-deps, .m-routes")) hideCard(); });

  // Desde Productos: volver al mapa filtrado por ese tipo de soporte
  let lenis; // se inicializa más abajo si hay scroll suave
  const goToMap = (f) => {
    const top = covSection.getBoundingClientRect().top + window.scrollY;
    const y = top + (covSection.offsetHeight - innerHeight) * 0.8;
    setFilter(f, holding);
    if (lenis) lenis.scrollTo(y, { duration: 1.6 });
    else window.scrollTo({ top: y, behavior: reduceMotion ? "auto" : "smooth" });
  };
  $$("#productList li[data-filter]").forEach((li) => {
    const name = li.querySelector("h3").textContent;
    li.classList.add("has-map");
    li.setAttribute("role", "link");
    li.tabIndex = 0;
    li.setAttribute("aria-label", `${name}: ver en el mapa de cobertura`);
    li.addEventListener("click", () => goToMap(li.dataset.filter));
    li.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); goToMap(li.dataset.filter); } });
  });

  /* ---------- Sin GSAP (CDN caído): mostrar todo estático ---------- */
  if (!hasGsap) {
    $("#loader").remove();
    document.body.classList.remove("is-loading");
    $$(".fade-in").forEach((el) => (el.style.opacity = 1));
    aboutWords.flat().forEach((w) => w.classList.add("on"));
    $$("[data-count]").forEach(countUp);
    $$(".sc-slide").forEach((s) => (s.style.clipPath = "none"));
    covSection.style.height = "auto";
    placeLabels(routeLabels, FULL);
    applyCam();
    updateCoverage(1);
    window.addEventListener("resize", applyCam);
    updateTheme();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  /* ---------- Scroll suave ---------- */
  if (!reduceMotion && typeof window.Lenis !== "undefined") {
    lenis = new Lenis({ lerp: 0.09 });
    lenis.on("scroll", () => { ScrollTrigger.update(); queueTheme(); });
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }
  $$('a[href^="#"]').forEach((a) =>
    a.addEventListener("click", (e) => {
      const target = $(a.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      lenis ? lenis.scrollTo(target, { duration: 1.6 }) : target.scrollIntoView();
    })
  );

  /* ---------- Carga ---------- */
  // Una ventana pasa fotos de campañas; al terminar se vuelve naranja
  // y crece hasta ocupar la pantalla, convirtiéndose en la portada.
  const box = $("#loaderBox");
  const frames = $$("img:not(.loader-logo)", box);
  const finishLoading = () => {
    $("#loader").remove();
    document.body.classList.remove("is-loading");
    lenis && lenis.start();
    ScrollTrigger.refresh();
    updateTheme();
  };
  const intro = gsap.timeline({ delay: 0.3 });
  intro.from(box, { scale: 0.6, opacity: 0, duration: 0.6, ease: "expo.out" });
  const STEP = reduceMotion ? 0.02 : 0.16;
  frames.forEach((img, i) => {
    intro.add(() => { frames.forEach((f) => f.classList.remove("on")); img.classList.add("on"); }, i === 0 ? ">" : `>${STEP}`);
  });
  intro
    .to(".loader-final", { opacity: 1, duration: 0.25 }, `>${STEP}`)
    .to(box, { width: () => innerWidth, height: () => innerHeight, duration: 1.2, ease: "expo.inOut" }, ">0.15")
    .add(finishLoading)
    .from(".hero-num", { opacity: 0, scale: 1.2, filter: "blur(40px)", duration: 1.8, ease: "expo.out" }, "<")
    .to(".fade-in", { opacity: 1, duration: 1, stagger: 0.08 }, "<0.3");

  /* ---------- Cursor ---------- */
  const cursor = $("#cursor");
  const cursorLabel = $("#cursorLabel");
  const mouse = { x: innerWidth / 2, y: innerHeight / 2 };
  const cur = { ...mouse };
  let cursorWhite = false;
  window.addEventListener("pointermove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
  gsap.ticker.add(() => {
    cur.x += (mouse.x - cur.x) * 0.25;
    cur.y += (mouse.y - cur.y) * 0.25;
    cursor.style.transform = `translate(${cur.x}px, ${cur.y}px)`;
    if (finePointer) {
      const w = isWhiteAt(mouse.x, mouse.y);
      if (w !== cursorWhite) {
        cursorWhite = w;
        cursor.style.setProperty("--cursor", w ? "var(--orange)" : "var(--white)");
        cursor.style.setProperty("--cursor-text", w ? "var(--white)" : "var(--orange)");
      }
    }
  });
  const bindCursor = (el, label) => {
    el.addEventListener("pointerenter", () => { cursorLabel.textContent = label; cursor.classList.add("big"); });
    el.addEventListener("pointerleave", () => cursor.classList.remove("big"));
  };
  $$("[data-cursor]").forEach((el) => bindCursor(el, el.dataset.cursor));
  $$(".g-item").forEach((el) => bindCursor(el, "Ver"));
  $$("#productList li[data-filter]").forEach((el) => bindCursor(el, "Ver en mapa"));

  /* ---------- Hero: luz que sigue al mouse ---------- */
  const heroNum = $(".hero-num");
  if (finePointer && !reduceMotion) {
    const light = { x: 30, y: 20 };
    $(".hero").addEventListener("pointermove", (e) => {
      gsap.to(light, {
        x: (e.clientX / innerWidth) * 100,
        y: (e.clientY / innerHeight) * 100,
        duration: 1.2,
        ease: "power3.out",
        onUpdate: () => { heroNum.style.setProperty("--x", `${light.x}%`); heroNum.style.setProperty("--y", `${light.y}%`); },
      });
    });
  } else if (!reduceMotion) {
    gsap.to({ t: 0 }, {
      t: Math.PI * 2, duration: 10, repeat: -1, ease: "none",
      onUpdate() { const t = this.targets()[0].t; heroNum.style.setProperty("--x", `${50 + Math.cos(t) * 35}%`); heroNum.style.setProperty("--y", `${40 + Math.sin(t) * 30}%`); },
    });
  }
  gsap.to(".hero-glow", { scale: 0.85, opacity: 0, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
  gsap.to(".hero-logo", { yPercent: -120, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });

  /* ---------- Sobre nosotros: palabras que se encienden ---------- */
  aboutWords.forEach((words) => {
    ScrollTrigger.create({
      trigger: words[0].parentElement,
      start: "top 80%",
      end: "bottom 45%",
      scrub: true,
      onUpdate: (st) => {
        const n = Math.round(st.progress * words.length);
        words.forEach((w, i) => w.classList.toggle("on", i < n));
      },
    });
  });

  /* ---------- Valores: imágenes flotando ---------- */
  // Las fotos nacen chicas en el centro y salen hacia los bordes agrandándose,
  // una detrás de otra, como si vinieran hacia la pantalla.
  const floats = $$(".float");
  const flyTl = gsap.timeline({ scrollTrigger: { trigger: ".values", start: "top top", end: "bottom bottom", scrub: 0.6, invalidateOnRefresh: true } });
  floats.forEach((el, i) => {
    const angle = i * 2.399 + 0.6; // ángulo áureo: reparte las direcciones sin repetir
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const END_SCALE = 1.9;
    // Distancia justa para que la foto (ya agrandada) salga por completo por el borde
    const exit = () => {
      const w = (el.offsetWidth * END_SCALE) / 2 + innerWidth / 2;
      const h = (el.offsetHeight * END_SCALE) / 2 + innerHeight / 2;
      return Math.min(w / Math.max(Math.abs(cos), 0.01), h / Math.max(Math.abs(sin), 0.01)) * 1.05;
    };
    const at = i * 0.18;
    flyTl
      .fromTo(el, { x: 0, y: 0, scale: 0.05 }, { x: () => cos * exit(), y: () => sin * exit(), scale: END_SCALE, duration: 1, ease: "power1.in" }, at)
      .fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.12, ease: "none" }, at);
  });
  gsap.fromTo(".circles", { rotate: -20, scale: 0.9 }, { rotate: 20, scale: 1.05, ease: "none", scrollTrigger: { trigger: ".values", start: "top bottom", end: "bottom top", scrub: true } });
  gsap.from(".values-title", { opacity: 0, y: 40, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: ".values", start: "top 40%" } });

  /* ---------- Números ---------- */
  $$("[data-count]").forEach((el) =>
    ScrollTrigger.create({ trigger: el, start: "top 85%", once: true, onEnter: () => countUp(el) })
  );

  /* ---------- Productos ---------- */
  gsap.fromTo(".bm-1", { xPercent: 0 }, { xPercent: -30, ease: "none", scrollTrigger: { trigger: ".big-marquee", start: "top bottom", end: "bottom top", scrub: true } });
  gsap.fromTo(".bm-2", { xPercent: -35 }, { xPercent: -5, ease: "none", scrollTrigger: { trigger: ".big-marquee", start: "top bottom", end: "bottom top", scrub: true } });
  $$(".product-list li").forEach((li) => {
    gsap.from(li.querySelector("h3"), { yPercent: 60, opacity: 0, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: li, start: "top 92%" } });
  });

  // Al pasar por una fila entra una cinta desde el lado por donde llega el mouse
  // (arriba o abajo) y sale por donde se va. En pantallas táctiles se activa
  // la fila que cruza el centro de la pantalla.
  const rowTween = (li, show, fromTop) => {
    const mq = li.querySelector(".p-mq");
    const inner = li.querySelector(".p-mq-inner");
    const edge = fromTop ? -101 : 101;
    gsap.killTweensOf([mq, inner]);
    if (show) {
      li.classList.add("active");
      gsap.fromTo(mq, { yPercent: edge }, { yPercent: 0, duration: 0.6, ease: "expo.out" });
      gsap.fromTo(inner, { yPercent: -edge }, { yPercent: 0, duration: 0.6, ease: "expo.out" });
    } else {
      gsap.to(mq, { yPercent: edge, duration: 0.6, ease: "expo.out" });
      gsap.to(inner, { yPercent: -edge, duration: 0.6, ease: "expo.out", onComplete: () => li.classList.remove("active") });
    }
  };
  const rows = $$("#productList li");
  rows.forEach((li) => {
    gsap.set(li.querySelector(".p-mq"), { yPercent: 101 });
    gsap.set(li.querySelector(".p-mq-inner"), { yPercent: -101 });
    if (!finePointer) return;
    const fromTop = (e) => { const r = li.getBoundingClientRect(); return e.clientY < r.top + r.height / 2; };
    li.addEventListener("pointerenter", (e) => rowTween(li, true, fromTop(e)));
    li.addEventListener("pointerleave", (e) => rowTween(li, false, fromTop(e)));
  });
  if (!finePointer) {
    let activeRow = null, lastY = scrollY;
    ScrollTrigger.create({
      trigger: "#productList", start: "top 60%", end: "bottom 40%",
      onUpdate: (st) => {
        const mid = innerHeight / 2;
        const next = st.isActive ? rows.find((li) => { const r = li.getBoundingClientRect(); return r.top <= mid && r.bottom > mid; }) || null : null;
        const down = scrollY >= lastY;
        lastY = scrollY;
        if (next === activeRow) return;
        if (activeRow) rowTween(activeRow, false, down);
        if (next) rowTween(next, true, !down);
        activeRow = next;
      },
      onToggle: (st) => { if (!st.isActive && activeRow) { rowTween(activeRow, false, st.direction > 0); activeRow = null; } },
    });
  }

  /* ---------- Ventana de productos: se abre y pasa fotos ---------- */
  const SLIDE_NAMES = ["Walls", "Walls", "Pantallas gigantes", "Pantallas gigantes"];
  const frame = $("#scFrame");
  const slides = $$(".sc-slide");
  const scBars = $$("#scBars i");
  const scName = $("#scName");
  const scIndex = $("#scIndex");
  const win = { t: 34, x: 12, r: 50 };
  const applyWin = () => {
    frame.style.setProperty("--it", `${win.t}%`);
    frame.style.setProperty("--ib", `${win.t * 0.3}%`);
    frame.style.setProperty("--ix", `${win.x}%`);
    frame.style.setProperty("--r", `${win.r}vw`);
  };
  applyWin();
  let current = -1;
  const setSlide = (i) => {
    if (i === current) return;
    current = i;
    scName.textContent = SLIDE_NAMES[i];
    scIndex.textContent = `(${String(i + 1).padStart(2, "0")}/${String(slides.length).padStart(2, "0")})`;
    gsap.fromTo(scName, { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.6, ease: "expo.out" });
  };
  setSlide(0);

  const sc = gsap.timeline({
    scrollTrigger: {
      trigger: "#showcase",
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: (st) => {
        // Primer 20%: se abre la ventana. Resto: una foto por tramo.
        const p = gsap.utils.clamp(0, 0.9999, (st.progress - 0.2) / 0.8);
        const seg = p * slides.length;
        const idx = Math.floor(seg);
        scBars.forEach((b, k) => b.style.setProperty("--p", k < idx ? 1 : k === idx ? seg - idx : 0));
        setSlide(Math.min(slides.length - 1, Math.max(0, Math.round(seg - 0.35))));
      },
    },
  });
  sc.to(win, { t: 2.5, x: 2.5, r: 2, duration: 0.2, ease: "none", onUpdate: applyWin }, 0);
  sc.to(".sc-caption, .sc-bars", { opacity: 1, duration: 0.05, ease: "none" }, 0.15);
  sc.fromTo($("img", slides[0]), { "--s": 1.3 }, { "--s": 1, duration: 0.2, ease: "none" }, 0);
  slides.slice(1).forEach((s, i) => {
    const at = 0.2 + (0.8 / slides.length) * (i + 0.6);
    sc.fromTo(s, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.12, ease: "none" }, at);
    sc.fromTo($("img", s), { "--s": 1.3 }, { "--s": 1, duration: 0.2, ease: "none" }, at);
  });
  sc.to({}, { duration: 0.001 }, 1);

  /* ---------- Cobertura: animación con el scroll ---------- */
  gsap
    .timeline({
      scrollTrigger: {
        trigger: "#cobertura", start: "top top", end: "bottom bottom", scrub: 0.5, invalidateOnRefresh: true,
        onRefresh: () => {
          measureDraw();
          const target = camFor(filter);
          placeLabels(routeLabels, target);
          if (filter) buildFilterLabels(filter, target);
          if (!camTween || !camTween.isActive()) Object.assign(cam, target);
          applyCam();
        },
        onUpdate: () => { if (cardFor) hideCard(); },
      },
      onUpdate() { updateCoverage(this.progress()); },
    })
    .to({}, { duration: 1 });
  // Al salir de la sección, el mapa vuelve a mostrar todos los soportes
  ScrollTrigger.create({
    trigger: "#cobertura", start: "top bottom", end: "bottom top",
    onLeave: () => filter && setFilter(null, false),
    onLeaveBack: () => filter && setFilter(null, false),
  });
  measureDraw();
  placeLabels(routeLabels, FULL);
  applyCam();
  updateCoverage(0);
  window.addEventListener("resize", () => requestAnimationFrame(applyCam));

  /* ---------- Galería horizontal ---------- */
  const track = $("#galleryTrack");
  const distance = () => Math.max(0, track.scrollWidth - innerWidth);
  gsap.to(track, {
    x: () => -distance(),
    ease: "none",
    scrollTrigger: { trigger: "#gallery", start: "center center", end: () => `+=${distance()}`, pin: "#proyectos", scrub: 1, invalidateOnRefresh: true },
  });

  /* ---------- Contacto ---------- */
  gsap.from(".contact-big span", { yPercent: 100, duration: 1.4, ease: "expo.out", scrollTrigger: { trigger: ".contact", start: "top 70%" } });
  gsap.from(".footer-mark", { yPercent: 30, ease: "none", scrollTrigger: { trigger: ".footer-mark", start: "top bottom", end: "bottom bottom", scrub: true } });

  window.addEventListener("load", () => ScrollTrigger.refresh());
})();
