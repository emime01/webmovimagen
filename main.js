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
      if (el.matches(".m-deps path.lit")) return false;
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
  // Misma proyección que se usó para generar el SVG (límites de Natural Earth, dominio público).
  const LON0 = -58.5, LAT0 = -30, COS = Math.cos((32.5 * Math.PI) / 180), K = 100;
  const project = (lat, lng) => [(lng - LON0) * COS * K, (LAT0 - lat) * K];
  const RATIO = 502 / 459;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp01 = (p, a, b) => clamp((p - a) / (b - a), 0, 1);
  const clean = (t) => t.replace(/\s*⟲/g, "").trim();
  const fmtKm = (n) => String(n).replace(".", ",");
  const DATA = Object.assign({ ruteros: [], shoppings: [], pantallas: [], walls: [] }, window.SOPORTES);
  const TYPE_LABEL = { shopping: "Shopping", rutero: "Rutero", pantalla: "Pantalla gigante", wall: "Wall" };
  const ORDER = { shopping: 0, rutero: 1, pantalla: 2, wall: 3 };

  const sites = [
    ...DATA.shoppings.map(([name, n, lat, lng]) => {
      const pde = /punta del este/i.test(name);
      return { type: "shopping", lat, lng, n, title: clean(name).replace(/\s*Punta del Este$/i, ""), detail: `${pde ? "Punta del Este · " : ""}${n} soportes` };
    }),
    ...DATA.ruteros.map(([name, route, km, dir, size, lat, lng]) => {
      const extra = clean(name).split(" · ")[1];
      const kmTxt = (clean(name).match(/km\s*([\d.]+)/i) || [])[1] || km;
      return { type: "rutero", lat, lng, route, km, title: `${route} km ${kmTxt}`, detail: [`Sentido ${dir}`, extra && extra !== dir ? extra : "", size].filter(Boolean).join(" · ") };
    }),
    ...DATA.pantallas.map(([place, kind, lat, lng]) => ({ type: "pantalla", lat, lng, title: place, detail: kind })),
    ...DATA.walls.map(([place, lat, lng]) => ({ type: "wall", lat, lng, title: place, detail: "Medianera" })),
  ].map((site) => ({ ...site, xy: project(site.lat, site.lng) }));

  const countOf = (t) => sites.filter((x) => x.type === t).length;
  const totalSoportes = sites.reduce((n, x) => n + (x.type === "shopping" ? x.n : 1), 0);
  const ib = sites.filter((x) => x.type === "rutero" && x.route === "Interbalnearia").sort((a, b) => a.km - b.km);
  const mvdSites = sites.filter((x) => (x.type === "pantalla" || x.type === "wall") && x.lng < -56 && x.lng > -56.45 && x.lat > -34.95 && x.lat < -34.8);
  const pdeSites = sites.filter((x) => x.lng > -55.02);
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const mvdP = mvdSites.filter((x) => x.type === "pantalla").length, mvdW = mvdSites.length - mvdP;
  const CAPTIONS = {
    start: ["Uruguay", "Presencia en todo el país."],
    light: "Presencia en los 19 departamentos.",
    points: ["Todo el país", `${totalSoportes} soportes fijos en el mapa. ${finePointer ? "Pasá el mouse por un punto" : "Tocá un punto"} para ver el detalle.`],
    mvd: ["Montevideo", `${plural(mvdP, "pantalla gigante", "pantallas gigantes")} y ${plural(mvdW, "wall", "walls")} en puntos estratégicos de la ciudad.`],
    costa: ["Interbalnearia", ib.length ? `${ib.length} ruteros entre el km ${fmtKm(ib[0].km)} y el km ${fmtKm(ib[ib.length - 1].km)}, camino a Punta del Este.` : ""],
    end: ["Todo el país", `${plural(countOf("rutero"), "rutero", "ruteros")}, ${plural(countOf("shopping"), "shopping", "shoppings")}, ${plural(countOf("pantalla"), "pantalla gigante", "pantallas gigantes")} y ${plural(countOf("wall"), "wall", "walls")}, de Salto a Punta del Este.`],
  };

  // Leyenda (sin filtros: todos los soportes se ven siempre)
  const LEGEND = [["rutero", "Ruteros"], ["shopping", "Shoppings"], ["pantalla", "Pantallas gigantes"], ["wall", "Walls"]];
  $("#covLegend").innerHTML = LEGEND.map(([t, name]) => `<li><i class="shape shape-${t}"></i>${name} <span data-n="${countOf(t)}">(0)</span></li>`).join("");
  const legendNums = $$("#covLegend span");

  // Marcadores: aparecen de oeste a este, primero los shoppings y después los ruteros
  const covMap = $("#covMap");
  const mapSvg = $("#mapSvg");
  const pinsLayer = $("#covPins");
  const markers = sites
    .slice()
    .sort((a, b) => ORDER[a.type] - ORDER[b.type] || a.lng - b.lng)
    .map((site, i, arr) => {
      const el = document.createElement("div");
      el.className = `mk mk-${site.type}${site.type === "rutero" ? "" : " ping"}`;
      el.innerHTML = `<i>${site.type === "shopping" ? site.n : ""}</i>`;
      el.setAttribute("role", "button");
      el.setAttribute("tabindex", "-1");
      el.setAttribute("aria-label", `${TYPE_LABEL[site.type]}: ${site.title}. ${site.detail}`);
      el.style.setProperty("--d", `${(i % 6) * 0.35}s`);
      pinsLayer.appendChild(el);
      return { el, site, at: (i + 1) / arr.length, shown: false, sx: 0, sy: 0 };
    });

  // Etiquetas por zona
  const makeLabel = (xy, text, zone) => {
    const el = document.createElement("div");
    el.className = `mk-anchor l-${zone}`;
    el.innerHTML = `<span class="mk-label">${text}</span>`;
    pinsLayer.appendChild(el);
    return { el, xy, text, n: 1 };
  };
  const mvdLabels = [];
  mvdSites.forEach((x) => {
    const near = mvdLabels.find((l) => Math.hypot(l.xy[0] - x.xy[0], l.xy[1] - x.xy[1]) < 0.3);
    if (near) { near.n += 1; near.el.firstChild.textContent = `${near.text} (${near.n})`; }
    else mvdLabels.push(makeLabel(x.xy, x.title, "mvd"));
  });
  const clusters = [];
  ib.forEach((x) => { const c = clusters[clusters.length - 1]; if (c && x.km - c[c.length - 1].km <= 3) c.push(x); else clusters.push([x]); });
  const avgXY = (list) => [list.reduce((a, x) => a + x.xy[0], 0) / list.length, list.reduce((a, x) => a + x.xy[1], 0) / list.length];
  const costaLabels = clusters
    .filter((c) => c.length >= 4)
    .map((c) => makeLabel(avgXY(c), `km ${fmtKm(c[0].km)}–${fmtKm(c[c.length - 1].km)} (${c.length})`, "costa"));
  if (pdeSites.length) costaLabels.push(makeLabel(avgXY(pdeSites), "Punta del Este", "costa"));
  const allLabels = [...mvdLabels, ...costaLabels];

  // Cámaras: todo el país → Montevideo → Interbalnearia → todo el país
  const bbox = (list) => {
    const xs = list.map((x) => x.xy[0]), ys = list.map((x) => x.xy[1]);
    return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  };
  const mvdBox = mvdSites.length ? bbox(mvdSites) : { x0: 195, x1: 200, y0: 488, y1: 491 };
  const costaBox = bbox([...ib, ...pdeSites].length ? [...ib, ...pdeSites] : sites);
  const CAMS = {
    full: () => ({ cx: 229.5, cy: 251, w: 459 * 1.14 }), // margen para que la costa no caiga en el borde difuminado
    mvd: () => ({ cx: (mvdBox.x0 + mvdBox.x1) / 2, cy: (mvdBox.y0 + mvdBox.y1) / 2, w: Math.max((mvdBox.x1 - mvdBox.x0) * 1.7, covMap.clientWidth / 60) }),
    costa: () => ({ cx: (costaBox.x0 + costaBox.x1) / 2, cy: (costaBox.y0 + costaBox.y1) / 2 - 4, w: Math.max(90, (costaBox.x1 - costaBox.x0) * 1.3) }),
  };
  const cam = CAMS.full();

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
    allLabels.forEach((l) => put(l.el, l.xy));
  };
  const applyCam = () => {
    const h = cam.w * RATIO;
    mapSvg.setAttribute("viewBox", `${cam.cx - cam.w / 2} ${cam.cy - h / 2} ${cam.w} ${h}`);
    placeAll();
  };

  // Ubica cada etiqueta (derecha, izquierda, arriba o abajo) donde no pise a otra,
  // calculado para la vista final de su zona. Si no entra, no se muestra.
  const placeLabels = (labels, target) => {
    const bw = covMap.clientWidth, bh = covMap.clientHeight;
    const scale = bw / target.w;
    const vbx = target.cx - target.w / 2, vby = target.cy - (target.w * RATIO) / 2;
    const toScreen = (xy) => [(xy[0] - vbx) * scale, (xy[1] - vby) * scale];
    const dots = markers.map((m) => { const [x, y] = toScreen(m.site.xy); return [x - 7, y - 7, x + 7, y + 7]; });
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
      l.el.dataset.pos = "none";
      // Primero busca un lugar que no tape etiquetas ni puntos; si no hay, alcanza con no tapar etiquetas.
      for (const avoidDots of [true, false]) {
        const found = Object.entries(opts).find(([, [lx, ly]]) => {
          const r = [lx, ly, lx + w, ly + h];
          const inside = lx > 6 && ly > 6 && r[2] < bw - 6 && r[3] < bh - 6;
          return inside && !overlaps(r, taken, 5) && !(avoidDots && overlaps(r, dots, 1));
        });
        if (found) { l.el.dataset.pos = found[0]; const [lx, ly] = found[1]; taken.push([lx, ly, lx + w, ly + h]); break; }
      }
    });
  };

  // Tarjeta de detalle: si hay varios soportes juntos, los lista a todos
  const covCard = $("#covCard");
  const covSticky = $("#covSticky");
  let cardFor = null, hideTimer;
  const showCard = (m) => {
    clearTimeout(hideTimer);
    markers.forEach((o) => o.el.classList.toggle("active", o === m));
    const near = markers
      .filter((o) => o.shown && Math.hypot(o.sx - m.sx, o.sy - m.sy) < 16)
      .sort((a, b) => ORDER[a.site.type] - ORDER[b.site.type] || (a.site.km || 0) - (b.site.km || 0));
    const list = near.length ? near : [m];
    if (list.length === 1) {
      const x = list[0].site;
      covCard.innerHTML = `<p class="cc-tag">(${TYPE_LABEL[x.type]})</p><p class="cc-title">${x.title}</p><p class="cc-detail">${x.detail}</p>`;
    } else {
      const MAX = 6;
      const items = list.slice(0, MAX).map(({ site: x }) => `<li><strong>${x.title}</strong><span>${TYPE_LABEL[x.type]} · ${x.detail}</span></li>`).join("");
      covCard.innerHTML = `<p class="cc-tag">(${list.length} soportes en esta zona)</p><ul class="cc-list">${items}</ul>${list.length > MAX ? `<p class="cc-more">y ${list.length - MAX} más</p>` : ""}`;
    }
    const sb = covSticky.getBoundingClientRect(), mb = covMap.getBoundingClientRect();
    const x = mb.left - sb.left + m.sx, y = mb.top - sb.top + m.sy;
    const w = covCard.offsetWidth, h = covCard.offsetHeight;
    covCard.classList.toggle("below", y - h - 24 < 64);
    covCard.style.left = `${clamp(x, w / 2 + 12, sb.width - w / 2 - 12)}px`;
    covCard.style.top = `${y}px`;
    covCard.classList.add("show");
    cardFor = m;
  };
  const hideCard = () => {
    covCard.classList.remove("show");
    markers.forEach((o) => o.el.classList.remove("active"));
    cardFor = null;
  };
  markers.forEach((m) => {
    if (finePointer) {
      m.el.addEventListener("pointerenter", () => showCard(m));
      m.el.addEventListener("pointerleave", () => { hideTimer = setTimeout(hideCard, 150); });
    }
    m.el.addEventListener("click", (e) => { e.stopPropagation(); cardFor === m ? hideCard() : showCard(m); });
    m.el.addEventListener("focus", () => showCard(m));
    m.el.addEventListener("blur", () => { hideTimer = setTimeout(hideCard, 150); });
  });
  document.addEventListener("click", (e) => { if (cardFor && !e.target.closest(".mk")) hideCard(); });

  // Estado del mapa según el avance del scroll (0 → 1)
  const depPaths = $$(".m-deps path");
  const roadsLayer = $(".m-roads");
  const covSection = $("#cobertura");
  const covCount = $("#covCount"), covZone = $("#covZone"), covText = $("#covText");
  const measureDraw = () => {
    const scale = covMap.clientWidth / CAMS.full().w; // px por unidad con el país entero a la vista
    depPaths.forEach((path) => (path.dataset.len = path.getTotalLength() * scale));
  };
  let lastLit = -1, lastCaption = "", lastPoints = -1;
  const setCaption = (zone, text, animate = true) => {
    if (zone + text === lastCaption) return;
    lastCaption = zone + text;
    covZone.textContent = zone;
    covText.textContent = text;
    if (animate && hasGsap) gsap.fromTo([covZone, covText], { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.05, ease: "expo.out", overwrite: true });
  };
  const updateCoverage = (p) => {
    // 1) se dibujan los departamentos
    const draw = lerp01(p, 0, 0.12);
    depPaths.forEach((path, i) => {
      const len = +path.dataset.len;
      if (!len) return;
      const local = clamp(draw * 1.6 - (i / depPaths.length) * 0.6, 0, 1);
      path.style.strokeDasharray = local >= 1 ? "none" : `${len} ${len}`;
      path.style.strokeDashoffset = local >= 1 ? 0 : len * (1 - local);
    });
    // 2) se pintan de naranja, de Montevideo al norte, y el contador llega a 19
    const lit = Math.round(lerp01(p, 0.1, 0.3) * depPaths.length);
    if (lit !== lastLit) {
      lastLit = lit;
      depPaths.forEach((path, i) => path.classList.toggle("lit", i < lit));
      covCount.textContent = lit;
    }
    // 3) rutas
    roadsLayer.style.opacity = lerp01(p, 0.3, 0.36);
    // 4) aparecen los soportes y la leyenda cuenta
    const pts = lerp01(p, 0.34, 0.46);
    markers.forEach((m) => {
      const on = pts >= m.at;
      if (on !== m.shown) { m.shown = on; m.el.classList.toggle("show", on); m.el.tabIndex = on ? 0 : -1; }
    });
    const ptsKey = Math.round(pts * 100);
    if (ptsKey !== lastPoints) {
      lastPoints = ptsKey;
      legendNums.forEach((el) => (el.textContent = `(${Math.round(+el.dataset.n * pts)})`));
    }
    // 5) etiquetas de cada zona
    covSection.classList.toggle("z-mvd", p > 0.58 && p < 0.67);
    covSection.classList.toggle("z-costa", p > 0.74 && p < 0.85);
    if (p < 0.1) setCaption(...CAPTIONS.start);
    else if (p < 0.3) setCaption(depPaths[Math.max(0, lit - 1)].dataset.name, CAPTIONS.light, false);
    else if (p < 0.5) setCaption(...CAPTIONS.points);
    else if (p < 0.66) setCaption(...CAPTIONS.mvd);
    else if (p < 0.84) setCaption(...CAPTIONS.costa);
    else setCaption(...CAPTIONS.end);
  };

  /* ---------- Sin GSAP (CDN caído): mostrar todo estático ---------- */
  if (!hasGsap) {
    $("#loader").remove();
    document.body.classList.remove("is-loading");
    $$(".fade-in").forEach((el) => (el.style.opacity = 1));
    aboutWords.flat().forEach((w) => w.classList.add("on"));
    $$("[data-count]").forEach(countUp);
    $$(".sc-slide").forEach((s) => (s.style.clipPath = "none"));
    covSection.style.height = "auto";
    applyCam();
    updateCoverage(1);
    window.addEventListener("resize", applyCam);
    updateTheme();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  /* ---------- Scroll suave ---------- */
  let lenis;
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
  const covTl = gsap.timeline({
    scrollTrigger: {
      trigger: "#cobertura", start: "top top", end: "bottom bottom", scrub: 0.5, invalidateOnRefresh: true,
      onRefresh: () => {
        measureDraw();
        placeLabels(mvdLabels, CAMS.mvd());
        placeLabels(costaLabels, CAMS.costa());
        applyCam();
      },
      onUpdate: () => { if (cardFor) hideCard(); },
    },
    onUpdate() { updateCoverage(this.progress()); },
  });
  const camTo = (name, at) => covTl.to(cam, { cx: () => CAMS[name]().cx, cy: () => CAMS[name]().cy, w: () => CAMS[name]().w, duration: 0.1, ease: "power2.inOut", onUpdate: applyCam }, at);
  camTo("mvd", 0.5);
  camTo("costa", 0.66);
  camTo("full", 0.84);
  covTl.to({}, { duration: 0.06 }, 0.94);
  measureDraw();
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
