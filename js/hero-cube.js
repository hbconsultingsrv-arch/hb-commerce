/**
 * Carrousel catalogue actif — photos plein écran, swipe gauche/droite
 */
const HERO_CUBE_AUTO_MS = 4500;

function buildHeroCubeItems(products) {
  if (!products?.length) return [];

  const groups = typeof groupProductsByBrand === 'function'
    ? groupProductsByBrand(products)
    : [];

  const fallback = window.FIAFI_IMAGES?.product || 'images/prenium.PNG';

  return groups.map(([brand, list]) => {
    const meta = typeof getBrandMeta === 'function' ? getBrandMeta(brand) : {};
    const sample = list[0];
    const img = sample && typeof resolveProductImage === 'function'
      ? resolveProductImage(sample)
      : fallback;
    const slug = meta.slug || brand.toLowerCase().replace(/\s+/g, '-');
    return {
      brand,
      count: list.length,
      img,
      tagline: meta.tagline || 'Distribué par HB Commerce',
      origin: meta.origin || '',
      href: `#marque-${slug}`
    };
  });
}

function initHeroBrandCube(products) {
  const viewport = document.getElementById('heroCubeViewport');
  const track = document.getElementById('heroCube');
  const meta = document.getElementById('heroCubeMeta');
  const counter = document.getElementById('heroCubeCounter');
  const backdrop = document.getElementById('heroCubeBackdrop');
  const btnPrev = document.getElementById('heroCubePrev');
  const btnNext = document.getElementById('heroCubeNext');
  const legacyHost = document.getElementById('heroPromoBrands');

  if (!viewport || !track) return;

  const items = buildHeroCubeItems(products);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!items.length) {
    track.innerHTML = '';
    const slider = viewport.querySelector('.hero-cube-slider');
    if (slider) {
      slider.innerHTML = `<div class="hero-cube-empty">${typeof renderCatalogEmptyMessage === 'function' ? renderCatalogEmptyMessage() : 'Catalogue en cours de chargement…'}</div>`;
    }
    if (meta) meta.hidden = true;
    if (counter) counter.hidden = true;
    if (btnPrev) btnPrev.hidden = true;
    if (btnNext) btnNext.hidden = true;
    if (legacyHost) legacyHost.innerHTML = '';
    return;
  }

  const n = items.length;
  let index = 0;
  let dragOffsetPx = 0;
  let dragStartX = 0;
  let dragging = false;
  let moved = false;
  let pointerStartOnSlide = null;
  let pointerId = null;
  let suppressViewportClick = false;
  let autoTimer = null;
  let paused = false;
  const fallback = window.FIAFI_IMAGES?.product || 'images/prenium.PNG';

  track.innerHTML = items.map((item, i) => `
    <a class="hero-cube-slide" href="${item.href}" data-index="${i}"
       aria-label="${escapeHtml(item.brand)} — ${item.count} produit${item.count > 1 ? 's' : ''}">
      <img class="hero-cube-slide-img" src="${item.img}" alt="${escapeHtml(item.brand)}" loading="lazy" decoding="async"
           onerror="this.src='${fallback}'">
      <div class="hero-cube-slide-shine" aria-hidden="true"></div>
      <div class="hero-cube-slide-shade" aria-hidden="true"></div>
      <div class="hero-cube-slide-caption">
        <span class="hero-cube-slide-brand">${escapeHtml(item.brand)}</span>
        <span class="hero-cube-slide-meta">${item.count} produit${item.count > 1 ? 's' : ''}${item.origin ? ` · ${escapeHtml(item.origin)}` : ''}</span>
      </div>
    </a>
  `).join('');

  if (btnPrev) btnPrev.hidden = n <= 1;
  if (btnNext) btnNext.hidden = n <= 1;

  function updateTrackPosition(animate = true) {
    track.classList.toggle('is-snap-transition', animate);
    track.style.transform = `translateX(calc(-${index * 100}% + ${dragOffsetPx}px))`;
  }

  function updateBackdrop(item) {
    if (!backdrop) return;
    backdrop.innerHTML = `<img src="${item.img}" alt="" aria-hidden="true" onerror="this.src='${fallback}'">`;
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
    updateBackdrop(item);
    updateTrackPosition(true);
  }

  function goTo(i, animate = true) {
    index = ((i % n) + n) % n;
    dragOffsetPx = 0;
    if (animate) updateUI();
    else updateTrackPosition(false);
    if (!animate) {
      const item = items[index];
      if (counter) counter.textContent = `${index + 1} / ${n}`;
      updateBackdrop(item);
    }
  }

  function next() { goTo(index + 1); }
  function prev() { goTo(index - 1); }

  function stopAuto() {
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
  }

  function startAuto() {
    if (reducedMotion || n <= 1 || paused) return;
    stopAuto();
    autoTimer = setInterval(() => {
      if (!dragging && !document.hidden && !paused) next();
    }, HERO_CUBE_AUTO_MS);
  }

  function pauseAuto(ms = 8000) {
    paused = true;
    viewport.classList.add('is-paused');
    stopAuto();
    setTimeout(() => {
      paused = false;
      viewport.classList.remove('is-paused');
      startAuto();
    }, ms);
  }

  function slideAtPoint(x, y) {
    const el = document.elementFromPoint(x, y);
    return el?.closest('.hero-cube-slide') || null;
  }

  function followSlideLink(slide) {
    const href = slide?.getAttribute('href');
    if (!href) return;
    if (href.startsWith('#')) {
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
    window.location.href = href;
  }

  btnPrev?.addEventListener('click', (e) => {
    e.stopPropagation();
    prev();
    pauseAuto();
  });

  btnNext?.addEventListener('click', (e) => {
    e.stopPropagation();
    next();
    pauseAuto();
  });

  viewport.addEventListener('click', (e) => {
    if (moved || suppressViewportClick) return;
    const slide = e.target.closest('.hero-cube-slide') || slideAtPoint(e.clientX, e.clientY);
    if (slide) return;
    const rect = viewport.getBoundingClientRect();
    if (e.clientX - rect.left > rect.width / 2) next();
    else prev();
    pauseAuto();
  });

  viewport.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest('.hero-cube-nav')) return;
    pointerStartOnSlide = e.target.closest('.hero-cube-slide');
    pointerId = e.pointerId;
    dragging = true;
    moved = false;
    dragStartX = e.clientX;
    viewport.classList.add('is-dragging');
    track.classList.remove('is-snap-transition');
    if (!pointerStartOnSlide) {
      viewport.setPointerCapture(e.pointerId);
    }
    stopAuto();
  });

  viewport.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - dragStartX;
    if (Math.abs(dx) > 8) {
      moved = true;
      if (pointerId != null && !viewport.hasPointerCapture(pointerId)) {
        viewport.setPointerCapture(pointerId);
      }
    }
    dragOffsetPx = dx;
    updateTrackPosition(false);
  });

  viewport.addEventListener('pointerup', (e) => {
    if (!dragging) return;
    dragging = false;
    const dx = dragOffsetPx;
    const startedOnSlide = pointerStartOnSlide;
    dragOffsetPx = 0;
    pointerStartOnSlide = null;
    if (pointerId != null && viewport.hasPointerCapture(pointerId)) {
      viewport.releasePointerCapture(pointerId);
    }
    pointerId = null;
    viewport.classList.remove('is-dragging');
    if (Math.abs(dx) > 50) {
      if (dx < 0) next();
      else prev();
    } else if (!moved && startedOnSlide && e.pointerType !== 'touch') {
      suppressViewportClick = true;
      followSlideLink(startedOnSlide);
    } else {
      updateTrackPosition(true);
    }
    setTimeout(() => {
      moved = false;
      suppressViewportClick = false;
    }, 50);
    pauseAuto();
  });

  viewport.addEventListener('pointercancel', (e) => {
    dragging = false;
    dragOffsetPx = 0;
    pointerStartOnSlide = null;
    if (pointerId != null && viewport.hasPointerCapture(pointerId)) {
      viewport.releasePointerCapture(pointerId);
    }
    pointerId = null;
    viewport.classList.remove('is-dragging');
    updateTrackPosition(true);
    startAuto();
  });

  viewport.addEventListener('mouseenter', stopAuto);
  viewport.addEventListener('mouseleave', startAuto);

  let touchStartX = 0;
  viewport.addEventListener('touchstart', (e) => {
    if (e.target.closest('.hero-cube-nav')) return;
    touchStartX = e.changedTouches[0].clientX;
    stopAuto();
  }, { passive: true });

  viewport.addEventListener('touchend', (e) => {
    if (e.target.closest('.hero-cube-nav')) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) {
      if (dx < 0) next();
      else prev();
      pauseAuto();
    }
  }, { passive: true });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopAuto();
    else startAuto();
  });

  goTo(0, true);
  startAuto();

  if (legacyHost && typeof renderHeroPromoBrands === 'function') {
    legacyHost.innerHTML = renderHeroPromoBrands(products);
  }
}

window.initHeroBrandCube = initHeroBrandCube;
window.buildHeroCubeItems = buildHeroCubeItems;
