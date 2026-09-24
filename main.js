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
  const rows = [LOGOS.slice(0, 17), LOGOS.slice(17)];
  $("#logoRows").innerHTML = rows
    .map((row, r) => {
      const chips = row.map((src) => `<div class="logo-chip"><img src="${src}" alt="Logo de cliente de Movimagen" loading="lazy" /></div>`).join("");
      return `<div class="logo-row${r ? " rev" : ""}">${chips}${chips.replace(/alt="[^"]*"/g, 'alt="" aria-hidden="true"')}</div>`;
    })
    .join("");

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
  let tIndex = 0, tTimer, tStart;
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
    tTimer = requestAnimationFrame(tickTestimonials);
  };
  $$("button", tBars).forEach((b, i) => b.addEventListener("click", () => showTestimonial(i)));
  showTestimonial(0);
  if (!reduceMotion) tTimer = requestAnimationFrame(tickTestimonials);

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
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  /* ---------- Scroll suave ---------- */
  let lenis;
  if (!reduceMotion && typeof window.Lenis !== "undefined") {
    lenis = new Lenis({ lerp: 0.09 });
    lenis.on("scroll", ScrollTrigger.update);
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

  /* ---------- Loader ---------- */
  const counter = { v: 0 };
  const intro = gsap.timeline({ paused: true });
  intro
    .to("#loader", { yPercent: -100, duration: 1.1, ease: "expo.inOut" })
    .from(".hero-num", { scale: 1.3, opacity: 0, filter: "blur(40px)", duration: 1.8, ease: "expo.out" }, "-=0.5")
    .from(".hero-logo", { y: 30, opacity: 0, duration: 1, ease: "expo.out" }, "-=1.5")
    .to(".fade-in", { opacity: 1, duration: 1, stagger: 0.08 }, "-=1.2")
    .add(() => {
      $("#loader").remove();
      document.body.classList.remove("is-loading");
      lenis && lenis.start();
      ScrollTrigger.refresh();
    }, "-=1.4");

  gsap.to(counter, {
    v: 100,
    duration: reduceMotion ? 0.2 : 1.8,
    ease: "power2.inOut",
    onUpdate: () => ($("#loaderCount").textContent = Math.round(counter.v)),
    onComplete: () => intro.play(),
  });

  /* ---------- Cursor ---------- */
  const cursor = $("#cursor");
  const cursorLabel = $("#cursorLabel");
  const hoverImg = $("#hoverImg");
  const mouse = { x: innerWidth / 2, y: innerHeight / 2 };
  const cur = { x: mouse.x, y: mouse.y };
  const img = { x: mouse.x, y: mouse.y };
  window.addEventListener("pointermove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
  gsap.ticker.add(() => {
    cur.x += (mouse.x - cur.x) * 0.25;
    cur.y += (mouse.y - cur.y) * 0.25;
    img.x += (mouse.x - img.x) * 0.1;
    img.y += (mouse.y - img.y) * 0.1;
    cursor.style.transform = `translate(${cur.x}px, ${cur.y}px)`;
    hoverImg.style.left = `${img.x}px`;
    hoverImg.style.top = `${img.y}px`;
    hoverImg.style.rotate = `${gsap.utils.clamp(-8, 8, (mouse.x - img.x) * 0.05)}deg`;
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
  $$(".float").forEach((el) => {
    gsap.to(el, {
      y: () => -innerHeight * 1.7 * +el.dataset.speed,
      ease: "none",
      scrollTrigger: { trigger: ".values", start: "top bottom", end: "bottom top", scrub: true, invalidateOnRefresh: true },
    });
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
  gsap.from(".product-list li", { opacity: 0, y: 40, duration: 1, stagger: 0.08, ease: "expo.out", scrollTrigger: { trigger: ".product-list", start: "top 80%" } });

  gsap.set(hoverImg, { scale: 0.8 });
  if (finePointer) {
    $$("#productList li").forEach((li) => {
      li.addEventListener("pointerenter", () => {
        hoverImg.src = li.dataset.img;
        hoverImg.classList.add("show");
        gsap.to(hoverImg, { scale: 1, duration: 0.5, ease: "expo.out" });
      });
      li.addEventListener("pointerleave", () => {
        hoverImg.classList.remove("show");
        gsap.to(hoverImg, { scale: 0.8, duration: 0.4 });
      });
    });
  }

  /* ---------- Proyectos: ventana que se abre ---------- */
  const frameImg = $("#rwFrame img");
  const win = { t: 30, x: 12, r: 50 };
  const applyWin = () => {
    frameImg.style.setProperty("--it", `${win.t}%`);
    frameImg.style.setProperty("--ib", `${win.t * 0.4}%`);
    frameImg.style.setProperty("--ix", `${win.x}%`);
    frameImg.style.setProperty("--r", `${win.r}vw`);
  };
  applyWin();
  gsap.to(win, {
    t: 3, x: 2.5, r: 2.5, ease: "none", onUpdate: applyWin,
    scrollTrigger: { trigger: "#revealWindow", start: "top top", end: "bottom bottom", scrub: true },
  });
  gsap.fromTo(frameImg, { scale: 1.25 }, { scale: 1, ease: "none", scrollTrigger: { trigger: "#revealWindow", start: "top top", end: "bottom bottom", scrub: true } });

  /* ---------- Galería horizontal ---------- */
  const track = $("#galleryTrack");
  const distance = () => Math.max(0, track.scrollWidth - innerWidth);
  gsap.to(track, {
    x: () => -distance(),
    ease: "none",
    scrollTrigger: { trigger: "#gallery", start: "top top", end: () => `+=${distance()}`, pin: true, scrub: 1, invalidateOnRefresh: true },
  });

  /* ---------- Contacto ---------- */
  gsap.from(".contact-big span", { yPercent: 100, duration: 1.4, ease: "expo.out", scrollTrigger: { trigger: ".contact", start: "top 70%" } });
  gsap.from(".footer-mark img", { yPercent: 40, opacity: 0, ease: "none", scrollTrigger: { trigger: ".footer-mark", start: "top bottom", end: "bottom bottom", scrub: true } });

  window.addEventListener("load", () => ScrollTrigger.refresh());
})();
