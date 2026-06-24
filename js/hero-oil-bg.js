/**
 * Canvas — gouttes d'huile et particules dorées en arrière-plan hero
 */
(function initHeroOilBackground() {
  const canvas = document.getElementById('heroOilCanvas');
  const hero = document.querySelector('.hero-commerce');
  if (!canvas || !hero) return;

  const ctx = canvas.getContext('2d');
  let w = 0;
  let h = 0;
  let drops = [];
  let particles = [];
  let raf = 0;

  function resize() {
    const rect = hero.getBoundingClientRect();
    w = canvas.width = Math.floor(rect.width * (window.devicePixelRatio || 1));
    h = canvas.height = Math.floor(rect.height * (window.devicePixelRatio || 1));
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
  }

  function seed() {
    drops = Array.from({ length: 14 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 4 + Math.random() * 14,
      speed: 0.00015 + Math.random() * 0.00035,
      phase: Math.random() * Math.PI * 2,
      opacity: 0.06 + Math.random() * 0.12
    }));
    particles = Array.from({ length: 28 }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: 1 + Math.random() * 2.5,
      vx: (Math.random() - 0.5) * 0.0004,
      vy: -0.0002 - Math.random() * 0.0005,
      opacity: 0.15 + Math.random() * 0.35
    }));
  }

  function drawDrop(drop, time) {
    const rect = hero.getBoundingClientRect();
    const cx = drop.x * rect.width;
    const cy = (drop.y + Math.sin(time * drop.speed * 1000 + drop.phase) * 0.02) * rect.height;
    const r = drop.r;

    const grad = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.35, r * 0.05, cx, cy, r);
    grad.addColorStop(0, `rgba(232, 197, 71, ${drop.opacity * 1.4})`);
    grad.addColorStop(0.45, `rgba(201, 162, 39, ${drop.opacity})`);
    grad.addColorStop(1, 'rgba(42, 66, 40, 0)');

    ctx.beginPath();
    ctx.fillStyle = grad;
    ctx.ellipse(cx, cy, r * 0.85, r, -0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.strokeStyle = `rgba(255, 255, 255, ${drop.opacity * 0.5})`;
    ctx.lineWidth = 0.8;
    ctx.ellipse(cx - r * 0.15, cy - r * 0.35, r * 0.35, r * 0.18, -0.5, 0, Math.PI * 2);
    ctx.stroke();
  }

  function frame(time) {
    const rect = hero.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    drops.forEach((drop) => {
      drop.y += drop.speed;
      if (drop.y > 1.08) {
        drop.y = -0.08;
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
      ctx.arc(p.x * rect.width, p.y * rect.height, p.size, 0, Math.PI * 2);
      ctx.fill();
    });

    raf = requestAnimationFrame(frame);
  }

  function addRipple(clientX, clientY) {
    const host = document.getElementById('heroOilRipples');
    if (!host) return;
    const rect = hero.getBoundingClientRect();
    const el = document.createElement('span');
    el.className = 'oil-ripple';
    el.style.left = `${clientX - rect.left}px`;
    el.style.top = `${clientY - rect.top}px`;
    el.style.width = el.style.height = `${80 + Math.random() * 60}px`;
    host.appendChild(el);
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }

  hero.addEventListener('click', (e) => addRipple(e.clientX, e.clientY));

  window.addEventListener('resize', () => { resize(); seed(); });
  resize();
  seed();
  raf = requestAnimationFrame(frame);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else raf = requestAnimationFrame(frame);
  });
})();
