// Generative flow field for the hero: "Navegante" piece 1 on the web.
// Particles follow a field of forces built from Perlin noise (order),
// and the result never repeats (chaos). Colors keep the 60-30-10 rule.
(function () {
  // ---------- Perlin noise (improved, 3D) ----------
  const perm = new Uint8Array(512);
  (function seed() {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  })();
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a, b, t) => a + t * (b - a);
  function grad(h, x, y, z) {
    const g = h & 15, u = g < 8 ? x : y, v = g < 4 ? y : g === 12 || g === 14 ? x : z;
    return ((g & 1) ? -u : u) + ((g & 2) ? -v : v);
  }
  // Returns noise in roughly [-1, 1]
  function noise(x, y, z) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
    x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
    const u = fade(x), v = fade(y), w = fade(z);
    const A = perm[X] + Y, AA = perm[A] + Z, AB = perm[A + 1] + Z;
    const B = perm[X + 1] + Y, BA = perm[B] + Z, BB = perm[B + 1] + Z;
    return lerp(
      lerp(lerp(grad(perm[AA], x, y, z), grad(perm[BA], x - 1, y, z), u),
           lerp(grad(perm[AB], x, y - 1, z), grad(perm[BB], x - 1, y - 1, z), u), v),
      lerp(lerp(grad(perm[AA + 1], x, y, z - 1), grad(perm[BA + 1], x - 1, y, z - 1), u),
           lerp(grad(perm[AB + 1], x, y - 1, z - 1), grad(perm[BB + 1], x - 1, y - 1, z - 1), u), v), w);
  }

  // ---------- Field ----------
  const COLORS = [
    { color: "#DDB892", share: 0.6 }, // beige: calm base
    { color: "#7C878C", share: 0.3 }, // gris nardo, lifted so it reads on onyx
    { color: "#FF5733", share: 0.1 }  // naranja: the spark of chaos
  ];
  const BG = "#1C1C1C"; // Negro Ónix
  // Tuning: SPEED = px per frame, Z_STEP = how fast the field itself changes,
  // TRAIL = points kept per particle (one every RECORD_EVERY frames), BUCKETS = fade steps along the trail
  const SCALE = 0.0022, SPEED = 0.45, Z_STEP = 0.0005, TRAIL = 34, RECORD_EVERY = 3, BUCKETS = 6, DENSITY = 240;

  function FlowField(canvas, avoidEl) {
    this.canvas = canvas;
    this.avoidEl = avoidEl || null; // the hero: its data-avoid text keeps a clear area
    this.zones = [];
    this.ctx = canvas.getContext("2d");
    this.running = false;
    this.visible = true;
    this.z = Math.random() * 10;
    this.reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.resize();
    this.observe();
  }

  FlowField.prototype.resize = function () {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = Math.max(1, Math.round(rect.width));
    this.h = Math.max(1, Math.round(rect.height));
    this.canvas.width = this.w * dpr;
    this.canvas.height = this.h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.measureAvoid();
    // About 1 particle per DENSITY px², capped for phones and big screens
    const count = Math.round(Math.min(2600, Math.max(450, (this.w * this.h) / DENSITY)));
    this.particles = [];
    let k = 0;
    COLORS.forEach((c, ci) => {
      const n = ci === COLORS.length - 1 ? count - k : Math.round(count * c.share);
      for (let i = 0; i < n; i++) this.particles.push(this.spawn({ color: c.color, hx: new Float32Array(TRAIL), hy: new Float32Array(TRAIL) }));
      k += n;
    });
    // Warm up so the first frame already shows full trails
    this.frame = 0;
    for (let i = 0; i < TRAIL * RECORD_EVERY; i++) this.move();
    this.draw();
  };

  // Clear zones around the text, in canvas coordinates: one rounded box per element marked
  // data-avoid (falls back to the old lockup selectors). Boxes use a 4-norm, so they hug
  // wide lines of text better than ellipses.
  FlowField.prototype.measureAvoid = function () {
    this.zones = [];
    if (!this.avoidEl) return;
    const c = this.canvas.getBoundingClientRect();
    let els = this.avoidEl.querySelectorAll("[data-avoid]");
    if (!els.length) els = this.avoidEl.querySelectorAll(".hero__caption-lead, .hero__lockup");
    els.forEach((el) => {
      const q = el.getBoundingClientRect();
      if (q.width < 1 || q.height < 1) return;
      this.zones.push({ cx: (q.left + q.right) / 2 - c.left, cy: (q.top + q.bottom) / 2 - c.top, rx: q.width / 2 + 26, ry: q.height / 2 + 18 });
    });
  };

  // Distance to the nearest clear zone: < 1 means inside. Also remembers which zone.
  FlowField.prototype.inAvoid = function (x, y) {
    let best = 9; this.near = null;
    for (const z of this.zones) {
      const dx = (x - z.cx) / z.rx, dy = (y - z.cy) / z.ry;
      const d2 = Math.sqrt(dx * dx * dx * dx + dy * dy * dy * dy);
      if (d2 < best) { best = d2; this.near = z; }
    }
    return best;
  };

  // (Re)starts a particle at a random point with an empty trail
  FlowField.prototype.spawn = function (p) {
    let x = Math.random() * this.w, y = Math.random() * this.h, tries = 0;
    while (this.inAvoid(x, y) < 1.15 && tries++ < 8) { x = Math.random() * this.w; y = Math.random() * this.h; }
    p.hx.fill(x); p.hy.fill(y);
    p.head = 0; p.x = x; p.y = y;
    p.life = 200 + Math.random() * 500;
    return p;
  };

  // Moves every particle one step along the field and records the point
  FlowField.prototype.move = function () {
    for (const p of this.particles) {
      const a = noise(p.x * SCALE, p.y * SCALE, this.z) * Math.PI * 3;
      let vx = Math.cos(a), vy = Math.sin(a);
      const d2 = this.inAvoid(p.x, p.y);
      if (d2 < 1.6) {
        // Near the navigator: bend the path outward so the flow goes around it
        const av = this.near, k = (1.6 - d2) * 2.2;
        const nx = (p.x - av.cx) / av.rx, ny = (p.y - av.cy) / av.ry;
        const ox = (nx * nx * nx) / av.rx, oy = (ny * ny * ny) / av.ry;
        const ol = Math.hypot(ox, oy) || 1;
        vx += (ox / ol) * k; vy += (oy / ol) * k;
        const vl = Math.hypot(vx, vy) || 1; vx /= vl; vy /= vl;
      }
      p.x += vx * SPEED; p.y += vy * SPEED;
      p.life -= 1;
      if (p.x < -2 || p.x > this.w + 2 || p.y < -2 || p.y > this.h + 2 || p.life <= 0) { this.spawn(p); continue; }
      if (this.frame % RECORD_EVERY === 0) {
        p.head = (p.head + 1) % TRAIL;
        p.hx[p.head] = p.x; p.hy[p.head] = p.y;
      }
    }
    this.frame = (this.frame || 0) + 1;
    this.z += Z_STEP;
  };

  // Clears to Negro Ónix and redraws trails, brightest at the head
  FlowField.prototype.draw = function () {
    const ctx = this.ctx;
    ctx.globalAlpha = 1;
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, this.w, this.h);
    ctx.lineWidth = 1.1;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const per = TRAIL / BUCKETS;
    for (const c of COLORS) {
      ctx.strokeStyle = c.color;
      for (let b = 0; b < BUCKETS; b++) {
        ctx.globalAlpha = 0.85 * Math.pow(1 - b / BUCKETS, 1.4);
        ctx.beginPath();
        const a0 = Math.floor(b * per), a1 = Math.floor((b + 1) * per);
        for (const p of this.particles) {
          if (p.color !== c.color) continue;
          let i = (p.head - a0 + TRAIL) % TRAIL;
          if (b === 0) ctx.moveTo(p.x, p.y), ctx.lineTo(p.hx[i], p.hy[i]);
          else ctx.moveTo(p.hx[i], p.hy[i]);
          for (let age = a0 + 1; age <= a1 && age < TRAIL; age++) {
            i = (p.head - age + TRAIL) % TRAIL;
            ctx.lineTo(p.hx[i], p.hy[i]);
          }
        }
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  };

  FlowField.prototype.loop = function () {
    if (!this.running) return;
    this.move();
    this.draw();
    this.raf = requestAnimationFrame(() => this.loop());
  };

  FlowField.prototype.update = function () {
    const shouldRun = this.visible && !document.hidden && !this.reduced.matches;
    if (shouldRun && !this.running) { this.running = true; this.loop(); }
    if (!shouldRun && this.running) { this.running = false; cancelAnimationFrame(this.raf); }
  };

  FlowField.prototype.observe = function () {
    // Pause when the hero is off screen or the tab is hidden
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((entries) => {
        this.visible = entries[0].isIntersecting;
        this.update();
      }).observe(this.canvas);
    }
    document.addEventListener("visibilitychange", () => this.update());
    this.reduced.addEventListener?.("change", () => this.update());
    // Rebuild when the canvas changes size (window resize, text reflow after a language switch)
    let t, lastW = this.w, lastH = this.h;
    const onResize = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const r = this.canvas.getBoundingClientRect();
        if (Math.round(r.width) !== lastW || Math.round(r.height) !== lastH) { this.resize(); lastW = this.w; lastH = this.h; }
        else this.measureAvoid();
      }, 200);
    };
    if ("ResizeObserver" in window) new ResizeObserver(onResize).observe(this.canvas);
    else window.addEventListener("resize", onResize);
    if (this.avoidEl && "ResizeObserver" in window) new ResizeObserver(onResize).observe(this.avoidEl);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => this.measureAvoid());
    this.update();
  };

  window.FlowField = {
    mount(canvas, avoidEl) {
      if (!canvas || !canvas.getContext) return null;
      return new FlowField(canvas, avoidEl);
    }
  };
})();
