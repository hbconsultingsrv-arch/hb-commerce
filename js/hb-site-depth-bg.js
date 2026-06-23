/**
 * Canvas huile + particules — fond premium page (sous le hero)
 */
(function initSiteDepthBackground() {
  const host = document.getElementById('hbSiteDepth');
  const canvas = document.getElementById('hbDepthCanvas');
  if (!host || !canvas) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const ctx = canvas.getContext('2d');
  let drops = [];
  let particles = [];
  let raf = 0;

  function resize() {
    const h = host.scrollHeight;
    const w = host.clientWidth;
    canvas.width = Math.floor(w * (window.devicePixelRatio || 1));
    canvas.height = Math.floor(h * (window.devicePixelRatio || 1));
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
  }

  function seed() {
    const count = Math.max(10, Math.floor(host.scrollHeight / 120));
    drops = Array.from({ length: count }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 3 + Math.random() * 12,
      speed: 0.0001 + Math.random() * 0.00025,
      phase: Math.random() * Math.PI * 2,
      opacity: 0.05 + Math.random() * 0.1
    }));
    particles = Array.from({ length: count * 2 }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: 1 + Math.random() * 2,
      vx: (Math.random() - 0.5) * 0.0003,
      vy: -0.00015 - Math.random() * 0.0004,
      opacity: 0.12 + Math.random() * 0.28
    }));
  }

  function drawDrop(drop, time) {
    const w = host.clientWidth;
    const h = host.scrollHeight;
    const cx = drop.x * w;
    const cy = (drop.y + Math.sin(time * drop.speed * 1000 + drop.phase) * 0.015) * h;
    const r = drop.r;

    const grad = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.35, r * 0.05, cx, cy, r);
    grad.addColorStop(0, `rgba(232, 197, 71, ${drop.opacity * 1.3})`);
    grad.addColorStop(0.45, `rgba(201, 162, 39, ${drop.opacity})`);
    grad.addColorStop(1, 'rgba(42, 66, 40, 0)');

    ctx.beginPath();
    ctx.fillStyle = grad;
    ctx.ellipse(cx, cy, r * 0.85, r, -0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  function frame(time) {
    const w = host.clientWidth;
    const h = host.scrollHeight;
    ctx.clearRect(0, 0, w, h);

    drops.forEach((drop) => {
      drop.y += drop.speed;
      if (drop.y > 1.05) {
        drop.y = -0.05;
        drop.x = Math.random();
      }
      drawDrop(drop, time);
    });

    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.y < -0.05) p.y = 1.05;
      if (p.x < -0.05) p.x = 1.05;
      if (p.x > 1.05) p.x = -0.05;

      ctx.beginPath();
      ctx.fillStyle = `rgba(232, 197, 71, ${p.opacity})`;
      ctx.arc(p.x * w, p.y * h, p.size, 0, Math.PI * 2);
      ctx.fill();
    });

    raf = requestAnimationFrame(frame);
  }

  function addRipple(clientX, clientY) {
    const ripples = document.getElementById('hbDepthRipples');
    if (!ripples) return;
    const rect = host.getBoundingClientRect();
    const el = document.createElement('span');
    el.className = 'oil-ripple';
    el.style.left = `${clientX - rect.left}px`;
    el.style.top = `${clientY - rect.top + host.scrollTop}px`;
    el.style.width = el.style.height = `${60 + Math.random() * 50}px`;
    ripples.appendChild(el);
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }

  host.addEventListener('click', (e) => {
    if (e.target.closest('a, button, input, select, textarea, label')) return;
    addRipple(e.clientX, e.clientY);
  });

  const ro = typeof ResizeObserver !== 'undefined'
    ? new ResizeObserver(() => { resize(); seed(); })
    : null;
  if (ro) ro.observe(host);
  else window.addEventListener('resize', () => { resize(); seed(); });

  window.addEventListener('scroll', () => {
    const bg = document.getElementById('hbDepthBg');
    if (!bg) return;
    const rect = host.getBoundingClientRect();
    const offset = Math.max(0, -rect.top) * 0.08;
    bg.style.transform = `translateY(${offset}px) scale(1.06)`;
  }, { passive: true });

  resize();
  seed();
  raf = requestAnimationFrame(frame);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else raf = requestAnimationFrame(frame);
  });
})();
