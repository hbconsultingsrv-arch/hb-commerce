/**
 * Cube 3D — catalogue actif (marques) avec navigation clic / glisser
 */
function buildHeroCubeItems(products) {
  if (!products?.length) return [];

  const groups = typeof groupProductsByBrand === 'function'
    ? groupProductsByBrand(products)
    : [];

  return groups.map(([brand, list]) => {
    const meta = typeof getBrandMeta === 'function' ? getBrandMeta(brand) : {};
    const sample = list[0];
    const img = sample && typeof resolveProductImage === 'function'
      ? resolveProductImage(sample)
      : (window.FIAFI_IMAGES?.product || 'images/prenium.PNG');
    return {
      brand,
      count: list.length,
      img,
      tagline: meta.tagline || 'Distribué par HB Commerce',
      origin: meta.origin || '',
      href: '#products'
    };
  });
}

function initHeroBrandCube(products) {
  const viewport = document.getElementById('heroCubeViewport');
  const cube = document.getElementById('heroCube');
  const meta = document.getElementById('heroCubeMeta');
  const counter = document.getElementById('heroCubeCounter');
  const dotsHost = document.getElementById('heroCubeDots');
  const legacyHost = document.getElementById('heroPromoBrands');

  if (!viewport || !cube) return;

  const items = buildHeroCubeItems(products);

  if (!items.length) {
    cube.innerHTML = '';
    viewport.innerHTML = `<div class="hero-cube-empty">${typeof renderCatalogEmptyMessage === 'function' ? renderCatalogEmptyMessage() : 'Catalogue en cours de chargement…'}</div>`;
    if (meta) meta.hidden = true;
    if (counter) counter.hidden = true;
    if (dotsHost) dotsHost.hidden = true;
    if (legacyHost) legacyHost.innerHTML = '';
    return;
  }

  const n = items.length;
  const angleStep = 360 / n;
  let index = 0;
  let rotationY = 0;
  let dragStartX = 0;
  let dragging = false;
  let moved = false;

  function cubeDepth(count) {
    const w = viewport.clientWidth || 400;
    const base = Math.min(340, w * 0.38);
    return Math.round(Math.max(160, base * (count <= 4 ? 0.52 : 0.48)));
  }

  const depth = cubeDepth(n);

  cube.innerHTML = items.map((item, i) => {
    const rotY = i * angleStep;
    return `
      <a class="hero-cube-face" href="${item.href}" data-index="${i}"
         style="transform: rotateY(${rotY}deg) translateZ(${depth}px)"
         aria-label="${escapeHtml(item.brand)} — ${item.count} produit${item.count > 1 ? 's' : ''}">
        <span class="hero-cube-face-glow" aria-hidden="true"></span>
        <img src="${item.img}" alt="${escapeHtml(item.brand)}" loading="lazy" decoding="async"
             onerror="this.src='${window.FIAFI_IMAGES?.product || 'images/prenium.PNG'}'">
        <div class="hero-cube-face-body">
          <div class="hero-cube-face-brand">${escapeHtml(item.brand)}</div>
          <div class="hero-cube-face-count">${item.count} produit${item.count > 1 ? 's' : ''}</div>
          ${item.origin ? `<span class="hero-cube-face-tag">${escapeHtml(item.origin)}</span>` : ''}
        </div>
      </a>
    `;
  }).join('');

  function applyTransform(animate) {
    cube.classList.toggle('is-snap-transition', animate !== false);
    cube.style.transform = `rotateX(-8deg) rotateY(${rotationY}deg)`;
  }

  function updateUI() {
    const item = items[index];
    if (counter) counter.textContent = `${index + 1} / ${n}`;
    if (meta) {
      meta.hidden = false;
      meta.innerHTML = `
        <div class="hero-cube-meta-title">${escapeHtml(item.brand)}</div>
        <div class="hero-cube-meta-desc">${escapeHtml(item.tagline)}${item.origin ? ` · ${escapeHtml(item.origin)}` : ''}</div>
      `;
    }
    if (dotsHost) {
      dotsHost.querySelectorAll('.hero-cube-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
        dot.setAttribute('aria-current', i === index ? 'true' : 'false');
      });
    }
  }

  function goTo(i, animate) {
    index = ((i % n) + n) % n;
    rotationY = -index * angleStep;
    applyTransform(animate);
    updateUI();
  }

  function next() { goTo(index + 1); }
  function prev() { goTo(index - 1); }

  if (dotsHost) {
    dotsHost.hidden = false;
    dotsHost.innerHTML = items.map((_, i) =>
      `<button type="button" class="hero-cube-dot${i === 0 ? ' active' : ''}" data-index="${i}" aria-label="Marque ${i + 1}"></button>`
    ).join('');
    dotsHost.querySelectorAll('.hero-cube-dot').forEach((dot) => {
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        goTo(parseInt(dot.dataset.index, 10));
      });
    });
  }

  viewport.addEventListener('click', (e) => {
    if (moved) return;
    if (e.target.closest('.hero-cube-face')) return;
    const rect = viewport.getBoundingClientRect();
    if (e.clientX - rect.left > rect.width / 2) next();
    else prev();
  });

  viewport.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    dragging = true;
    moved = false;
    dragStartX = e.clientX;
    viewport.classList.add('is-dragging');
    viewport.setPointerCapture(e.pointerId);
  });

  viewport.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - dragStartX;
    if (Math.abs(dx) > 8) moved = true;
    cube.classList.remove('is-snap-transition');
    cube.style.transform = `rotateX(-8deg) rotateY(${rotationY + dx * 0.35}deg)`;
  });

  viewport.addEventListener('pointerup', (e) => {
    if (!dragging) return;
    dragging = false;
    viewport.classList.remove('is-dragging');
    const dx = e.clientX - dragStartX;
    if (Math.abs(dx) > 40) {
      if (dx < 0) next();
      else prev();
    } else {
      applyTransform(true);
    }
    setTimeout(() => { moved = false; }, 50);
  });

  viewport.addEventListener('pointercancel', () => {
    dragging = false;
    viewport.classList.remove('is-dragging');
    applyTransform(true);
  });

  let touchStartX = 0;
  viewport.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].clientX;
  }, { passive: true });

  viewport.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) {
      if (dx < 0) next();
      else prev();
    }
  }, { passive: true });

  goTo(0, false);

  if (legacyHost && typeof renderHeroPromoBrands === 'function') {
    legacyHost.innerHTML = renderHeroPromoBrands(products);
  }
}

window.initHeroBrandCube = initHeroBrandCube;
window.buildHeroCubeItems = buildHeroCubeItems;
