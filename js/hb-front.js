/**
 * HB Commerce — interactions front premium
 */

const SVG_CART = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6h15l-1.5 9h-12z"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/><path d="M6 6L5 3H2"/></svg>';
const SVG_USER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';

function initNavMoreDropdown() {
  const wraps = document.querySelectorAll('.nav-more-wrap');
  if (!wraps.length) return;

  const closeAll = () => {
    wraps.forEach((wrap) => {
      wrap.classList.remove('is-open');
      wrap.querySelector('.nav-more-trigger')?.setAttribute('aria-expanded', 'false');
    });
  };

  wraps.forEach((wrap) => {
    const trigger = wrap.querySelector('.nav-more-trigger');
    const menu = wrap.querySelector('.nav-more-menu');
    if (!trigger || !menu) return;

    trigger.addEventListener('click', (event) => {
      event.stopPropagation();
      const open = !wrap.classList.contains('is-open');
      closeAll();
      if (open) {
        wrap.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
      }
    });

    menu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        closeAll();
        document.querySelector('.nav-links')?.classList.remove('is-open');
        document.querySelector('.nav-toggle')?.setAttribute('aria-expanded', 'false');
      });
    });
  });

  document.addEventListener('click', closeAll);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeAll();
  });
}

function initSiteNav() {
  const nav = document.querySelector('.site-nav, .hero-commerce .nav');
  if (!nav) return;
  nav.classList.add('site-nav');

  const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 24);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const toggle = nav.querySelector('.nav-toggle');
  const links = nav.querySelector('.nav-links');
  toggle?.addEventListener('click', () => {
    const open = links?.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
}

function initHeroParallax() {
  const hero = document.querySelector('.hero-commerce');
  const bg = document.getElementById('heroBg');
  const canvas = document.getElementById('heroOilCanvas');
  const showcase = document.getElementById('heroShowcase3d');
  if (!hero || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const onMove = (e) => {
    if (!showcase) return;
    const rect = showcase.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / rect.width;
    const dy = (e.clientY - cy) / rect.height;
    const tilt = showcase.querySelector('.hero-showcase-tilt');
    if (tilt) {
      tilt.style.transform = `rotateY(${-8 + dx * 12}deg) rotateX(${4 - dy * 8}deg)`;
    }
  };

  hero.addEventListener('mousemove', onMove);

  window.addEventListener('scroll', () => {
    const offset = Math.min(window.scrollY * 0.15, 60);
    if (bg) bg.style.transform = `translateY(${offset * 0.4}px) scale(1.08)`;
    if (canvas) canvas.style.transform = `translateY(${offset * 0.25}px)`;
  }, { passive: true });
}

function updateHeroStats(products) {
  const brandCount = typeof groupProductsByBrand === 'function'
    ? groupProductsByBrand(products).length
    : 0;
  const productCount = products.length;

  const map = {
    heroStatBrands: brandCount || '—',
    heroStatProducts: productCount || '—',
    heroStatDelivery: 'FR+LU',
    heroStatSupport: '24/7'
  };
  Object.entries(map).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  });

  const counters = {
    counterBrands: brandCount,
    counterProducts: productCount,
    counterOrders: Math.max(productCount * 12, 48),
    counterClients: Math.max(brandCount * 8, 24)
  };
  document.querySelectorAll('[data-counter]').forEach((el) => {
    const key = el.dataset.counter;
    if (counters[key] != null) el.dataset.counterTarget = counters[key];
  });
}

function animateCounters() {
  document.querySelectorAll('[data-counter-target]').forEach((el) => {
    if (el.dataset.animated === '1') return;
    const target = parseInt(el.dataset.counterTarget, 10);
    if (!Number.isFinite(target) || target <= 0) return;
    el.dataset.animated = '1';
    const duration = 1400;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - p) ** 3;
      el.textContent = Math.round(target * eased);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

function initStatsObserver() {
  const section = document.getElementById('chiffres');
  if (!section || !('IntersectionObserver' in window)) return;
  const obs = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      animateCounters();
      obs.disconnect();
    }
  }, { threshold: 0.25 });
  obs.observe(section);
}

function initCatalogFilters() {
  const host = document.getElementById('homeBrandCatalog');
  const brandSel = document.getElementById('catalogFilterBrand');
  const formatSel = document.getElementById('catalogFilterFormat');
  const stockSel = document.getElementById('catalogFilterStock');
  const originSel = document.getElementById('catalogFilterOrigin');
  const search = document.getElementById('catalogFilterSearch');
  if (!host) return;

  function applyFilters() {
    const brand = brandSel?.value || '';
    const format = formatSel?.value || '';
    const stock = stockSel?.value || '';
    const origin = originSel?.value || '';
    const q = (search?.value || '').trim().toLowerCase();

    host.querySelectorAll('.product-card').forEach((card) => {
      const cardBrand = card.dataset.brand || '';
      const cardFormat = card.dataset.format || '';
      const cardOrigin = card.dataset.origin || '';
      const cardStock = card.dataset.stock || '';
      const text = card.textContent.toLowerCase();
      let show = true;
      if (brand && cardBrand !== brand) show = false;
      if (format && cardFormat !== format) show = false;
      if (origin && cardOrigin !== origin) show = false;
      if (stock && cardStock !== stock) show = false;
      if (q && !text.includes(q)) show = false;
      card.style.display = show ? '' : 'none';
    });

    host.querySelectorAll('.brand-block').forEach((block) => {
      const visible = block.querySelectorAll('.product-card:not([style*="display: none"])').length
        || block.querySelectorAll('.product-card').length && [...block.querySelectorAll('.product-card')].some((c) => c.style.display !== 'none');
      const cards = [...block.querySelectorAll('.product-card')];
      const anyVisible = cards.some((c) => c.style.display !== 'none');
      block.style.display = anyVisible ? '' : 'none';
    });
  }

  [brandSel, formatSel, stockSel, originSel, search].forEach((el) => {
    el?.addEventListener('input', applyFilters);
    el?.addEventListener('change', applyFilters);
  });

  window.populateCatalogFilters = (products) => {
    if (!products?.length) return;
    const brands = [...new Set(products.map((p) => getProductBrand(p)))].sort();
    const origins = [...new Set(products.map((p) => p.origin).filter(Boolean))].sort();
    const formats = [...new Set(products.map((p) => p.format_label || p.unit).filter(Boolean))].sort();

    if (brandSel && brandSel.options.length <= 1) {
      brandSel.innerHTML = '<option value="">' + (t('filter.brand') || 'Marque') + '</option>'
        + brands.map((b) => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join('');
    }
    if (originSel && originSel.options.length <= 1) {
      originSel.innerHTML = '<option value="">' + (t('filter.origin') || 'Origine') + '</option>'
        + origins.map((o) => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join('');
    }
    if (formatSel && formatSel.options.length <= 1) {
      formatSel.innerHTML = '<option value="">' + (t('filter.format') || 'Format') + '</option>'
        + formats.map((f) => `<option value="${escapeHtml(f)}">${escapeHtml(f)}</option>`).join('');
    }
  };
}

function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const note = document.getElementById('contactFormNote');
    const fd = new FormData(form);
    const email = getMarket()?.contact?.email || 'hb.consulting.srv@gmail.com';
    const subject = encodeURIComponent(`[HB Commerce] ${fd.get('subject') || 'Demande pro'}`);
    const body = encodeURIComponent(
      `Société: ${fd.get('company')}\nNom: ${fd.get('name')}\nTél: ${fd.get('phone')}\n\n${fd.get('message')}`
    );
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    if (note) showAlert(note, t('contact.sent') || 'Ouverture de votre client mail…', 'success');
  });
}

function initPasswordToggles() {
  document.querySelectorAll('[data-toggle-password]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = btn.parentElement?.querySelector('input');
      if (!input) return;
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.textContent = show ? '🙈' : '👁';
      btn.setAttribute('aria-label', show ? 'Masquer' : 'Afficher');
    });
  });
}

function initRegisterValidation() {
  const form = document.getElementById('registerForm');
  if (!form) return;

  const validate = (input) => {
    const label = input.closest('label');
    if (!label) return;
    let valid = input.checkValidity();
    if (input.name === 'passwordConfirm') {
      valid = input.value === form.elements.password.value && input.value.length >= 6;
    }
    label.classList.toggle('auth-field-valid', valid && input.value.length > 0);
    label.classList.toggle('auth-field-invalid', !valid && input.value.length > 0);
  };

  form.querySelectorAll('input').forEach((input) => {
    input.addEventListener('input', () => validate(input));
    input.addEventListener('blur', () => validate(input));
  });
}

function enhanceNavIcons() {
  const cartLink = document.querySelector('.nav-cart-link');
  if (cartLink && !cartLink.querySelector('svg')) {
    cartLink.insertAdjacentHTML('afterbegin', SVG_CART);
  }
  document.querySelectorAll('.nav-account-link').forEach((accountLink) => {
    if (accountLink.style.display === 'none' || accountLink.hidden) return;
    if (accountLink.classList.contains('nav-account-link--with-avatar')) return;
    if (!accountLink.querySelector('svg')) {
      accountLink.insertAdjacentHTML('afterbegin', SVG_USER);
    }
  });
}

window.enhanceNavIcons = enhanceNavIcons;

document.addEventListener('DOMContentLoaded', () => {
  initSiteNav();
  initNavMoreDropdown();
  initHeroParallax();
  initCatalogFilters();
  initContactForm();
  initPasswordToggles();
  initRegisterValidation();
  enhanceNavIcons();
  initStatsObserver();
});

window.updateHeroStats = updateHeroStats;
window.animateCounters = animateCounters;
