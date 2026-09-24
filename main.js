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

  /* ---------- Sin GSAP (CDN caído): mostrar todo estático ---------- */
  if (!hasGsap) {
    $("#loader").remove();
    document.body.classList.remove("is-loading");
    $$(".fade-in").forEach((el) => (el.style.opacity = 1));
    aboutWords.flat().forEach((w) => w.classList.add("on"));
    $$("[data-count]").forEach(countUp);
    $$(".sc-slide").forEach((s) => (s.style.clipPath = "none"));
    $$(".m-deps path").forEach((p) => p.classList.add("lit"));
    $$(".m-roads path").forEach((p) => (p.style.opacity = 0.85));
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

  /* ---------- Cobertura: mapa de Uruguay ---------- */
  // Proyección igual a la usada para generar el SVG (Natural Earth, dominio público).
  const LON0 = -58.5, LAT0 = -30, COS = Math.cos((32.5 * Math.PI) / 180), K = 100;
  const project = (lon, lat) => [(lon - LON0) * COS * K, (LAT0 - lat) * K];
  // TODO: reemplazar por el listado real de soportes (coordenadas aproximadas por esquina).
  const SITES = [
    { type: "walls", name: "Wall Av. Italia", addr: "Av. Italia y Caldas", lon: -56.11, lat: -34.886, img: "assets/hero/home.jpg", pos: "above" },
    { type: "walls", name: "Wall Batlle y Ordóñez", addr: "Av. José Batlle y Ordóñez y Av. Rivera", lon: -56.137, lat: -34.898, img: "assets/hero/9691.jpg", pos: "below" },
    { type: "walls", name: "Wall 18 de Julio", addr: "Av. 18 de Julio y Roxlo", lon: -56.172, lat: -34.9025, img: "assets/proyectos/schneck.png", pos: "left" },
    { type: "duty", name: "Aeropuerto de Carrasco", addr: "Duty Select · pantallas en free shop", lon: -56.0308, lat: -34.8384, img: "assets/video.jpg", pos: "right", label: "Carrasco" },
    { type: "duty", name: "Aeropuerto de Punta del Este", addr: "Duty Select · pantallas en free shop", lon: -55.0943, lat: -34.8551, img: "assets/video.jpg", pos: "left", late: true, label: "Punta del Este" },
  ];
  const mapSvg = $("#mapSvg");
  const covMap = $("#covMap");
  const depPaths = $$(".m-deps path");
  const pins = SITES.map((site) => {
    const el = document.createElement("div");
    el.className = `pin ${site.pos}`;
    el.dataset.type = site.type;
    el.innerHTML = `<i></i><b>(${site.label || site.name.replace(/^Wall /, "")})</b><div class="pin-card"><img src="${site.img}" alt="" /><div><strong>${site.name}</strong><span>${site.addr}</span></div></div>`;
    el.addEventListener("click", () => { pins.forEach((p) => p.el !== el && p.el.classList.remove("open")); el.classList.toggle("open"); });
    $("#covPins").appendChild(el);
    return { el, site, xy: project(site.lon, site.lat) };
  });
  const placePins = () => {
    const ctm = mapSvg.getScreenCTM();
    const box = covMap.getBoundingClientRect();
    if (!ctm) return;
    const pt = mapSvg.createSVGPoint();
    pins.forEach((p) => {
      pt.x = p.xy[0]; pt.y = p.xy[1];
      const s = pt.matrixTransform(ctm);
      p.el.style.transform = `translate(${s.x - box.left}px, ${s.y - box.top}px)`;
    });
  };

  // Cámara: todo el país → Montevideo → costa sur
  const RATIO = 502 / 459;
  const cam = { cx: 229.5, cy: 251, w: 459 };
  const applyCam = () => {
    const h = cam.w * RATIO;
    mapSvg.setAttribute("viewBox", `${cam.cx - cam.w / 2} ${cam.cy - h / 2} ${cam.w} ${h}`);
    placePins();
  };
  const [mvdX, mvdY] = project(-56.1, -34.875);
  const [surX, surY] = project(-55.6, -34.82);

  const covCount = $("#covCount"), covDep = $("#covDep"), covZone = $("#covZone");
  const drawLens = () => {
    const scale = mapSvg.getScreenCTM()?.a || 1;
    depPaths.forEach((p) => { const l = p.getTotalLength() * scale; p.dataset.len = l; if (lastLit < 1) { p.style.strokeDasharray = `${l} ${l}`; p.style.strokeDashoffset = l; } });
  };
  let lastLit = -1;
  const covTl = gsap.timeline({
    scrollTrigger: {
      trigger: "#cobertura", start: "top top", end: "bottom bottom", scrub: 0.5,
      onRefresh: () => { drawLens(); applyCam(); },
      onUpdate: (st) => {
        const p = st.progress;
        // 1) trazo de los departamentos
        const draw = gsap.utils.clamp(0, 1, p / 0.2);
        depPaths.forEach((path, i) => {
          const local = gsap.utils.clamp(0, 1, draw * 1.6 - (i / depPaths.length) * 0.6);
          const len = +path.dataset.len;
          path.style.strokeDashoffset = local >= 1 ? 0 : len * (1 - local);
          path.style.strokeDasharray = local >= 1 ? "none" : `${len} ${len}`;
        });
        // 2) se encienden uno por uno, de Montevideo al norte
        const lit = Math.round(gsap.utils.clamp(0, 1, (p - 0.2) / 0.28) * depPaths.length);
        if (lit !== lastLit) {
          lastLit = lit;
          depPaths.forEach((path, i) => path.classList.toggle("lit", i < lit));
          covCount.textContent = lit;
          covDep.textContent = lit === 0 ? "\u00a0" : lit === depPaths.length ? "Todo el país" : depPaths[lit - 1].dataset.name;
        }
        // 4-5) puntos según la zona
        pins.forEach((pn) => pn.el.classList.toggle("show", p > (pn.site.late ? 0.9 : 0.72)));
        $("#cobertura").classList.toggle("far", p > 0.86);
        covZone.textContent = p > 0.84 ? "(Costa sur)" : p > 0.64 ? "(Montevideo)" : "(Uruguay)";
      },
    },
  });
  covTl
    .to(".m-roads path", { opacity: 0.85, duration: 0.08, ease: "none" }, 0.5)
    .to(cam, { cx: mvdX, cy: mvdY, w: 34, duration: 0.16, ease: "power2.inOut", onUpdate: applyCam }, 0.6)
    .to(cam, { cx: surX, cy: surY, w: 150, duration: 0.12, ease: "power2.inOut", onUpdate: applyCam }, 0.84)
    .to({}, { duration: 0.04 }, 0.96);
  window.addEventListener("resize", () => requestAnimationFrame(applyCam));

  $("#covFilters").addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    $$("#covFilters button").forEach((b) => b.classList.toggle("on", b === btn));
    const cov = $("#cobertura");
    ["walls", "duty", "rutas"].forEach((f) => cov.classList.toggle(`f-${f}`, btn.dataset.f === f));
  });

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
