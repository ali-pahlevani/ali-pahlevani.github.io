/* Ali Pahlevani, portfolio: page behaviour and the hero SLAM simulation.
   Scroll-driven motion and project galleries live in motion.js. */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  /* ---------- Shared motion switch ----------
     One control for everything that moves on its own: the hero map, the ICP
     tile, the cursor scan and the trail. Starts off when the visitor asks for
     reduced motion, and remembers a manual choice. */

  const Motion = (() => {
    const KEY = 'ap-motion';
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const subscribers = new Set();
    let enabled = !reduce.matches;

    try {
      const saved = localStorage.getItem(KEY);
      if (saved === 'off') enabled = false;
      else if (saved === 'on' && !reduce.matches) enabled = true;
    } catch { /* storage unavailable */ }

    const api = {
      get enabled() { return enabled; },
      get reduced() { return reduce.matches; },
      set(value, remember) {
        if (enabled === value) return;
        enabled = value;
        if (remember) {
          try { localStorage.setItem(KEY, value ? 'on' : 'off'); } catch { /* ignore */ }
        }
        subscribers.forEach((fn) => fn(enabled));
      },
      onChange(fn) { subscribers.add(fn); return () => subscribers.delete(fn); },
    };

    reduce.addEventListener('change', () => api.set(!reduce.matches, false));
    window.APMotion = api;
    return api;
  })();

  /* ---------- Header: solid past the hero, current section ---------- */

  const header = $('[data-header]');
  const hero = $('.hero');

  if (header && hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      header.classList.toggle('is-solid', !entry.isIntersecting);
    }, { rootMargin: '-72px 0px 0px 0px' }).observe(hero);

    const links = new Map($$('.site-nav__list a').map((a) => [a.getAttribute('href').slice(1), a]));
    const setCurrent = (id) => links.forEach((a, key) => {
      if (key === id) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });

    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) setCurrent(entry.target.id); });
    }, { rootMargin: '-45% 0px -50% 0px' });

    spy.observe(hero);
    links.forEach((_, id) => { const section = document.getElementById(id); if (section) spy.observe(section); });
  }

  /* ---------- Mobile menu ---------- */

  const menuToggle = $('[data-menu-toggle]');
  const nav = $('[data-nav]');

  function setMenu(open) {
    nav.classList.toggle('is-open', open);
    header.classList.toggle('menu-is-open', open);
    document.body.classList.toggle('menu-open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    $('use', menuToggle).setAttribute('href', open ? '#i-close' : '#i-menu');
    $('.visually-hidden', menuToggle).textContent = open ? 'Close menu' : 'Open menu';
    if (open) $('a', nav).focus();
  }

  if (menuToggle && nav) {
    menuToggle.addEventListener('click', () => setMenu(menuToggle.getAttribute('aria-expanded') !== 'true'));
    nav.addEventListener('click', (e) => {
      if (e.target.closest('a') && nav.classList.contains('is-open')) setMenu(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); menuToggle.focus(); }
    });
    window.matchMedia('(min-width: 881px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });
  }

  /* ---------- Reveals ---------- */

  const revealed = $$('[data-reveal]');

  if (revealed.length && 'IntersectionObserver' in window) {
    // Stagger siblings so a list arrives as a run, not all at once.
    const seen = new Map();
    revealed.forEach((el) => {
      const index = seen.get(el.parentElement) || 0;
      seen.set(el.parentElement, index + 1);
      el.style.setProperty('--reveal-i', Math.min(index, 6));
    });

    // A sweep heading clips itself to zero width, so it would never register as
    // visible. Watch its container and mark the heading when that comes into view.
    const watched = new Map();
    revealed.forEach((el) => {
      const proxy = el.dataset.reveal === 'sweep' ? (el.parentElement || el) : el;
      if (!watched.has(proxy)) watched.set(proxy, []);
      watched.get(proxy).push(el);
    });

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        (watched.get(entry.target) || [entry.target]).forEach((el) => el.classList.add('is-in'));
        obs.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });

    watched.forEach((_, proxy) => observer.observe(proxy));
  } else {
    revealed.forEach((el) => el.classList.add('is-in'));
  }

  /* ---------- Count-ups ---------- */

  const counted = new WeakSet();

  function countUp(el) {
    if (counted.has(el)) return;
    counted.add(el);
    const target = Number(el.dataset.count);
    if (!Number.isFinite(target)) return;
    if (!Motion.enabled) { el.textContent = target.toLocaleString('en-US'); return; }

    const duration = 900;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      el.textContent = Math.round(target * eased).toLocaleString('en-US');
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  if ('IntersectionObserver' in window) {
    const counter = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        countUp(entry.target);
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.6 });
    $$('[data-count]').forEach((el) => counter.observe(el));
  }

  /* ---------- Project filters (FLIP so cards slide rather than pop) ---------- */

  const filterButtons = $$('[data-filter]');
  const projects = $$('[data-projects] .project');
  const filterStatus = $('[data-filter-status]');

  filterButtons.forEach((button) => button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    const matches = (p) => filter === 'all' || p.dataset.cats.split(' ').includes(filter);
    const animate = Motion.enabled;

    filterButtons.forEach((b) => b.setAttribute('aria-pressed', String(b === button)));

    const before = new Map(projects.map((p) => [p, p.hidden ? null : p.getBoundingClientRect()]));
    projects.forEach((p) => { p.hidden = !matches(p); });

    if (animate) {
      projects.forEach((p) => {
        if (p.hidden) return;
        const first = before.get(p);
        const last = p.getBoundingClientRect();
        if (!first) {
          p.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
            { duration: 320, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)' });
          return;
        }
        const dx = first.left - last.left;
        const dy = first.top - last.top;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
        p.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
          { duration: 420, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)' });
      });
    }

    const count = projects.filter(matches).length;
    filterStatus.textContent = `Showing ${count} project${count === 1 ? '' : 's'}`;
  }));

  /* ---------- Copy email ---------- */

  $$('[data-copy]').forEach((button) => {
    const label = $('[data-copy-label]', button);
    const icon = $('use', button);
    const status = $('[data-copy-status]');
    let timer;

    button.addEventListener('click', async () => {
      const text = button.dataset.copy;
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const field = Object.assign(document.createElement('textarea'), { value: text });
        field.style.position = 'fixed';
        field.style.opacity = '0';
        document.body.append(field);
        field.select();
        document.execCommand('copy');
        field.remove();
      }
      button.classList.add('is-copied');
      label.textContent = 'Copied';
      icon.setAttribute('href', '#i-check');
      status.textContent = 'Email address copied to clipboard';
      clearTimeout(timer);
      timer = setTimeout(() => {
        button.classList.remove('is-copied');
        label.textContent = 'Copy email';
        icon.setAttribute('href', '#i-copy');
        status.textContent = '';
      }, 2200);
    });
  });

  /* ---------- Live GitHub star counts (falls back to the numbers in the HTML) ---------- */

  const STAR_CACHE = 'ap-github-stars-v1';

  async function loadStars() {
    let stars = null;
    try {
      const cached = JSON.parse(localStorage.getItem(STAR_CACHE));
      if (cached && Date.now() - cached.time < 6 * 3600 * 1000) stars = cached.stars;
    } catch { /* storage unavailable */ }

    if (!stars) {
      try {
        const res = await fetch('https://api.github.com/users/ali-pahlevani/repos?per_page=100', {
          headers: { Accept: 'application/vnd.github+json' },
        });
        if (!res.ok) return;
        stars = {};
        (await res.json()).forEach((repo) => { stars[repo.name] = repo.stargazers_count; });
        try { localStorage.setItem(STAR_CACHE, JSON.stringify({ time: Date.now(), stars })); } catch { /* ignore */ }
      } catch { return; }
    }

    $$('[data-stars]').forEach((el) => {
      const value = stars[el.dataset.stars];
      if (typeof value === 'number') el.textContent = value.toLocaleString('en-US');
    });

    const total = Object.values(stars).reduce((sum, n) => sum + n, 0);
    if (total > 0) {
      $$('[data-total-stars]').forEach((el) => {
        el.dataset.count = String(total);
        if (counted.has(el)) el.textContent = total.toLocaleString('en-US');
      });
    }
  }

  ('requestIdleCallback' in window ? requestIdleCallback : (fn) => setTimeout(fn, 1200))(loadStars);

  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* ==========================================================================
     Hero: a small SLAM simulation.
     A floor plan is generated by recursive division. The robot casts a
     simulated 360° lidar into it, builds an occupancy grid (unknown, free,
     occupied), drives to the nearest frontier using Dijkstra on the known
     map, and records a pose graph with loop closures. Clicking the map sets
     a navigation goal.
     ========================================================================== */

  function initSlam() {
    const canvas = $('[data-slam]');
    if (!canvas || !canvas.getContext) return;

    const ctx = canvas.getContext('2d');
    const content = $('.hero__content');
    const hud = $('[data-hud]');
    const ui = {
      hint: $('[data-hud-hint]'),
      coverage: $('[data-hud-coverage]'),
      pose: $('[data-hud-pose]'),
      heading: $('[data-hud-heading]'),
      mode: $('[data-hud-mode]'),
      toggle: $('[data-slam-toggle]'),
    };

    const COLOR = {
      free: '#2a1b52',
      wall: '#efe9ff',
      dot: 'rgba(242, 236, 255, 0.09)',
      fov: 'rgba(162, 119, 255, 0.07)',
      accent: '#a277ff',
      spark: '#ffc24b',
      base: '#17102e',
    };
    const RES = 0.2; // metres per cell, for the readout
    const RAYS = 160;
    const SPEED = 7; // cells per second
    const TURN = 3.2; // radians per second
    const NB8 = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
      [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];
    const MODES = {
      explore: 'Exploring the nearest frontier',
      goal: 'Driving to your goal',
      arrived: 'Goal reached',
      done: 'Map complete. Starting a new building.',
    };

    const mapCanvas = document.createElement('canvas');
    const mctx = mapCanvas.getContext('2d');
    const bgCanvas = document.createElement('canvas');
    const bctx = bgCanvas.getContext('2d');

    let dpr = 1; let cssW = 0; let cssH = 0; let cs = 10; let W = 0; let H = 0;
    let world; let known; let infl; let reach; let dist; let parent;
    let bx0 = 0; let by0 = 0; let bx1 = 0; let by1 = 0;
    let rooms = [];
    let rng = Math.random;
    let seed = (Math.random() * 1e9) | 0;
    let range = 16;
    let dirty = [];
    let reachTotal = 1; let reachKnown = 0;

    const robot = { x: 0, y: 0, th: 0 };
    let origin = { x: 0, y: 0 };
    let path = null; let pathIdx = 0; let goalIdx = -1;
    let mode = 'explore';
    let phase = 'run'; // run, done, fadeout, fadein
    let fade = 1; let scanT = 0; let checkT = 0; let holdT = 0; let doneT = 0;
    const scanPts = []; const scanHit = [];
    let nodes = []; let loops = []; let lastLoop = -99;
    let ripple = null;
    let running = false; let visible = true; let staticMode = false;
    let raf = 0; let last = 0; let hudT = 0; let noticeUntil = 0;
    let lastW = 0; let lastH = 0; let started = false;

    const idx = (x, y) => y * W + x;
    const cellX = (i) => (i % W) + 0.5;
    const cellY = (i) => ((i / W) | 0) + 0.5;
    const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
    const randInt = (a, b) => a + Math.floor(rng() * (b - a + 1));
    const mulberry32 = (a) => () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    /* ----- Sizing and layout ----- */

    function setup() {
      const rect = canvas.getBoundingClientRect();
      cssW = Math.max(1, Math.round(rect.width));
      cssH = Math.max(1, Math.round(rect.height));
      lastW = cssW; lastH = cssH;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cs = Math.max(8, Math.min(13, Math.round(cssW / 130)));
      W = Math.ceil(cssW / cs);
      H = Math.ceil(cssH / cs);

      const n = W * H;
      world = new Uint8Array(n);
      known = new Uint8Array(n);
      infl = new Uint8Array(n);
      reach = new Uint8Array(n);
      dist = new Float64Array(n); // must match the heap's float64 keys
      parent = new Int32Array(n);

      [canvas, mapCanvas, bgCanvas].forEach((c) => {
        c.width = Math.round(cssW * dpr);
        c.height = Math.round(cssH * dpr);
      });
      mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bctx.clearRect(0, 0, cssW, cssH);
      bctx.fillStyle = COLOR.dot;
      for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) bctx.fillRect(x * cs, y * cs, 1, 1);

      const small = cssW < 881;
      range = small ? 13 : 19;
      computeRegion(small);
      newWorld();
    }

    // The building sits where it will not fight the text or the HUD.
    function computeRegion(small) {
      const top = canvas.getBoundingClientRect().top;
      const hudTop = hud.getBoundingClientRect().top - top;
      if (small) {
        const margin = Math.ceil(16 / cs);
        bx0 = margin;
        bx1 = W - 1 - margin;
        by0 = Math.ceil((content.getBoundingClientRect().bottom - top + 28) / cs);
        by1 = Math.floor((hudTop - 16) / cs);
      } else {
        // Start to the right of the widest line of hero text (the name, usually).
        const textRight = Math.max(0, ...[...content.children].map((child) => child.getBoundingClientRect().right));
        bx0 = Math.max(Math.floor(W * 0.46), Math.ceil((textRight + 48) / cs));
        bx1 = W - 1 - Math.ceil((parseFloat(getComputedStyle(hud).right) || 48) / cs);
        by0 = Math.ceil(96 / cs);
        by1 = Math.floor((hudTop - 20) / cs);
      }
      bx1 = Math.min(bx1, W - 2);
      by1 = Math.min(by1, H - 2);
      if (bx1 - bx0 < 24) bx0 = Math.max(1, bx1 - 24);
      if (by1 - by0 < 18) by0 = Math.max(1, by1 - 18);
    }

    /* ----- Floor plan ----- */

    function genWorld() {
      world.fill(0);
      rooms = [];
      for (let x = bx0; x <= bx1; x++) { world[idx(x, by0)] = 1; world[idx(x, by1)] = 1; }
      for (let y = by0; y <= by1; y++) { world[idx(bx0, y)] = 1; world[idx(bx1, y)] = 1; }

      divide(bx0 + 1, by0 + 1, bx1 - 1, by1 - 1, 0, cs <= 9 ? 7 : 9);

      // Crates and pillars, kept three cells clear of the walls so rooms stay connected.
      rooms.forEach((r) => {
        if (r.bx - r.ax < 9 || r.by - r.ay < 9 || rng() < 0.3) return;
        const count = rng() < 0.5 ? 1 : 2;
        for (let k = 0; k < count; k++) {
          const ow = randInt(1, 3); const oh = randInt(1, 3);
          const ox = randInt(r.ax + 3, r.bx - 2 - ow);
          const oy = randInt(r.ay + 3, r.by - 2 - oh);
          for (let y = oy; y < oy + oh; y++) for (let x = ox; x < ox + ow; x++) world[idx(x, y)] = 1;
        }
      });
    }

    function divide(ax, ay, bx, by, depth, min) {
      const w = bx - ax + 1; const h = by - ay + 1;
      const canH = h >= min * 2 + 1; const canV = w >= min * 2 + 1;
      if (depth > 5 || (!canH && !canV) || (depth > 1 && w * h < min * min * 3 && rng() < 0.5)) {
        rooms.push({ ax, ay, bx, by });
        return;
      }
      const horizontal = canH && (!canV || rng() < (h > w ? 0.8 : 0.2));

      for (let tries = 0; tries < 12; tries++) {
        if (horizontal) {
          const y = randInt(ay + min, by - min);
          if (!clearOfDoors(y, ax - 1, bx + 1, true)) continue;
          for (let x = ax; x <= bx; x++) world[idx(x, y)] = 1;
          const dw = Math.min(randInt(4, 5), w - 2); const dx = randInt(ax + 1, bx - dw);
          for (let x = dx; x < dx + dw; x++) world[idx(x, y)] = 0;
          divide(ax, ay, bx, y - 1, depth + 1, min);
          divide(ax, y + 1, bx, by, depth + 1, min);
        } else {
          const x = randInt(ax + min, bx - min);
          if (!clearOfDoors(x, ay - 1, by + 1, false)) continue;
          for (let y = ay; y <= by; y++) world[idx(x, y)] = 1;
          const dh = Math.min(randInt(4, 5), h - 2); const dy = randInt(ay + 1, by - dh);
          for (let y = dy; y < dy + dh; y++) world[idx(x, y)] = 0;
          divide(ax, ay, x - 1, by, depth + 1, min);
          divide(x + 1, ay, bx, by, depth + 1, min);
        }
        return;
      }
      rooms.push({ ax, ay, bx, by });
    }

    // A new wall must not end right beside a doorway in the walls it meets.
    function clearOfDoors(pos, a, b, horizontal) {
      for (let d = -2; d <= 2; d++) {
        const p = pos + d;
        if (horizontal ? (!world[idx(a, p)] || !world[idx(b, p)]) : (!world[idx(p, a)] || !world[idx(p, b)])) return false;
      }
      return true;
    }

    function findOpen(cx, cy) {
      for (let r = 0; r < 12; r++) {
        for (let y = cy - r; y <= cy + r; y++) {
          for (let x = cx - r; x <= cx + r; x++) {
            if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) continue;
            let open = true;
            for (let dy = -1; dy <= 1 && open; dy++) for (let dx = -1; dx <= 1; dx++) if (world[idx(x + dx, y + dy)]) { open = false; break; }
            if (open) return idx(x, y);
          }
        }
      }
      return idx(cx, cy);
    }

    function flood(start) {
      const stack = [start];
      let count = 0;
      reach[start] = 1;
      while (stack.length) {
        const i = stack.pop();
        const x = i % W; const y = (i / W) | 0;
        count++;
        const next = [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1];
        for (const j of next) if (j >= 0 && !world[j] && !reach[j]) { reach[j] = 1; stack.push(j); }
      }
      return count;
    }

    function newWorld() {
      rng = mulberry32(seed++);
      genWorld();
      known.fill(0); infl.fill(0); reach.fill(0);
      mctx.clearRect(0, 0, cssW, cssH);
      dirty = [];

      const room = rooms[randInt(0, rooms.length - 1)] || { ax: bx0 + 1, ay: by0 + 1, bx: bx1 - 1, by: by1 - 1 };
      const start = findOpen((room.ax + room.bx) >> 1, (room.ay + room.by) >> 1);
      robot.x = cellX(start); robot.y = cellY(start); robot.th = rng() * Math.PI * 2;
      origin = { x: robot.x, y: robot.y };
      reachTotal = Math.max(1, flood(start));
      reachKnown = 0;

      path = null; pathIdx = 0; goalIdx = -1; mode = 'explore';
      nodes = [{ x: robot.x, y: robot.y }]; loops = []; lastLoop = -99;
      scanT = 0; checkT = 1; holdT = 0; doneT = 0;
      scan();
    }

    /* ----- Lidar and occupancy grid ----- */

    function markFree(i) {
      if (known[i]) return;
      known[i] = 1;
      dirty.push(i);
      if (reach[i]) reachKnown++;
    }

    function markOccupied(i) {
      if (known[i] === 2) return;
      known[i] = 2;
      dirty.push(i);
      const x = i % W; const y = (i / W) | 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx; const ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < W && ny < H) infl[idx(nx, ny)] = 1;
        }
      }
    }

    function scan() {
      scanPts.length = 0;
      scanHit.length = 0;
      for (let k = 0; k < RAYS; k++) castRay(robot.x, robot.y, robot.th + (k / RAYS) * Math.PI * 2);
    }

    // Grid traversal (Amanatides and Woo) from the robot outwards.
    function castRay(ox, oy, angle) {
      const dx = Math.cos(angle); const dy = Math.sin(angle);
      let cx = Math.floor(ox); let cy = Math.floor(oy);
      const sx = dx > 0 ? 1 : -1; const sy = dy > 0 ? 1 : -1;
      const tdx = Math.abs(dx) < 1e-9 ? Infinity : Math.abs(1 / dx);
      const tdy = Math.abs(dy) < 1e-9 ? Infinity : Math.abs(1 / dy);
      let tx = tdx === Infinity ? Infinity : (dx > 0 ? cx + 1 - ox : ox - cx) * tdx;
      let ty = tdy === Infinity ? Infinity : (dy > 0 ? cy + 1 - oy : oy - cy) * tdy;
      let t = 0;

      while (t < range) {
        if (cx < 0 || cy < 0 || cx >= W || cy >= H) break;
        const i = idx(cx, cy);
        if (world[i]) {
          markOccupied(i);
          scanPts.push(ox + dx * t, oy + dy * t);
          scanHit.push(1);
          return;
        }
        markFree(i);
        if (tx < ty) { t = tx; tx += tdx; cx += sx; } else { t = ty; ty += tdy; cy += sy; }
      }
      t = Math.min(t, range);
      scanPts.push(ox + dx * t, oy + dy * t);
      scanHit.push(0);
    }

    function flushDirty() {
      for (const i of dirty) {
        const x = (i % W) * cs; const y = ((i / W) | 0) * cs;
        if (known[i] === 2) {
          mctx.fillStyle = COLOR.wall;
          mctx.fillRect(x, y, cs, cs);
        } else {
          mctx.fillStyle = COLOR.free;
          mctx.fillRect(x + 0.5, y + 0.5, cs - 1, cs - 1);
        }
      }
      dirty.length = 0;
    }

    /* ----- Planning ----- */

    const passable = (i) => known[i] === 1 && !infl[i];

    function isFrontier(i) {
      if (known[i] !== 1) return false;
      const x = i % W;
      return (x > 0 && known[i - 1] === 0) || (x < W - 1 && known[i + 1] === 0)
        || (i >= W && known[i - W] === 0) || (i < W * (H - 1) && known[i + W] === 0);
    }

    const heapK = []; const heapV = [];
    let popK = 0;

    function heapPush(k, v) {
      let n = heapK.length;
      heapK.push(k); heapV.push(v);
      while (n > 0) {
        const p = (n - 1) >> 1;
        if (heapK[p] <= k) break;
        heapK[n] = heapK[p]; heapV[n] = heapV[p];
        n = p;
      }
      heapK[n] = k; heapV[n] = v;
    }

    function heapPop() {
      popK = heapK[0];
      const top = heapV[0];
      const k = heapK.pop(); const v = heapV.pop();
      const len = heapK.length;
      if (len) {
        let n = 0;
        for (;;) {
          let c = 2 * n + 1;
          if (c >= len) break;
          if (c + 1 < len && heapK[c + 1] < heapK[c]) c++;
          if (heapK[c] >= k) break;
          heapK[n] = heapK[c]; heapV[n] = heapV[c];
          n = c;
        }
        heapK[n] = k; heapV[n] = v;
      }
      return top;
    }

    // Dijkstra over known free space, 8-connected, no corner cutting.
    function search(start, isGoal, minDist) {
      dist.fill(Infinity);
      parent.fill(-1);
      heapK.length = 0; heapV.length = 0;
      const sx = start % W; const sy = (start / W) | 0;
      // Let the robot leave its own cell even if it is hugging a wall.
      const ok = (j) => passable(j)
        || (known[j] === 1 && Math.abs((j % W) - sx) <= 1 && Math.abs(((j / W) | 0) - sy) <= 1);
      let fallback = -1;

      dist[start] = 0;
      heapPush(0, start);
      while (heapK.length) {
        const i = heapPop(); const d = popK;
        if (d > dist[i]) continue;
        if (i !== start && isGoal(i)) {
          if (d >= minDist) return trace(i);
          if (fallback < 0) fallback = i;
        }
        const x = i % W; const y = (i / W) | 0;
        for (const [dx, dy, cost] of NB8) {
          const nx = x + dx; const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const j = idx(nx, ny);
          if (!ok(j)) continue;
          if (dx && dy && (!ok(idx(nx, y)) || !ok(idx(x, ny)))) continue;
          const nd = d + cost;
          if (nd < dist[j]) { dist[j] = nd; parent[j] = i; heapPush(nd, j); }
        }
      }
      return fallback >= 0 ? trace(fallback) : null;
    }

    function trace(i) {
      const out = [];
      while (i >= 0) { out.push(i); i = parent[i]; }
      return out.reverse();
    }

    const robotCell = () => idx(Math.floor(robot.x), Math.floor(robot.y));

    function blocked() {
      const rx = Math.floor(robot.x); const ry = Math.floor(robot.y);
      for (let k = pathIdx + 1; k < path.length; k++) {
        const j = path[k];
        const nearRobot = Math.abs((j % W) - rx) <= 1 && Math.abs(((j / W) | 0) - ry) <= 1;
        if (!passable(j) && !nearRobot) return true;
      }
      return false;
    }

    function replan() {
      if (mode === 'goal') {
        if (path && !blocked()) return;
        const p = search(robotCell(), (i) => i === goalIdx, 0);
        if (p) { path = p; pathIdx = 0; } else { path = null; mode = 'explore'; setMode(); }
        return;
      }
      if (mode !== 'explore') return;
      if (path && isFrontier(goalIdx) && !blocked()) return;
      const p = search(robotCell(), isFrontier, 4);
      if (p) {
        path = p; pathIdx = 0; goalIdx = p[p.length - 1];
      } else {
        path = null; mode = 'done'; phase = 'done'; doneT = 0; setMode();
      }
    }

    /* ----- Motion ----- */

    function drive(dt) {
      // Steer cell to cell: a step between neighbouring centres on the planned path never crosses a wall.
      while (pathIdx < path.length - 1
        && Math.hypot(cellX(path[pathIdx]) - robot.x, cellY(path[pathIdx]) - robot.y) < 0.75) pathIdx++;

      const end = path[path.length - 1];
      const toGoal = Math.hypot(cellX(end) - robot.x, cellY(end) - robot.y);
      if (toGoal < 0.45) {
        path = null;
        if (mode === 'goal') { mode = 'arrived'; holdT = 1.4; setMode(); }
        checkT = 1;
        return;
      }

      const target = path[pathIdx];
      const err = wrap(Math.atan2(cellY(target) - robot.y, cellX(target) - robot.x) - robot.th);
      robot.th = wrap(robot.th + Math.max(-TURN * dt, Math.min(TURN * dt, err)));
      const v = Math.abs(err) > 1.1 ? 0 : SPEED * Math.cos(err) ** 2 * Math.min(1, 0.35 + toGoal / 2);
      const nx = robot.x + Math.cos(robot.th) * v * dt;
      const ny = robot.y + Math.sin(robot.th) * v * dt;
      if (world[idx(Math.floor(nx), Math.floor(ny))]) {
        // Drifted into a corner while turning: settle on this cell's centre and plan again from here.
        robot.x = Math.floor(robot.x) + 0.5;
        robot.y = Math.floor(robot.y) + 0.5;
        path = null;
        checkT = 1;
        return;
      }
      robot.x = nx; robot.y = ny;
    }

    function updateGraph() {
      const prev = nodes[nodes.length - 1];
      if (nodes.length > 1500 || Math.hypot(robot.x - prev.x, robot.y - prev.y) < 2.6) return;
      const node = { x: robot.x, y: robot.y };
      nodes.push(node);
      const k = nodes.length - 1;
      if (k - lastLoop <= 15) return;
      for (let j = 0; j < k - 20; j++) {
        if (Math.hypot(nodes[j].x - node.x, nodes[j].y - node.y) < 2.2) { loops.push([j, k]); lastLoop = k; break; }
      }
    }

    function step(dt) {
      if (phase === 'done') {
        doneT += dt;
        if (doneT > 3.5) phase = 'fadeout';
        return;
      }
      if (phase === 'fadeout') {
        fade -= dt / 0.6;
        if (fade <= 0) { fade = 0; newWorld(); phase = 'fadein'; setMode(); }
        return;
      }
      if (phase === 'fadein') {
        fade = Math.min(1, fade + dt / 0.6);
        if (fade >= 1) phase = 'run';
      }

      if (holdT > 0) {
        holdT -= dt;
        if (holdT <= 0 && mode === 'arrived') { mode = 'explore'; checkT = 1; setMode(); }
      }

      scanT += dt;
      if (scanT >= 0.1) { scanT = 0; scan(); }

      checkT += dt;
      if (mode !== 'arrived' && (checkT >= 0.3 || !path)) { checkT = 0; replan(); }
      if (path && phase !== 'done') drive(dt);
      updateGraph();
    }

    /* ----- Drawing ----- */

    function render() {
      flushDirty();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);
      ctx.drawImage(bgCanvas, 0, 0, cssW, cssH);
      ctx.globalAlpha = fade;
      ctx.drawImage(mapCanvas, 0, 0, cssW, cssH);

      // Lidar field of view, with returns in gold
      if (scanPts.length) {
        ctx.beginPath();
        ctx.moveTo(scanPts[0] * cs, scanPts[1] * cs);
        for (let k = 2; k < scanPts.length; k += 2) ctx.lineTo(scanPts[k] * cs, scanPts[k + 1] * cs);
        ctx.closePath();
        ctx.fillStyle = COLOR.fov;
        ctx.fill();
        ctx.fillStyle = COLOR.spark;
        for (let k = 0, h = 0; k < scanPts.length; k += 2, h++) {
          if (scanHit[h]) ctx.fillRect(scanPts[k] * cs - 1.25, scanPts[k + 1] * cs - 1.25, 2.5, 2.5);
        }
      }

      // Pose graph: trajectory, loop closures, nodes
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(162, 119, 255, 0.5)';
      ctx.beginPath();
      nodes.forEach((n, k) => (k ? ctx.lineTo(n.x * cs, n.y * cs) : ctx.moveTo(n.x * cs, n.y * cs)));
      ctx.stroke();
      if (loops.length) {
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = 'rgba(255, 194, 75, 0.5)';
        ctx.beginPath();
        loops.forEach(([a, b]) => { ctx.moveTo(nodes[a].x * cs, nodes[a].y * cs); ctx.lineTo(nodes[b].x * cs, nodes[b].y * cs); });
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.fillStyle = COLOR.accent;
      nodes.forEach((n) => ctx.fillRect(n.x * cs - 1.5, n.y * cs - 1.5, 3, 3));

      // Planned path
      if (path) {
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = 'rgba(162, 119, 255, 0.9)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(robot.x * cs, robot.y * cs);
        for (let k = pathIdx; k < path.length; k++) ctx.lineTo(cellX(path[k]) * cs, cellY(path[k]) * cs);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // User goal
      if ((mode === 'goal' || mode === 'arrived') && goalIdx >= 0) {
        const gx = cellX(goalIdx) * cs; const gy = cellY(goalIdx) * cs;
        ctx.strokeStyle = COLOR.spark;
        ctx.fillStyle = COLOR.spark;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(gx, gy, cs * 1.1, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(gx, gy, 2.5, 0, Math.PI * 2); ctx.fill();
      }

      // Click feedback
      if (ripple) {
        const age = (performance.now() - ripple.t) / 650;
        if (age >= 1) {
          ripple = null;
        } else {
          ctx.strokeStyle = ripple.ok ? `rgba(162, 119, 255, ${1 - age})` : `rgba(242, 236, 255, ${0.8 * (1 - age)})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(ripple.x, ripple.y, 6 + age * 26, 0, Math.PI * 2); ctx.stroke();
        }
      }

      // Robot
      const r = cs * 0.95;
      ctx.save();
      ctx.translate(robot.x * cs, robot.y * cs);
      ctx.rotate(robot.th);
      ctx.fillStyle = 'rgba(162, 119, 255, 0.18)';
      ctx.beginPath(); ctx.arc(0, 0, r * 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = COLOR.accent;
      ctx.strokeStyle = COLOR.base;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(r * 1.35, 0);
      ctx.lineTo(-r * 0.9, r * 0.9);
      ctx.lineTo(-r * 0.45, 0);
      ctx.lineTo(-r * 0.9, -r * 0.9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.globalAlpha = 1;
    }

    /* ----- HUD ----- */

    const fmt = (v) => (Math.abs(v) < 0.05 ? 0 : v).toFixed(1);

    function updateHud(force) {
      const now = performance.now();
      if (!force && now - hudT < 150) return;
      hudT = now;
      ui.coverage.textContent = `${Math.min(100, Math.round((100 * reachKnown) / reachTotal))}%`;
      ui.pose.textContent = `${fmt((robot.x - origin.x) * RES)}, ${fmt(-(robot.y - origin.y) * RES)} m`;
      ui.heading.textContent = `${Math.round((((-robot.th * 180) / Math.PI) % 360 + 360) % 360)}°`;
    }

    function setMode() {
      if (performance.now() < noticeUntil) return;
      let text = MODES[mode];
      if (staticMode) text = mode === 'goal' ? 'Route planned to your goal' : 'Map complete';
      else if (!Motion.enabled) text = 'Paused';
      ui.mode.textContent = text;
    }

    function notice(text) {
      ui.mode.textContent = text;
      noticeUntil = performance.now() + 2400;
      setTimeout(setMode, 2500);
    }

    /* ----- Loop and lifecycle ----- */

    function frame(t) {
      raf = 0;
      if (!running) return;
      const dt = Math.min(0.05, (t - last) / 1000 || 0);
      last = t;
      step(dt);
      render();
      updateHud(false);
      raf = requestAnimationFrame(frame);
    }

    function sync() {
      const should = started && Motion.enabled && visible && !document.hidden && !staticMode;
      if (should && !running) {
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(frame);
      } else if (!should && running) {
        running = false;
        cancelAnimationFrame(raf);
        raf = 0;
      }
    }

    function start() {
      started = true;
      staticMode = Motion.reduced && !Motion.enabled;
      phase = 'run';
      fade = 1;
      setup();
      if (staticMode) {
        // Nothing moves: explore instantly and show the finished map.
        for (let k = 0; k < 40000 && phase === 'run'; k++) step(0.05);
        phase = 'done'; mode = 'done'; path = null;
        render();
        updateHud(true);
      } else {
        render();
        updateHud(true);
      }
      setMode();
      sync();
    }

    function nearestPassable(gx, gy, radius) {
      let best = -1; let bestD = Infinity;
      for (let y = gy - radius; y <= gy + radius; y++) {
        for (let x = gx - radius; x <= gx + radius; x++) {
          if (x < 0 || y < 0 || x >= W || y >= H) continue;
          const i = idx(x, y);
          if (!passable(i)) continue;
          const d = (x - gx) ** 2 + (y - gy) ** 2;
          if (d < bestD) { bestD = d; best = i; }
        }
      }
      return best;
    }

    canvas.addEventListener('click', (e) => {
      if (!started) return;
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left; const py = e.clientY - rect.top;
      const target = nearestPassable(Math.floor(px / cs), Math.floor(py / cs), 6);
      if (!staticMode) ripple = { x: px, y: py, t: performance.now(), ok: target >= 0 };

      if (target < 0) {
        notice('That area is not mapped yet. Pick somewhere the robot has seen.');
      } else {
        goalIdx = target;
        mode = 'goal';
        path = null;
        holdT = 0;
        if (phase === 'done') phase = 'run';
        replan();
        if (mode === 'goal') setMode();
        else notice('No known route there yet. Try another spot.');
      }
      if (!running) { render(); updateHud(true); }
    });

    // The hero's pause button is the site-wide motion switch.
    ui.toggle.addEventListener('click', () => Motion.set(!Motion.enabled, true));

    function syncToggle(enabled) {
      ui.toggle.setAttribute('aria-pressed', String(!enabled));
      $('use', ui.toggle).setAttribute('href', enabled ? '#i-pause' : '#i-play');
      $('span', ui.toggle).textContent = enabled ? 'Pause animation' : 'Resume animation';
    }

    Motion.onChange((enabled) => {
      syncToggle(enabled);
      // Under reduced motion the map is drawn already-explored, so switching
      // motion on or off means rebuilding it rather than just pausing.
      if (started && staticMode !== (Motion.reduced && !enabled)) start();
      else { setMode(); sync(); }
    });

    syncToggle(Motion.enabled);

    ui.hint.textContent = window.matchMedia('(hover: none)').matches
      ? 'Tap the map to send the robot somewhere.'
      : 'Click the map to send the robot somewhere.';

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }).observe(canvas);
    }
    document.addEventListener('visibilitychange', sync);

    let resizeTimer;
    if ('ResizeObserver' in window) {
      new ResizeObserver(() => {
        if (!started) return;
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          const rect = canvas.getBoundingClientRect();
          if (Math.abs(rect.width - lastW) < 2 && Math.abs(rect.height - lastH) < 120) return;
          start();
        }, 200);
      }).observe(canvas);
    }

    // Wait for web fonts so the text block has its final size before laying out the building.
    const go = () => { if (!started) start(); };
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(go);
    setTimeout(go, 1500);
  }

  initSlam();
})();
