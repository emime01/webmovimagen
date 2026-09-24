(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Ciudad nocturna del hero ---------- */
  const canvas = document.getElementById("city");
  const ctx = canvas.getContext("2d");
  const SCREEN_COLORS = ["#ff2e63", "#08d9d6", "#7b61ff", "#ffd23f"];
  const SCREEN_WORDS = ["MOVIMAGEN", "TU MARCA", "OOH", "LED", "DOOH"];
  let W, H, dpr, layers, stars;
  let mouseX = 0, mouseY = 0, targetX = 0, targetY = 0;

  const rand = (a, b) => a + Math.random() * (b - a);

  function buildCity() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    stars = Array.from({ length: 90 }, () => ({ x: rand(0, W), y: rand(0, H * 0.5), r: rand(0.3, 1.2), p: rand(0, Math.PI * 2) }));

    const layerDefs = [
      { depth: 0.2, color: "#10101c", minH: 0.25, maxH: 0.5, win: 0.08, screens: 0 },
      { depth: 0.5, color: "#0b0b15", minH: 0.3, maxH: 0.65, win: 0.14, screens: 2 },
      { depth: 1, color: "#06060c", minH: 0.2, maxH: 0.55, win: 0.2, screens: 3 },
    ];

    layers = layerDefs.map((def) => {
      const buildings = [];
      let x = -100;
      while (x < W + 100) {
        const w = rand(50, 140) * (0.6 + def.depth * 0.5);
        const h = rand(def.minH, def.maxH) * H;
        const windows = [];
        for (let wy = 14; wy < h - 10; wy += 14) {
          for (let wx = 8; wx < w - 8; wx += 12) {
            if (Math.random() < def.win) windows.push({ x: wx, y: wy, a: rand(0.3, 1), warm: Math.random() > 0.3 });
          }
        }
        buildings.push({ x, w, h, windows });
        x += w + rand(2, 16);
      }
      // Pantallas publicitarias sobre algunos edificios
      const screens = [];
      const candidates = buildings.filter((b) => b.x > W * (W < 760 ? 0.55 : 0.35) && b.x < W - 60 && b.w > 70);
      for (let i = 0; i < def.screens && candidates.length; i++) {
        const b = candidates.splice(Math.floor(Math.random() * candidates.length), 1)[0];
        screens.push({
          b,
          w: b.w * 0.85,
          h: b.w * 0.42,
          color: i % SCREEN_COLORS.length,
          word: Math.floor(Math.random() * SCREEN_WORDS.length),
          next: rand(1500, 4000),
        });
      }
      return { ...def, buildings, screens };
    });
  }

  function drawCity(t) {
    mouseX += (targetX - mouseX) * 0.05;
    mouseY += (targetY - mouseY) * 0.05;
    const scrollY = Math.min(window.scrollY, H);

    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#07070c");
    sky.addColorStop(0.6, "#140b24");
    sky.addColorStop(1, "#2a0f2e");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Resplandor de la ciudad
    const glow = ctx.createRadialGradient(W * 0.7, H, 0, W * 0.7, H, W * 0.6);
    glow.addColorStop(0, "rgba(255,46,99,0.25)");
    glow.addColorStop(1, "rgba(255,46,99,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    for (const s of stars) {
      ctx.globalAlpha = 0.4 + 0.4 * Math.sin(t / 900 + s.p);
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(s.x - mouseX * 4, s.y - scrollY * 0.05, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (const layer of layers) {
      const ox = -mouseX * 30 * layer.depth;
      const oy = mouseY * 10 * layer.depth + scrollY * (0.4 - layer.depth * 0.3);
      ctx.save();
      ctx.translate(ox, oy);

      for (const b of layer.buildings) {
        const top = H - b.h;
        ctx.fillStyle = layer.color;
        ctx.fillRect(b.x, top, b.w, b.h);
        for (const w of b.windows) {
          const flick = reduceMotion ? 1 : 0.85 + 0.15 * Math.sin(t / 700 + w.x * 3 + w.y);
          ctx.fillStyle = w.warm ? `rgba(255,200,120,${w.a * flick * layer.depth * 0.9})` : `rgba(140,200,255,${w.a * flick * layer.depth * 0.7})`;
          ctx.fillRect(b.x + w.x, top + w.y, 4, 6);
        }
      }

      for (const s of layer.screens) {
        if (!reduceMotion && t > s.next) {
          s.color = (s.color + 1) % SCREEN_COLORS.length;
          s.word = (s.word + 1) % SCREEN_WORDS.length;
          s.next = t + rand(2500, 5000);
        }
        const c = SCREEN_COLORS[s.color];
        const sx = s.b.x + (s.b.w - s.w) / 2;
        const sy = H - s.b.h - s.h - 18;
        // Estructura
        ctx.fillStyle = "#15151c";
        ctx.fillRect(sx + s.w / 2 - 3, sy + s.h, 6, 18);
        ctx.fillRect(sx - 4, sy - 4, s.w + 8, s.h + 8);
        // Pantalla con brillo
        ctx.shadowColor = c;
        ctx.shadowBlur = 40 * layer.depth + 10;
        const g = ctx.createLinearGradient(sx, sy, sx + s.w, sy + s.h);
        g.addColorStop(0, c);
        g.addColorStop(1, "#0a0a14");
        ctx.fillStyle = g;
        ctx.fillRect(sx, sy, s.w, s.h);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#fff";
        ctx.font = `700 ${Math.max(10, s.h * 0.32)}px "Space Grotesk", sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(SCREEN_WORDS[s.word], sx + s.w / 2, sy + s.h / 2, s.w * 0.9);
      }
      ctx.restore();
    }
  }

  let heroVisible = true;
  function loop(t) {
    if (heroVisible) drawCity(t);
    if (!reduceMotion) requestAnimationFrame(loop);
  }

  buildCity();
  requestAnimationFrame(loop);
  new IntersectionObserver(([e]) => (heroVisible = e.isIntersecting)).observe(canvas);
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { buildCity(); if (reduceMotion) drawCity(0); }, 150);
  });

  /* ---------- Cursor ---------- */
  const glowEl = document.querySelector(".cursor-glow");
  window.addEventListener("pointermove", (e) => {
    targetX = e.clientX / window.innerWidth - 0.5;
    targetY = e.clientY / window.innerHeight - 0.5;
    glowEl.style.transform = `translate(${e.clientX - 240}px, ${e.clientY - 240}px)`;
  });

  /* ---------- Nav ---------- */
  const nav = document.getElementById("nav");
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 40);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  document.getElementById("menuToggle").addEventListener("click", () => nav.classList.toggle("open"));
  document.querySelectorAll("#navLinks a").forEach((a) => a.addEventListener("click", () => nav.classList.remove("open")));

  /* ---------- Reveal + contadores ---------- */
  const countUp = (el) => {
    const end = +el.dataset.count;
    const dur = 1600;
    const start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / dur, 1);
      el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("in");
        e.target.querySelectorAll("[data-count]").forEach(countUp);
        io.unobserve(e.target);
      });
    },
    { threshold: 0.15 }
  );
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  /* ---------- Tarjetas con inclinación ---------- */
  if (!reduceMotion && window.matchMedia("(hover: hover)").matches) {
    document.querySelectorAll("[data-tilt]").forEach((card) => {
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        card.style.setProperty("--mx", `${x * 100}%`);
        card.style.setProperty("--my", `${y * 100}%`);
        card.style.transform = `perspective(900px) rotateY(${(x - 0.5) * 8}deg) rotateX(${(0.5 - y) * 8}deg) translateY(-4px)`;
      });
      card.addEventListener("pointerleave", () => (card.style.transform = ""));
    });
  }

  /* ---------- Tu marca en la calle ---------- */
  const input = document.getElementById("brandInput");
  const screen = document.getElementById("billboardScreen");
  const text = document.getElementById("billboardText");
  const scene = document.getElementById("scene");
  let swapTimer;
  input.addEventListener("input", () => {
    text.textContent = input.value.trim() || "Tu marca acá";
    clearTimeout(swapTimer);
    swapTimer = setTimeout(() => {
      screen.classList.remove("swap");
      void screen.offsetWidth;
      screen.classList.add("swap");
    }, 250);
  });
  document.getElementById("swatches").addEventListener("click", (e) => {
    const btn = e.target.closest(".swatch");
    if (!btn) return;
    document.querySelectorAll(".swatch").forEach((s) => s.classList.toggle("active", s === btn));
    screen.style.setProperty("--c", btn.dataset.c);
  });
  document.getElementById("timeToggle").addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    document.querySelectorAll("#timeToggle button").forEach((b) => b.classList.toggle("active", b === btn));
    scene.classList.remove("night", "day");
    scene.classList.add(btn.dataset.t);
  });

  /* ---------- Mapa de cobertura ---------- */
  // Coordenadas en el viewBox 400x420 del SVG. TODO: reemplazar por ubicaciones reales de soportes.
  const ZONES = {
    mvd: [[150, 364], [158, 358], [166, 366], [142, 358], [172, 356], [160, 350], [148, 348], [178, 364]],
    pde: [[244, 360], [252, 354], [258, 362], [238, 352], [264, 356]],
    rutas: [[200, 238], [250, 180], [300, 112], [120, 250], [104, 150], [220, 362], [286, 340], [180, 300]],
  };
  const pinsEl = document.getElementById("pins");
  const pinEls = {};
  Object.entries(ZONES).forEach(([zone, pts]) => {
    pinEls[zone] = pts.map(([x, y], i) => {
      const p = document.createElement("span");
      p.className = "pin";
      p.style.left = `${(x / 400) * 100}%`;
      p.style.top = `${(y / 420) * 100}%`;
      p.style.setProperty("--d", `${i * 0.2}s`);
      pinsEl.appendChild(p);
      return p;
    });
  });
  const showZone = (zone) => {
    Object.entries(pinEls).forEach(([z, pins]) => pins.forEach((p) => p.classList.toggle("on", z === zone)));
    document.querySelectorAll("#zones li").forEach((li) => li.classList.toggle("active", li.dataset.zone === zone));
  };
  document.getElementById("zones").addEventListener("click", (e) => {
    const li = e.target.closest("li");
    if (li) showZone(li.dataset.zone);
  });
  showZone("mvd");

  /* ---------- Formulario ---------- */
  // Sin backend todavía: abre el cliente de correo con los datos cargados.
  document.getElementById("contactForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    const body = `Nombre: ${d.nombre}\nEmpresa: ${d.empresa}\nEmail: ${d.email}\nFormato: ${d.formato}\n\n${d.mensaje}`;
    window.location.href = `mailto:info@movimagen.com.uy?subject=${encodeURIComponent("Consulta de campaña - " + (d.empresa || d.nombre))}&body=${encodeURIComponent(body)}`;
    document.getElementById("formNote").textContent = "¡Gracias! Te respondemos en menos de 24 horas.";
  });

  document.getElementById("year").textContent = new Date().getFullYear();
})();
