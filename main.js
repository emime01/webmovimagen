(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const hasGsap = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* ---------- Idioma (español / inglés) ---------- */
  // El español está en el HTML; el inglés y los textos que arma el código, en i18n.js.
  const DICT = Object.assign({ en: {}, ui: { es: {}, en: {} } }, window.I18N);
  const readLang = () => {
    const q = new URLSearchParams(location.search).get("lang");
    if (q === "es" || q === "en") return q;
    try { const saved = localStorage.getItem("mv-lang"); if (saved === "es" || saved === "en") return saved; } catch (e) { /* sin almacenamiento */ }
    return "es";
  };
  let LANG = readLang();
  const T = (key, vars, fallback) => {
    let s = DICT.ui[LANG]?.[key] ?? DICT.ui.es?.[key] ?? fallback ?? key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ""));
    return s;
  };
  const staticEls = $$("[data-i18n]");
  const ES_TEXT = new Map(staticEls.map((el) => [el, el.innerHTML]));
  const attrEls = $$("[data-i18n-attr]");
  const ES_ATTR = new Map(attrEls.map((el) => [el, el.dataset.i18nAttr.split(";").map((pair) => {
    const [attr, key] = pair.split(":").map((x) => x.trim());
    return { attr, key, es: el.getAttribute(attr) };
  })]));
  const metaDesc = $('meta[name="description"]');
  const ES_META = { title: document.title, description: metaDesc ? metaDesc.content : "" };
  const applyStatic = () => {
    document.documentElement.lang = LANG;
    staticEls.forEach((el) => (el.innerHTML = LANG === "es" ? ES_TEXT.get(el) : DICT.en[el.dataset.i18n] ?? ES_TEXT.get(el)));
    attrEls.forEach((el) => ES_ATTR.get(el).forEach(({ attr, key, es }) => el.setAttribute(attr, LANG === "es" ? es : DICT.en[key] ?? es)));
    document.title = LANG === "es" ? ES_META.title : DICT.en["meta.title"] ?? ES_META.title;
    if (metaDesc) metaDesc.content = LANG === "es" ? ES_META.description : DICT.en["meta.description"] ?? ES_META.description;
    $$(".lang [data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === LANG)));
  };
  const langListeners = [];
  const onLang = (fn) => langListeners.push(fn);
  const setLang = (lang) => {
    if (lang === LANG) return;
    LANG = lang;
    try { localStorage.setItem("mv-lang", lang); } catch (e) { /* sin almacenamiento */ }
    applyStatic();
    langListeners.forEach((fn) => fn());
  };
  applyStatic();
  $$(".lang [data-lang]").forEach((b) => b.addEventListener("click", () => setLang(b.dataset.lang)));

  const joinList = (arr) => (arr.length > 1 ? `${arr.slice(0, -1).join(", ")} ${T("and")} ${arr[arr.length - 1]}` : arr.join(""));
  // plural(3, "word.cartel") → "3 carteles" / "3 billboards"
  const plural = (n, key) => `${n} ${T(`${key}.${n === 1 ? "one" : "many"}`)}`;
  const fmtNum = (n) => (LANG === "es" ? String(n).replace(".", ",") : String(n));

  document.getElementById("year").textContent = new Date().getFullYear();

  /* ---------- Separar palabras ---------- */
  const splitWords = (el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map((w) => `<span class="w">${w}</span>`).join(" ");
    return $$(".w", el);
  };
  const aboutWords = $$("[data-words]").map((el) => Object.assign(splitWords(el), { el, lastN: 0 }));
  const splitQuotes = () => $$(".t-item blockquote").forEach((q) => splitWords(q).forEach((w, i) => (w.style.transitionDelay = `${i * 0.025}s`)));
  splitQuotes();
  onLang(() => {
    // Se vuelven a separar las palabras del texto nuevo, conservando cuántas estaban encendidas
    aboutWords.forEach((words) => {
      words.splice(0, words.length, ...splitWords(words.el));
      words.forEach((w, i) => w.classList.toggle("on", i < words.lastN));
    });
    splitQuotes();
  });

  /* ---------- Logos de clientes y fotos de proyectos ---------- */
  const LOGOS = Array.from({ length: 33 }, (_, i) => `assets/clientes/c${i + 1}.${i < 21 ? "png" : "jpg"}`);
  $("#logoRows").innerHTML = [LOGOS.slice(0, 17), LOGOS.slice(17)]
    .map((row, r) => {
      const chips = (hidden) => row.map((src) => `<div class="logo-chip"><img src="${src}" alt=""${hidden ? ' aria-hidden="true"' : ' class="logo-alt"'} loading="lazy" /></div>`).join("");
      return `<div class="logo-row${r ? " rev" : ""}">${chips(false)}${chips(true)}</div>`;
    })
    .join("");
  const setImageAlts = () => {
    $$(".logo-alt").forEach((img) => (img.alt = T("clients.alt")));
    $$(".g-item").forEach((g) => ($("img", g).alt = T("proj.alt", { name: $("h3", g).textContent })));
  };
  setImageAlts();
  onLang(setImageAlts);

  /* ---------- Cintas de productos ---------- */
  const productRows = $$("#productList li");
  const buildBand = (li) => {
    const old = li.querySelector(".p-mq");
    if (old) old.remove();
    const name = li.querySelector("h3").textContent;
    const imgs = li.dataset.imgs.split(",");
    const unit = [0, 1, 2, 3].map((i) => `<span>${name}</span><img src="${imgs[i % imgs.length]}" alt="" loading="lazy" />`).join("");
    li.insertAdjacentHTML("beforeend", `<div class="p-mq" aria-hidden="true"><div class="p-mq-inner"><div class="p-mq-track">${unit}${unit}</div></div></div>`);
    if (hasGsap) {
      const on = li.classList.contains("active");
      gsap.set(li.querySelector(".p-mq"), { yPercent: on ? 0 : 101 });
      gsap.set(li.querySelector(".p-mq-inner"), { yPercent: on ? 0 : -101 });
    }
  };
  productRows.forEach(buildBand);
  onLang(() => productRows.forEach(buildBand));

  /* ---------- Portada: la ciudad ilustrada ---------- */
  // La textura (tools/generar-portada.mjs) trae las líneas en el rojo y, en el azul, el momento en
  // que se dibuja cada una. Con WebGL la ciudad se dibuja sola y brilla donde pasa la luz;
  // sin WebGL queda la versión SVG, quieta.
  const heroCity = (() => {
    const hero = $(".hero");
    const canvas = $("#heroCanvas");
    const city = { progress: 0, light: { x: 0.5, y: 0.35, s: 0 }, ready: false, render() {}, whenReady(fn) { waiting.push(fn); } };
    const waiting = [];
    const fail = () => { hero.classList.remove("is-gl"); city.ready = false; };
    let gl = null;
    try { gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: "low-power" }); } catch (e) { /* sin WebGL */ }
    if (!gl) return city;

    const VERT = `attribute vec2 aPos; varying vec2 vUv;
      void main() { vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5); gl_Position = vec4(aPos, 0.0, 1.0); }`;
    // vis: la línea ya está dibujada; hot: recién dibujada (brilla un momento)
    const FRAG = `
      #ifdef GL_FRAGMENT_PRECISION_HIGH
      precision highp float;
      #else
      precision mediump float;
      #endif
      varying vec2 vUv;
      uniform sampler2D uTex;
      uniform vec2 uTexel;
      uniform float uProgress;
      uniform vec3 uLight;
      uniform vec2 uRadius;
      float vis(float t) { return clamp((uProgress - t) * 60.0, 0.0, 1.0); }
      float hot(float t) { float s = uProgress - t; return clamp(s * 60.0, 0.0, 1.0) * (1.0 - clamp(s * 7.0, 0.0, 1.0)); }
      void main() {
        vec4 c = texture2D(uTex, vUv);
        float glow = 0.0, spark = 0.0;
        for (int i = 0; i < 12; i++) {
          float a = float(i) * 0.5236;
          vec2 o = vec2(cos(a), sin(a)) * uTexel;
          vec4 s1 = texture2D(uTex, vUv + o * 3.0);
          vec4 s2 = texture2D(uTex, vUv + o * 7.0);
          glow += s1.r * vis(s1.b) * 0.6 + s2.r * vis(s2.b) * 0.4;
          spark += s1.r * hot(s1.b) * 0.6 + s2.r * hot(s2.b) * 0.4;
        }
        glow /= 12.0; spark /= 12.0;
        vec2 d = (vUv - uLight.xy) / uRadius;
        float light = uLight.z * exp(-dot(d, d));
        float a = c.r * vis(c.b) * (0.84 + 0.16 * light) + c.r * hot(c.b) * 0.3 + spark * 1.8 + glow * light * 1.1;
        a = clamp(a, 0.0, 1.0);
        gl_FragColor = vec4(a, a, a, a);
      }`;
    const shader = (type, src) => {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null;
    };
    const vs = shader(gl.VERTEX_SHADER, VERT), fs = shader(gl.FRAGMENT_SHADER, FRAG);
    const prog = vs && fs && gl.createProgram();
    if (!prog) return city;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return city;
    gl.useProgram(prog);
    hero.classList.add("is-gl");

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    const u = (name) => gl.getUniformLocation(prog, name);
    const uProgress = u("uProgress"), uLight = u("uLight"), uRadius = u("uRadius");
    gl.uniform1i(u("uTex"), 0);

    const resize = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      const bw = Math.min(Math.round(w * Math.min(window.devicePixelRatio || 1, 2)), 2560);
      canvas.width = bw;
      canvas.height = Math.round((bw * h) / w);
      // La luz es un círculo de ~200 px en pantalla
      const r = Math.min(260, Math.max(150, innerWidth * 0.15));
      gl.uniform2f(uRadius, r / w, r / h);
      city.render();
    };
    let raf = 0;
    const draw = () => {
      raf = 0;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uProgress, city.progress);
      gl.uniform3f(uLight, city.light.x, city.light.y, city.light.s);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    city.render = () => { if (city.ready && !raf) raf = requestAnimationFrame(draw); };
    city.whenReady = (fn) => (city.ready ? fn() : waiting.push(fn));

    const img = new Image();
    img.onload = () => {
      try {
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
        [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach((p) => gl.texParameteri(gl.TEXTURE_2D, p, gl.CLAMP_TO_EDGE));
        [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER].forEach((p) => gl.texParameteri(gl.TEXTURE_2D, p, gl.LINEAR));
        gl.uniform2f(u("uTexel"), 1 / img.naturalWidth, 1 / img.naturalHeight);
        if (gl.getError() !== gl.NO_ERROR) throw new Error("textura");
      } catch (e) {
        // Por ejemplo, abriendo index.html como archivo: el navegador no deja leer la imagen
        fail();
        return;
      }
      city.ready = true;
      resize();
      waiting.splice(0).forEach((fn) => fn());
    };
    img.onerror = fail;
    img.src = "assets/portada/ciudad.webp";
    window.addEventListener("resize", resize);
    canvas.addEventListener("webglcontextlost", fail);
    return city;
  })();

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
  const formNote = $("#formNote");
  $("#quoteForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.target;
    const d = Object.fromEntries(new FormData(form));
    const unit = form.unidad.selectedOptions[0]?.textContent || d.unidad;
    const body = [
      `${T("mail.name")}: ${d.nombre}`,
      `${T("mail.email")}: ${d.email}`,
      `${T("mail.phone")}: ${d.telefono || "-"}`,
      `${T("mail.term")}: ${d.plazo} ${unit}`,
      `${T("mail.start")}: ${d.inicio}  ·  ${T("mail.end")}: ${d.fin}`,
      `${T("mail.budget")}: $ ${d.inversion}`,
      "",
      d.mensaje,
    ].join("\n");
    window.location.href = `mailto:info@movimagen.com?subject=${encodeURIComponent(T("mail.subject", { name: d.nombre }))}&body=${encodeURIComponent(body)}`;
    formNote.textContent = T("form.thanks");
  });
  onLang(() => { if (formNote.textContent) formNote.textContent = T("form.thanks"); });

  /* ---------- Testimonios ---------- */
  const tItems = $$(".t-item");
  const tBars = $("#tBars");
  tBars.innerHTML = tItems.map(() => `<button type="button"><i></i></button>`).join("");
  const barButtons = $$("button", tBars);
  const barFills = $$("i", tBars);
  const labelBars = () => barButtons.forEach((b, i) => b.setAttribute("aria-label", T("testimonial", { n: i + 1 })));
  labelBars();
  onLang(labelBars);
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
  barButtons.forEach((b, i) => b.addEventListener("click", () => showTestimonial(i)));
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

  const DATA = Object.assign({ ruteros: [], shoppings: [], pantallas: [], walls: [], duty: [] }, window.SOPORTES);
  const ORDER = ["rutero", "pantalla", "wall", "shopping", "duty"];
  const typeLabel = (t) => T(`type.${t}.label`);
  const typeTag = (t) => T(`type.${t}.tag`);
  const routeName = (name) => (LANG === "es" ? name : name.replace(/^Ruta /, "Route "));
  const dataT = (s) => (LANG === "en" && DICT.ui.en[`data.${s}`]) || s; // textos de soportes.js en inglés

  const sites = [
    ...DATA.ruteros.map(([name, route, km, dir, size, lat, lng]) => ({
      type: "rutero", lat, lng, route, km, dir, size,
      kmTxt: (clean(name).match(/km\s*([\d.]+)/i) || [])[1] || String(km),
      extra: clean(name).split(" · ")[1],
    })),
    ...DATA.pantallas.map(([place, kind, lat, lng]) => ({ type: "pantalla", lat, lng, place, kind })),
    ...DATA.walls.map(([place, lat, lng]) => ({ type: "wall", lat, lng, place })),
    ...DATA.shoppings.map(([name, n, lat, lng]) => ({ type: "shopping", lat, lng, n, place: clean(name).replace(/\s*Punta del Este$/i, ""), pde: /punta del este/i.test(name) })),
    ...DATA.duty.map(([place, kind, lat, lng]) => ({ type: "duty", lat, lng, place, kind })),
  ].map((site) => ({ ...site, xy: project(site.lat, site.lng) }));
  const airportName = (x) => x.place.replace(/^Aeropuerto de /, "");
  const siteTitle = (x) => {
    if (x.type === "rutero") return `${routeName(x.route)} km ${x.kmTxt}`;
    if (x.type === "duty" && LANG === "en") return `${airportName(x)} Airport`;
    return x.place;
  };
  const siteDetail = (x) => {
    if (x.type === "rutero") return [T(`dir.${x.dir}`, null, x.dir), x.extra && x.extra !== x.dir ? dataT(x.extra) : "", x.size].filter(Boolean).join(" · ");
    if (x.type === "pantalla" || x.type === "duty") return dataT(x.kind);
    if (x.type === "wall") return T("detail.wall");
    return `${x.pde ? "Punta del Este · " : ""}${T("detail.soportes", { n: x.n })}`;
  };

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
  const nDeps = supportDeps.length;
  const ofType = (t) => sites.filter((x) => x.type === t);
  const countOf = (t) => ofType(t).length;
  const shopSoportes = ofType("shopping").reduce((n, x) => n + x.n, 0);
  // Los aeropuertos son circuitos de pantallas: no se suman como un soporte
  const totalSoportes = countOf("rutero") + countOf("pantalla") + countOf("wall") + shopSoportes;

  // Rutas: se muestran solo al elegir Ruteros, con la cantidad de carteles de cada una
  const routeInfo = $$(".m-route").map((g) => {
    const name = g.dataset.route;
    const carteles = sites.filter((x) => x.type === "rutero" && x.route === name).sort((a, b) => a.km - b.km);
    const tramos = [];
    carteles.forEach((x) => { const t = tramos[tramos.length - 1]; if (t && x.km - t[t.length - 1].km <= 3) t.push(x); else tramos.push([x]); });
    return { g, name, carteles, tramos, anchor: carteles.length ? carteles[Math.floor(carteles.length / 2)].xy : null };
  });
  const routesByCount = routeInfo.filter((r) => r.carteles.length).sort((a, b) => b.carteles.length - a.carteles.length);
  const tramoTxt = (t) => (t.length === 1 ? `km ${fmtNum(t[0].km)}` : `km ${fmtNum(t[0].km)}–${fmtNum(t[t.length - 1].km)} · ${t.length}`);
  // Se revelan con un círculo que crece desde Montevideo, de donde salen todas
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
  const routesLayer = $(".m-routes");
  routesLayer.setAttribute("clip-path", "url(#routeClip)");
  const ROUTE_REACH = Math.max(VB_W, VB_H);
  const revealRoutes = (t) => clipCircle.setAttribute("r", t >= 1 ? ROUTE_REACH * 2 : ROUTE_REACH * 0.35 * t);

  // Textos del mapa (se rearman al cambiar de idioma)
  const depCounts = (t) => {
    const c = {};
    ofType(t).forEach((x) => (c[x.dep] = (c[x.dep] || 0) + 1));
    return Object.entries(c).sort((a, b) => b[1] - a[1]);
  };
  // "3 medianeras en Montevideo." o "4 pantallas gigantes: 3 en Montevideo y 1 en Maldonado."
  const byDepText = (t, wordKey) => {
    const parts = depCounts(t);
    const total = plural(countOf(t), wordKey);
    return parts.length === 1 ? `${total} ${T("in")} ${parts[0][0]}.` : `${total}: ${joinList(parts.map(([d, n]) => `${n} ${T("in")} ${d}`))}.`;
  };
  const buildCaptions = () => ({
    start: [T("cap.start.zone"), T("cap.start.text")],
    paint: T("cap.paint", { n: nDeps }),
    hold: [T("cap.hold.zone"), T("cap.hold.text", { total: totalSoportes, n: nDeps, hint: T(finePointer ? "hint.mouse" : "hint.touch") })],
    rutero: [typeLabel("rutero"), `${plural(countOf("rutero"), "word.cartel")} ${T("on")} ${plural(routesByCount.length, "word.ruta")}: ${joinList(routesByCount.map((r) => T("cap.rutero.item", { n: r.carteles.length, route: routeName(r.name) })))}.`],
    pantalla: [typeLabel("pantalla"), byDepText("pantalla", "type.pantalla")],
    wall: [typeLabel("wall"), byDepText("wall", "word.medianera")],
    shopping: [typeLabel("shopping"), `${plural(shopSoportes, "word.soporte")} ${T("in")} ${plural(countOf("shopping"), "type.shopping")}: ${joinList(ofType("shopping").sort((a, b) => b.n - a.n).map((x) => T("cap.shopping.item", { n: x.n, name: siteTitle(x) })))}.`],
    duty: [typeLabel("duty"), T("cap.duty", { airports: T(countOf("duty") === 1 ? "cap.duty.one" : "cap.duty.many", { names: joinList(ofType("duty").map(airportName)) }) })],
  });
  let CAPTIONS = buildCaptions();

  // Resumen simplificado de un departamento (opcionalmente, de un solo tipo)
  const summaryHTML = (list, onlyType) =>
    ORDER.filter((t) => !onlyType || t === onlyType)
      .map((t) => {
        const xs = list.filter((x) => x.type === t);
        if (!xs.length) return "";
        const shape = `<i class="shape shape-${t}"></i>`;
        if (t === "rutero") return `<li>${shape}<strong>${plural(xs.length, "type.rutero")}</strong><span>${joinList([...new Set(xs.map((x) => routeName(x.route)))])}</span></li>`;
        if (t === "shopping") return `<li>${shape}<strong>${plural(xs.length, "type.shopping")}</strong><span>${joinList(xs.map(siteTitle))} · ${T("detail.soportes", { n: xs.reduce((n, x) => n + x.n, 0) })}</span></li>`;
        if (t === "duty") return xs.map((x) => `<li>${shape}<strong>${T("screens.network")}</strong><span>${siteTitle(x)}</span></li>`).join("");
        return `<li>${shape}<strong>${plural(xs.length, `type.${t}`)}</strong>${onlyType ? `<span>${joinList(xs.map(siteTitle))}</span>` : ""}</li>`;
      })
      .join("");

  // Marcadores: solo se muestran cuando el mapa se filtra desde Productos
  const markerAria = (x) => `${typeTag(x.type)}: ${siteTitle(x)}. ${siteDetail(x)}`;
  const markers = sites
    .filter((x) => x.type !== "rutero")
    .map((site, i) => {
      const el = document.createElement("div");
      el.className = `mk mk-${site.type} ping`;
      el.innerHTML = `<i>${site.type === "shopping" ? site.n : ""}</i>`;
      el.setAttribute("role", "button");
      el.tabIndex = -1;
      el.setAttribute("aria-label", markerAria(site));
      el.style.setProperty("--d", `${(i % 5) * 0.4}s`);
      pinsLayer.appendChild(el);
      return { el, site, shown: false, sx: 0, sy: 0 };
    });

  // Etiquetas (se ubican solas donde no se pisan)
  const makeLabel = (xy, text, kind) => {
    const el = document.createElement("div");
    el.className = `mk-anchor l-${kind}`;
    el.innerHTML = `<span class="mk-label"></span>`;
    el.firstChild.textContent = text;
    pinsLayer.appendChild(el);
    return { el, xy };
  };
  // Las etiquetas de ruta van arriba o abajo de la línea, con un punto que marca el tramo
  const ROUTE_PREFER = ["above", "below", "above-right", "above-left", "below-right", "below-left", "right", "left"];
  const routeLabelText = (r) => `${routeName(r.name)} · ${r.carteles.length}`;
  const routeLabels = routesByCount.map((r) => Object.assign(makeLabel(r.anchor, routeLabelText(r), "route"), { route: r, prefer: ROUTE_PREFER }));
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
    if (animate && hasGsap && !reduceMotion) camTween = gsap.to(cam, { ...target, duration: 1.05, ease: "power3.inOut", onUpdate: applyCam });
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
  // Etiquetas del filtro: los puntos muy juntos se agrupan ("Montevideo · 3")
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
    const center = (g) => [g.reduce((a, x) => a + x.xy[0], 0) / g.length, g.reduce((a, x) => a + x.xy[1], 0) / g.length];
    filterLabels = groups.map((g) => makeLabel(g.length === 1 ? g[0].xy : center(g), g.length === 1 ? siteTitle(g[0]) : `${g[0].dep} · ${g.length}`, "filter"));
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
      ? `<p class="cc-tag">${typeTag(m.site.type)}</p><p class="cc-title">${siteTitle(m.site)}</p><p class="cc-detail">${siteDetail(m.site)}</p>`
      : `<p class="cc-tag">${T("card.zone", { list: plural(list.length, "word.soporte") })}</p><ul class="cc-list">${list.map(({ site: x }) => `<li><strong>${siteTitle(x)}</strong><span>${typeTag(x.type)} · ${siteDetail(x)}</span></li>`).join("")}</ul>`;
    const mb = covMap.getBoundingClientRect();
    const [x, y] = relToSticky(mb.left + m.sx, mb.top + m.sy);
    showCardAt(html, x, y, m);
  };
  const showDepCard = (path, cx, cy) => {
    const list = byDep[path.dataset.name] || [];
    const html = `<p class="cc-title">${path.dataset.name}</p><ul class="cc-sum">${summaryHTML(list, filter)}</ul>`;
    const [x, y] = relToSticky(cx, cy);
    showCardAt(html, x, y, `dep:${path.dataset.name}:${filter}:${LANG}`);
  };
  const showRouteCard = (r, cx, cy) => {
    routeInfo.forEach((o) => o.g.classList.toggle("hover", o === r));
    const html = `<p class="cc-tag">${T("card.route")}</p><p class="cc-title">${routeName(r.name)}</p><p class="cc-detail">${plural(r.carteles.length, "word.cartel")}</p><p class="cc-tramos">${r.tramos.map(tramoTxt).join(" · ")}</p>`;
    const [x, y] = relToSticky(cx, cy);
    showCardAt(html, x, y, r);
  };

  // Estado del mapa
  let filter = null;   // tipo elegido desde Productos
  let holding = false; // terminó el recorrido de entrada: el mapa es interactivo
  let lastP = 0;
  const covCount = $("#covCount"), covZone = $("#covZone"), covText = $("#covText"), covReset = $("#covReset");
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

  // Rutas: aparecen (creciendo desde Montevideo) solo con el filtro de Ruteros
  let routesShown = false, revealTween = null;
  const routeReveal = { t: 0 };
  const showRoutes = (on) => {
    if (on === routesShown) return;
    routesShown = on;
    if (revealTween) revealTween.kill();
    covSection.classList.remove("routes-in");
    routesLayer.classList.toggle("hide", !on);
    if (!on) { routeReveal.t = 0; revealRoutes(0); return; }
    if (hasGsap && !reduceMotion) {
      revealTween = gsap.fromTo(routeReveal, { t: 0 }, {
        t: 1, duration: 1.2, delay: 0.2, ease: "power2.inOut",
        onUpdate: () => revealRoutes(routeReveal.t),
        onComplete: () => covSection.classList.add("routes-in"),
      });
    } else { revealRoutes(1); covSection.classList.add("routes-in"); }
  };
  showRoutes(false);
  routesLayer.classList.add("hide");

  const renderHold = () => {
    covSection.classList.toggle("is-filtered", !!filter);
    covSection.dataset.filter = filter || "";
    covCount.textContent = nDeps;
    setLit((p) => (byDep[p.dataset.name] || []).some((x) => !filter || x.type === filter));
    depPaths.forEach((p) => setDash(p, 0, 1));
    showRoutes(filter === "rutero");
    markers.forEach((m) => {
      const on = !!filter && m.site.type === filter;
      if (on !== m.shown) { m.shown = on; m.el.classList.toggle("show", on); m.el.tabIndex = on ? 0 : -1; }
    });
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

  // Recorrido de entrada según el avance del scroll (0 → 1): se dibujan los
  // departamentos y enseguida se pintan los que tienen soportes.
  const HOLD = 0.6;
  const measureDraw = () => {
    const scale = covMap.clientWidth / FULL.w; // px por unidad con el país entero a la vista
    depPaths.forEach((p) => (p.dataset.len = p.getTotalLength() * scale));
  };
  const updateCoverage = (p) => {
    lastP = p;
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
    showRoutes(false);
    // 1) se dibujan todos los departamentos
    const draw = lerp01(p, 0, 0.2);
    depPaths.forEach((path, i) => setDash(path, +path.dataset.len || 0, clamp(draw * 1.6 - (i / depPaths.length) * 0.6, 0, 1)));
    // 2) se pintan de naranja los que tienen soportes, de sur a norte
    const paint = lerp01(p, 0.14, 0.52);
    const lit = Math.round(paint * supportDeps.length);
    supportDeps.forEach((path, i) => path.classList.toggle("lit", i < lit));
    covCount.textContent = lit;
    if (p < 0.14) setCaption(...CAPTIONS.start);
    else setCaption(supportDeps.length ? supportDeps[Math.max(0, lit - 1)].dataset.name : CAPTIONS.start[0], CAPTIONS.paint, false);
  };

  // Al cambiar de idioma se rearman los textos del mapa
  onLang(() => {
    CAPTIONS = buildCaptions();
    markers.forEach((m) => m.el.setAttribute("aria-label", markerAria(m.site)));
    routeLabels.forEach((l) => (l.el.firstChild.textContent = routeLabelText(l.route)));
    const target = camFor(filter);
    placeLabels(routeLabels, target);
    if (filter) buildFilterLabels(filter, target);
    placeAll();
    hideCard();
    lastCaption = "";
    if (holding) renderHold(); else updateCoverage(lastP);
  });

  // Interacción: departamentos, rutas y marcadores
  depPaths.forEach((path) => {
    const on = () => holding && path.classList.contains("lit");
    path.addEventListener("pointermove", (e) => { if (on() && e.pointerType === "mouse") showDepCard(path, e.clientX, e.clientY); });
    path.addEventListener("pointerleave", () => { if (typeof cardFor === "string" && cardFor.startsWith("dep:")) hideTimer = setTimeout(hideCard, 80); });
    path.addEventListener("click", (e) => { if (!on()) return; e.stopPropagation(); showDepCard(path, e.clientX, e.clientY); });
  });
  routeInfo.forEach((r) => {
    const hit = r.g.querySelector(".r-hit");
    const on = () => holding && routesShown;
    hit.addEventListener("pointermove", (e) => { if (on() && e.pointerType === "mouse") showRouteCard(r, e.clientX, e.clientY); });
    hit.addEventListener("pointerleave", () => { if (cardFor === r) hideTimer = setTimeout(hideCard, 80); });
    hit.addEventListener("click", (e) => { if (!on()) return; e.stopPropagation(); showRouteCard(r, e.clientX, e.clientY); });
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
    const y = top + (covSection.offsetHeight - innerHeight) * 0.82;
    setFilter(f, holding);
    if (lenis) lenis.scrollTo(y, { duration: 1.6 });
    else window.scrollTo({ top: y, behavior: reduceMotion ? "auto" : "smooth" });
  };
  const mapRows = productRows.filter((li) => li.dataset.filter);
  const labelMapRows = () => mapRows.forEach((li) => li.setAttribute("aria-label", T("product.aria", { name: li.querySelector("h3").textContent })));
  mapRows.forEach((li) => {
    li.classList.add("has-map");
    li.setAttribute("role", "link");
    li.tabIndex = 0;
    li.addEventListener("click", () => goToMap(li.dataset.filter));
    li.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); goToMap(li.dataset.filter); } });
  });
  labelMapRows();
  onLang(labelMapRows);

  /* ---------- Sin GSAP (CDN caído): mostrar todo estático ---------- */
  if (!hasGsap) {
    $("#loader").remove();
    document.body.classList.remove("is-loading");
    $$(".fade-in").forEach((el) => (el.style.opacity = 1));
    heroCity.progress = 1.15;
    heroCity.whenReady(heroCity.render);
    aboutWords.forEach((words) => { words.lastN = Infinity; words.forEach((w) => w.classList.add("on")); });
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
  // Al abrirse la portada: el logo sube desde el centro, la ciudad se dibuja y el 30 sale por detrás
  const revealHero = () => {
    const logo = $(".hero-logo");
    const r = logo.getBoundingClientRect();
    gsap.from(logo, { y: innerHeight / 2 - (r.top + r.height / 2), duration: 1.3, ease: "expo.inOut" });
    if ($(".hero").classList.contains("is-gl")) {
      heroCity.whenReady(() => gsap.to(heroCity, { progress: 1.15, duration: reduceMotion ? 0 : 2.8, ease: "power1.inOut", onUpdate: heroCity.render }));
    } else {
      gsap.from(".hero-lines", { opacity: 0, duration: 1.6, ease: "power2.out" });
    }
    gsap.from(".hero-num", { yPercent: 50, opacity: 0, duration: 2.2, delay: reduceMotion ? 0 : 1.3, ease: "expo.out" });
  };
  intro
    .to(".loader-final", { opacity: 1, duration: 0.25 }, `>${STEP}`)
    .to(box, { width: () => innerWidth, height: () => innerHeight, duration: 1.2, ease: "expo.inOut" }, ">0.15")
    .add(finishLoading)
    .add(revealHero)
    .to(".fade-in", { opacity: 1, duration: 1, stagger: 0.08 }, "<1.2");

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
  // El texto del cursor se busca en el idioma activo al pasar por encima
  const bindCursor = (el, key) => {
    el.addEventListener("pointerenter", () => { cursorLabel.textContent = T(`cursor.${key}`); cursor.classList.add("big"); });
    el.addEventListener("pointerleave", () => cursor.classList.remove("big"));
  };
  $$("[data-cursor]").forEach((el) => bindCursor(el, el.dataset.cursor));
  $$(".g-item").forEach((el) => bindCursor(el, "view"));
  mapRows.forEach((el) => bindCursor(el, "map"));

  /* ---------- Portada: luz que sigue al mouse ---------- */
  // La misma luz ilumina el 30 y las líneas de la ciudad
  const heroNum = $(".hero-num");
  const heroCanvas = $("#heroCanvas");
  const light = { x: innerWidth * 0.3, y: innerHeight * 0.3 };
  const applyLight = () => {
    const n = heroNum.getBoundingClientRect();
    heroNum.style.setProperty("--x", `${((light.x - n.left) / n.width) * 100}%`);
    heroNum.style.setProperty("--y", `${((light.y - n.top) / n.height) * 100}%`);
    const c = heroCanvas.getBoundingClientRect();
    heroCity.light.x = (light.x - c.left) / c.width;
    heroCity.light.y = (light.y - c.top) / c.height;
    heroCity.render();
  };
  if (!reduceMotion) heroCity.light.s = 1;
  applyLight();
  if (finePointer && !reduceMotion) {
    // El 30 está más lejos: se corre un poco al revés del mouse
    const numX = gsap.quickTo(".hero-glow", "x", { duration: 1.4, ease: "power3.out" });
    const numY = gsap.quickTo(".hero-glow", "y", { duration: 1.4, ease: "power3.out" });
    $(".hero").addEventListener("pointermove", (e) => {
      gsap.to(light, { x: e.clientX, y: e.clientY, duration: 1.2, ease: "power3.out", overwrite: true, onUpdate: applyLight });
      numX((0.5 - e.clientX / innerWidth) * 36);
      numY((0.5 - e.clientY / innerHeight) * 18);
    });
  } else if (!reduceMotion) {
    // En pantallas táctiles la luz recorre la portada sola (solo mientras se ve)
    const orbit = gsap.to({ t: 0 }, {
      t: Math.PI * 2, duration: 12, repeat: -1, ease: "none",
      onUpdate() {
        const t = this.targets()[0].t, h = $(".hero").offsetHeight;
        light.x = innerWidth * (0.5 + Math.cos(t) * 0.42);
        light.y = h * (0.66 + Math.sin(t) * 0.16);
        applyLight();
      },
    });
    ScrollTrigger.create({ trigger: ".hero", start: "top top", end: "bottom top", onToggle: (st) => orbit.paused(!st.isActive) });
  }
  window.addEventListener("resize", applyLight);
  // Al bajar: la ciudad se acerca (como entrando por la ruta), el 30 se esconde detrás y el logo sube
  const heroOut = { trigger: ".hero", start: "top top", end: "bottom top", scrub: true };
  gsap.to(".hero-city", { scale: 1.14, transformOrigin: "50% 74%", ease: "none", scrollTrigger: { ...heroOut } });
  gsap.to(".hero-glow", { yPercent: 24, ease: "none", scrollTrigger: { ...heroOut } });
  gsap.to(".hero-logo", { yPercent: -120, ease: "none", scrollTrigger: { ...heroOut } });

  /* ---------- Sobre nosotros: palabras que se encienden ---------- */
  aboutWords.forEach((words) => {
    ScrollTrigger.create({
      trigger: words.el,
      start: "top 80%",
      end: "bottom 45%",
      scrub: true,
      onUpdate: (st) => {
        const n = Math.round(st.progress * words.length);
        words.lastN = n;
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
  productRows.forEach((li) => {
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
  if (finePointer) {
    productRows.forEach((li) => {
      const fromTop = (e) => { const r = li.getBoundingClientRect(); return e.clientY < r.top + r.height / 2; };
      li.addEventListener("pointerenter", (e) => rowTween(li, true, fromTop(e)));
      li.addEventListener("pointerleave", (e) => rowTween(li, false, fromTop(e)));
    });
  } else {
    let activeRow = null, lastY = scrollY;
    ScrollTrigger.create({
      trigger: "#productList", start: "top 60%", end: "bottom 40%",
      onUpdate: (st) => {
        const mid = innerHeight / 2;
        const next = st.isActive ? productRows.find((li) => { const r = li.getBoundingClientRect(); return r.top <= mid && r.bottom > mid; }) || null : null;
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
  const SLIDE_KEYS = ["sc.walls", "sc.walls", "sc.screens", "sc.screens"];
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
    scName.textContent = T(SLIDE_KEYS[i]);
    scIndex.textContent = `${String(i + 1).padStart(2, "0")}/${String(slides.length).padStart(2, "0")}`;
    gsap.fromTo(scName, { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.6, ease: "expo.out" });
  };
  setSlide(0);
  onLang(() => (scName.textContent = T(SLIDE_KEYS[Math.max(0, current)])));

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
  // Mientras ScrollTrigger recalcula posiciones (cambio de idioma o de tamaño de ventana)
  // vuelve las animaciones al inicio: el mapa lo ignora y retoma donde estaba.
  let covRefreshing = false;
  const covTl = gsap
    .timeline({
      scrollTrigger: {
        trigger: "#cobertura", start: "top top", end: "bottom bottom", scrub: 0.3, invalidateOnRefresh: true,
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
      onUpdate() { if (!covRefreshing) updateCoverage(this.progress()); },
    })
    .to({}, { duration: 1 });
  ScrollTrigger.addEventListener("refreshInit", () => (covRefreshing = true));
  ScrollTrigger.addEventListener("refresh", () => {
    covRefreshing = false;
    const st = covTl.scrollTrigger;
    const tween = st.getTween && st.getTween();
    if (tween) tween.progress(1);
    covTl.progress(st.progress);
    updateCoverage(st.progress);
  });
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

  // Al cambiar de idioma cambian los largos de los textos: se recalculan posiciones
  onLang(() => requestAnimationFrame(() => ScrollTrigger.refresh()));
  window.addEventListener("load", () => ScrollTrigger.refresh());
})();
