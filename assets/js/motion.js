/* Ali Pahlevani, portfolio: project galleries and the scroll-driven motion.
   Page behaviour and the hero simulation live in script.js, which also owns
   window.APMotion, the site-wide motion switch. */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const Motion = window.APMotion || { enabled: true, reduced: false, onChange: () => () => {} };
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const ACCENT = 'rgba(162, 119, 255';
  const SPARK = 'rgba(255, 194, 75';
  const TEXT = 'rgba(242, 236, 255';

  /* ==========================================================================
     Project galleries
     A project's pictures live in assets/images/projects/<slug>/. Numbered
     files (1.webp, 2.jpg, ...) are found by probing; an images.json in the
     folder overrides that and can carry alt text.
     ========================================================================== */

  const EXTS = ['webp', 'jpg', 'png'];
  const MAX_IMAGES = 20;

  const imageExists = (src) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });

  async function listImages(slug, title) {
    const dir = `assets/images/projects/${slug}`;

    try {
      const res = await fetch(`${dir}/images.json`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length) {
          return data.map((entry, i) => (typeof entry === 'string'
            ? { src: `${dir}/${entry}`, alt: `${title}, picture ${i + 1}` }
            : { src: `${dir}/${entry.src}`, alt: entry.alt || `${title}, picture ${i + 1}` }));
        }
        return [];
      }
    } catch { /* no manifest, fall through to probing */ }

    const found = [];
    let preferred = null;
    for (let n = 1; n <= MAX_IMAGES; n++) {
      const order = preferred ? [preferred, ...EXTS.filter((e) => e !== preferred)] : EXTS;
      let hit = null;
      for (const ext of order) {
        const src = `${dir}/${n}.${ext}`;
        // eslint-disable-next-line no-await-in-loop
        if (await imageExists(src)) { hit = src; preferred = ext; break; }
      }
      if (!hit) break;
      found.push({ src: hit, alt: `${title}, picture ${n}` });
    }
    return found;
  }

  function buildGallery(container, images) {
    const single = images.length === 1;
    const gallery = document.createElement('div');
    gallery.className = 'gallery';

    const frame = document.createElement('div');
    frame.className = 'gallery__frame';

    const track = document.createElement('ul');
    track.className = 'gallery__track';
    images.forEach((image, i) => {
      const slide = document.createElement('li');
      slide.className = 'gallery__slide';
      const img = document.createElement('img');
      img.src = image.src;
      img.alt = image.alt;
      img.loading = i === 0 ? 'eager' : 'lazy';
      img.decoding = 'async';
      slide.append(img);
      track.append(slide);
    });
    frame.append(track);
    gallery.append(frame);

    if (single) {
      container.append(gallery);
      return;
    }

    const prev = document.createElement('button');
    const next = document.createElement('button');
    [prev, next].forEach((button, i) => {
      button.type = 'button';
      button.className = `gallery__nav gallery__nav--${i ? 'next' : 'prev'}`;
      button.innerHTML = `<svg class="icon" aria-hidden="true"><use href="#i-${i ? 'right' : 'left'}"/></svg>`;
      const label = document.createElement('span');
      label.className = 'visually-hidden';
      label.textContent = i ? 'Next picture' : 'Previous picture';
      button.append(label);
    });
    gallery.append(prev, next);

    const bar = document.createElement('div');
    bar.className = 'gallery__bar';
    const dots = document.createElement('ul');
    dots.className = 'gallery__dots';
    const counter = document.createElement('p');
    counter.className = 'gallery__counter';

    const dotButtons = images.map((_, i) => {
      const li = document.createElement('li');
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'gallery__dot';
      dot.innerHTML = `<span class="visually-hidden">Picture ${i + 1}</span>`;
      dot.addEventListener('click', () => show(i));
      li.append(dot);
      dots.append(li);
      return dot;
    });

    bar.append(dots, counter);
    gallery.append(bar);

    let index = 0;
    function show(i) {
      index = Math.max(0, Math.min(images.length - 1, i));
      track.style.setProperty('--slide', index);
      counter.textContent = `${index + 1} / ${images.length}`;
      dotButtons.forEach((dot, k) => {
        if (k === index) dot.setAttribute('aria-current', 'true');
        else dot.removeAttribute('aria-current');
      });
      prev.disabled = index === 0;
      next.disabled = index === images.length - 1;
    }

    prev.addEventListener('click', () => show(index - 1));
    next.addEventListener('click', () => show(index + 1));

    gallery.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { show(index - 1); e.preventDefault(); }
      if (e.key === 'ArrowRight') { show(index + 1); e.preventDefault(); }
    });

    // Swipe
    let startX = null;
    frame.addEventListener('pointerdown', (e) => { startX = e.clientX; });
    frame.addEventListener('pointerup', (e) => {
      if (startX === null) return;
      const dx = e.clientX - startX;
      startX = null;
      if (Math.abs(dx) > 40) show(index + (dx < 0 ? 1 : -1));
    });
    frame.addEventListener('pointercancel', () => { startX = null; });

    show(0);
    container.append(gallery);
  }

  const galleryMounts = $$('[data-gallery]');
  if (galleryMounts.length) {
    const loadInto = (mount) => {
      if (mount.dataset.loaded) return;
      mount.dataset.loaded = '1';
      listImages(mount.dataset.gallery, mount.dataset.galleryTitle || 'Project')
        .then((images) => {
          if (images.length) {
            // Real pictures replace whatever placeholder the slot holds (the ICP tile).
            if (mount.children.length) {
              mount.innerHTML = '';
              mount.classList.remove('project__media--icp');
            }
            buildGallery(mount, images);
          } else if (!mount.children.length) {
            mount.classList.add('is-empty');
          }
        });
    };

    if ('IntersectionObserver' in window) {
      // Watch the card, not the mount: an empty mount has no height to intersect with.
      const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const mount = entry.target.querySelector('[data-gallery]');
          if (mount) loadInto(mount);
          obs.unobserve(entry.target);
        });
      }, { rootMargin: '400px 0px' });
      galleryMounts.forEach((mount) => observer.observe(mount.closest('.project') || mount));
    } else {
      galleryMounts.forEach(loadInto);
    }
  }

  /* ==========================================================================
     Journey trail: the robot's route down the page
     ========================================================================== */

  const journey = $('[data-journey]');
  const sections = ['about', 'experience', 'projects', 'skills', 'contact']
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  let trail = null;

  function buildTrail() {
    if (!journey || !sections.length) return null;
    journey.innerHTML = '';
    const height = window.innerHeight;
    const midX = 36;
    const top = 90;
    const bottom = height - 60;

    const stops = sections.map((section, i) => {
      const docTop = section.offsetTop;
      const docEnd = docTop + section.offsetHeight;
      const mid = (docTop + docEnd) / 2;
      return {
        section,
        at: mid / document.documentElement.scrollHeight,
        x: midX + (i % 2 ? 11 : -11),
      };
    });

    const points = stops.map((stop) => ({ x: stop.x, y: top + stop.at * (bottom - top) }));
    let d = `M ${midX} ${top - 26}`;
    points.forEach((point, i) => {
      const previous = i ? points[i - 1] : { x: midX, y: top - 26 };
      const midY = (previous.y + point.y) / 2;
      d += ` C ${previous.x} ${midY}, ${point.x} ${midY}, ${point.x} ${point.y}`;
    });
    d += ` C ${points[points.length - 1].x} ${bottom}, ${midX} ${bottom}, ${midX} ${bottom + 20}`;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 72 ${height}`);
    svg.innerHTML = `
      <path class="journey__line" d="${d}"></path>
      <path class="journey__progress" d="${d}"></path>
      <g class="journey__stops"></g>
      <path class="journey__robot" d="M 7 0 L -5 5 L -2.5 0 L -5 -5 Z"></path>`;
    journey.append(svg);

    const line = $('.journey__progress', svg);
    const length = line.getTotalLength();
    line.style.strokeDasharray = `${length}`;
    line.style.strokeDashoffset = `${length}`;

    const group = $('.journey__stops', svg);
    const marks = points.map((point, i) => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('class', 'journey__stop');
      circle.setAttribute('cx', point.x);
      circle.setAttribute('cy', point.y);
      circle.setAttribute('r', 4);
      circle.addEventListener('click', () => stops[i].section.scrollIntoView({ behavior: Motion.enabled ? 'smooth' : 'auto' }));
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('class', 'journey__label');
      label.setAttribute('x', point.x + 10);
      label.setAttribute('y', point.y + 3.5);
      label.textContent = stops[i].section.id.replace(/^./, (c) => c.toUpperCase());
      group.append(circle, label);
      return { circle, label, at: stops[i].at };
    });

    return { line, length, robot: $('.journey__robot', svg), marks, path: $('.journey__line', svg) };
  }

  /* ==========================================================================
     One scroll loop drives the progress bar, the trail, the timeline rail and
     the image parallax. Geometry is cached and only recomputed on resize.
     ========================================================================== */

  const progressBar = $('[data-progress]');
  const timeline = $('[data-timeline]');
  let parallaxTargets = [];
  let timelineBox = null;
  let ticking = false;

  function measure() {
    parallaxTargets = $$('.gallery__slide img').map((img) => ({ img, box: null }));
    timelineBox = timeline ? { top: timeline.offsetTop, height: timeline.offsetHeight } : null;
    trail = window.innerWidth >= 1100 ? buildTrail() : null;
    if (!trail && journey) journey.innerHTML = '';
    update();
  }

  function update() {
    ticking = false;
    const scroll = window.scrollY;
    const viewport = window.innerHeight;
    const scrollable = Math.max(1, document.documentElement.scrollHeight - viewport);
    const progress = Math.min(1, Math.max(0, scroll / scrollable));

    if (progressBar) progressBar.style.setProperty('--progress', progress.toFixed(4));

    if (timeline && timelineBox) {
      const drawn = (scroll + viewport * 0.75 - timelineBox.top) / Math.max(1, timelineBox.height);
      timeline.style.setProperty('--draw', Math.min(1, Math.max(0, drawn)).toFixed(3));
    }

    if (trail) {
      trail.line.style.strokeDashoffset = `${trail.length * (1 - progress)}`;
      const along = trail.length * progress;
      const point = trail.path.getPointAtLength(along);
      // Sample either side so the heading stays right at both ends of the path.
      const behind = trail.path.getPointAtLength(Math.max(0, along - 4));
      const ahead = trail.path.getPointAtLength(Math.min(trail.length, along + 4));
      const angle = (Math.atan2(ahead.y - behind.y, ahead.x - behind.x) * 180) / Math.PI;
      trail.robot.setAttribute('transform', `translate(${point.x} ${point.y}) rotate(${angle})`);
      trail.marks.forEach((mark) => {
        mark.circle.classList.toggle('is-passed', progress >= mark.at - 0.02);
        mark.label.classList.toggle('is-current', Math.abs(progress - mark.at) < 0.06);
      });
    }

    if (Motion.enabled && parallaxTargets.length) {
      parallaxTargets.forEach((target) => {
        const rect = target.img.getBoundingClientRect();
        if (rect.bottom < -100 || rect.top > viewport + 100) return;
        const centred = (rect.top + rect.height / 2 - viewport / 2) / viewport;
        target.img.style.setProperty('--py', `${(-centred * 14).toFixed(1)}px`);
      });
    }
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => { clearTimeout(measure.timer); measure.timer = setTimeout(measure, 200); });
  window.addEventListener('load', measure);
  setTimeout(measure, 600);

  /* ==========================================================================
     Card tilt
     ========================================================================== */

  if (finePointer.matches) {
    $$('.project__media').forEach((media) => {
      media.addEventListener('pointermove', (e) => {
        if (!Motion.enabled) return;
        const rect = media.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;
        media.style.setProperty('--ry', `${(px * 8).toFixed(2)}deg`);
        media.style.setProperty('--rx', `${(-py * 8).toFixed(2)}deg`);
      });
      media.addEventListener('pointerleave', () => {
        media.style.setProperty('--ry', '0deg');
        media.style.setProperty('--rx', '0deg');
      });
    });
  }

  /* ==========================================================================
     GenZ-ICP tile: two point clouds converging, the way scan matching works
     ========================================================================== */

  function initIcp() {
    const canvas = $('[data-icp]');
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    let dpr = 1; let w = 0; let h = 0;
    let target = []; let source = [];
    let pose = { x: 0, y: 0, th: 0 };
    let raf = 0; let running = false; let visible = false;
    let t = 0;

    function shape(n) {
      // A room outline: three walls and a pillar, the sort of thing a lidar sees.
      const pts = [];
      for (let i = 0; i < n; i++) {
        const u = i / n;
        if (u < 0.3) pts.push({ x: -0.8 + (u / 0.3) * 1.6, y: -0.55 });
        else if (u < 0.6) pts.push({ x: 0.8, y: -0.55 + ((u - 0.3) / 0.3) * 1.1 });
        else if (u < 0.85) pts.push({ x: 0.8 - ((u - 0.6) / 0.25) * 1.6, y: 0.55 });
        else {
          const a = ((u - 0.85) / 0.15) * Math.PI * 2;
          pts.push({ x: -0.15 + Math.cos(a) * 0.18, y: Math.sin(a) * 0.18 });
        }
      }
      return pts.map((p) => ({ x: p.x + (Math.random() - 0.5) * 0.02, y: p.y + (Math.random() - 0.5) * 0.02 }));
    }

    function reset() {
      target = shape(150);
      pose = { x: 0.34, y: 0.2, th: 0.5 };
      t = 0;
    }

    function project() {
      const c = Math.cos(pose.th); const s = Math.sin(pose.th);
      source = target.map((p) => ({ x: p.x * c - p.y * s + pose.x, y: p.x * s + p.y * c + pose.y }));
    }

    function draw() {
      const scale = Math.min(w, h) * 0.42;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.translate(w * 0.5, h * 0.42);

      ctx.fillStyle = `${ACCENT}, 0.55)`;
      target.forEach((p) => ctx.fillRect(p.x * scale - 1, p.y * scale - 1, 2, 2));
      ctx.fillStyle = `${SPARK}, 0.9)`;
      source.forEach((p) => ctx.fillRect(p.x * scale - 1, p.y * scale - 1, 2, 2));

      // correspondence lines, thinning out as the clouds align
      const spread = Math.hypot(pose.x, pose.y) + Math.abs(pose.th);
      if (spread > 0.02) {
        ctx.strokeStyle = `${TEXT}, ${Math.min(0.18, spread * 0.25).toFixed(3)})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        for (let i = 0; i < target.length; i += 6) {
          ctx.moveTo(target[i].x * scale, target[i].y * scale);
          ctx.lineTo(source[i].x * scale, source[i].y * scale);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    function frame() {
      raf = 0;
      if (!running) return;
      t += 1 / 60;
      // Gauss-Newton-ish: each iteration removes a fraction of the remaining error.
      if (t < 4) {
        const k = 0.045;
        pose.x -= pose.x * k; pose.y -= pose.y * k; pose.th -= pose.th * k;
      } else if (t > 5.5) {
        reset();
      }
      project();
      draw();
      raf = requestAnimationFrame(frame);
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width; h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      project();
      draw();
    }

    function sync() {
      const should = visible && Motion.enabled && !document.hidden;
      if (should && !running) { running = true; raf = requestAnimationFrame(frame); }
      else if (!should && running) { running = false; cancelAnimationFrame(raf); raf = 0; }
    }

    reset();
    if (!Motion.enabled) { pose = { x: 0, y: 0, th: 0 }; }
    resize();

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }).observe(canvas);
    } else { visible = true; }
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
    document.addEventListener('visibilitychange', sync);
    Motion.onChange((enabled) => {
      if (!enabled) { pose = { x: 0, y: 0, th: 0 }; project(); draw(); }
      sync();
    });
  }

  initIcp();

  /* ==========================================================================
     Ambient scan: the cursor acts as a lidar over a faint occupancy grid
     ========================================================================== */

  function initScanLayer() {
    if (!finePointer.matches) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'scan-layer';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.prepend(canvas);

    const ctx = canvas.getContext('2d');
    const STEP = 26;
    const RADIUS = 150;
    let dpr = 1; let w = 0; let h = 0; let cols = 0; let rows = 0;
    let heat = new Float32Array(0);
    let pointer = { x: -999, y: -999 };
    let raf = 0; let running = false; let lastFrame = 0;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      cols = Math.ceil(w / STEP) + 1;
      rows = Math.ceil(h / STEP) + 1;
      heat = new Float32Array(cols * rows);
    }

    function draw(now) {
      raf = 0;
      if (!running) return;
      if (now - lastFrame < 33) { raf = requestAnimationFrame(draw); return; } // ~30fps is plenty
      const dt = Math.min(0.1, (now - lastFrame) / 1000);
      lastFrame = now;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const cx = Math.round(pointer.x / STEP);
      const cy = Math.round(pointer.y / STEP);
      const span = Math.ceil(RADIUS / STEP);
      let alive = false;

      for (let gy = 0; gy < rows; gy++) {
        for (let gx = 0; gx < cols; gx++) {
          const i = gy * cols + gx;
          let value = heat[i];
          if (Math.abs(gx - cx) <= span && Math.abs(gy - cy) <= span) {
            const dx = gx * STEP - pointer.x;
            const dy = gy * STEP - pointer.y;
            const d = Math.hypot(dx, dy);
            if (d < RADIUS) value = Math.max(value, 1 - d / RADIUS);
          }
          if (value <= 0.01) { heat[i] = 0; continue; }
          heat[i] = value - dt * 0.9;
          alive = true;
          const a = value * 0.5;
          ctx.fillStyle = `${ACCENT}, ${a.toFixed(3)})`;
          const size = 1 + value * 1.6;
          ctx.fillRect(gx * STEP - size / 2, gy * STEP - size / 2, size, size);
        }
      }

      if (!alive && pointer.x < -100) { running = false; return; }
      raf = requestAnimationFrame(draw);
    }

    function wake() {
      if (running || !Motion.enabled || document.hidden) return;
      running = true;
      lastFrame = performance.now();
      raf = requestAnimationFrame(draw);
    }

    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      pointer = { x: e.clientX, y: e.clientY };
      wake();
    }, { passive: true });

    window.addEventListener('pointerleave', () => { pointer = { x: -999, y: -999 }; });
    window.addEventListener('resize', () => { clearTimeout(resize.timer); resize.timer = setTimeout(resize, 200); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) { running = false; cancelAnimationFrame(raf); } });
    Motion.onChange((enabled) => {
      if (!enabled) {
        running = false;
        cancelAnimationFrame(raf);
        ctx.clearRect(0, 0, w, h);
        heat.fill(0);
      }
    });

    resize();
  }

  initScanLayer();

  /* ==========================================================================
     Contact: the robot arrives at its goal, one time, when you reach the end
     ========================================================================== */

  function initArrival() {
    const canvas = $('[data-arrival]');
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    let dpr = 1; let w = 0; let h = 0; let raf = 0; let played = false;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width; h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }

    // Kept in the empty band below the links, so the route never crosses text.
    function route() {
      const y = h - 54;
      return [{ x: w * 0.42, y: y + 26 }, { x: w * 0.56, y }, { x: w * 0.7, y: y - 18 }, { x: w * 0.82, y: y - 6 }];
    }

    function at(points, u) {
      const span = (points.length - 1) * u;
      const i = Math.min(points.length - 2, Math.floor(span));
      const f = span - i;
      const a = points[i]; const b = points[i + 1];
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, angle: Math.atan2(b.y - a.y, b.x - a.x) };
    }

    function draw(u) {
      const points = route();
      const goal = points[points.length - 1];
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // travelled route
      ctx.setLineDash([4, 5]);
      ctx.strokeStyle = `${ACCENT}, 0.5)`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      const steps = 40;
      for (let k = 1; k <= steps; k++) {
        const p = at(points, (k / steps) * u);
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // goal marker
      ctx.strokeStyle = `${SPARK}, ${(0.35 + 0.65 * u).toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(goal.x, goal.y, 13, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = `${SPARK}, 0.9)`;
      ctx.beginPath();
      ctx.arc(goal.x, goal.y, 2.5, 0, Math.PI * 2);
      ctx.fill();

      const pose = at(points, u);
      ctx.save();
      ctx.translate(pose.x, pose.y);
      ctx.rotate(pose.angle);
      ctx.fillStyle = `${ACCENT}, 0.18)`;
      ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `${ACCENT}, 1)`;
      ctx.beginPath();
      ctx.moveTo(11, 0); ctx.lineTo(-7, 7); ctx.lineTo(-3.5, 0); ctx.lineTo(-7, -7);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    function play() {
      if (played) return;
      played = true;
      resize();
      if (!Motion.enabled) { draw(1); return; }
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - start) / 2200);
        draw(1 - (1 - t) ** 3);
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry], obs) => {
        if (!entry.isIntersecting) return;
        play();
        obs.disconnect();
      }, { threshold: 0.35 }).observe(canvas);
    } else {
      play();
    }

    window.addEventListener('resize', () => {
      clearTimeout(resize.timer);
      resize.timer = setTimeout(() => { if (played) { resize(); draw(1); } }, 200);
    });
    Motion.onChange(() => { if (played) { cancelAnimationFrame(raf); draw(1); } });
  }

  initArrival();
})();
