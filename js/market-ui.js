/**
 * Sélecteur marché — dropdown pays
 */
function refreshLangSelectorUi() {
  const container = document.getElementById('langSelector');
  if (!container || !window.HB_LANGS) return;
  const current = getLang();
  const currentMeta = HB_LANGS[current] || HB_LANGS.fr;
  const label = container.querySelector('.lang-dropdown-trigger span:first-child');
  if (label) label.textContent = currentMeta.label || current.toUpperCase();
  container.querySelectorAll('[data-lang]').forEach((btn) => {
    const active = btn.dataset.lang === current;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
  });
}

function initLangSelector() {
  const container = document.getElementById('langSelector');
  if (!container || !window.HB_LANGS || typeof getLang !== 'function') return;
  if (container.dataset.bound === '1') {
    refreshLangSelectorUi();
    return;
  }
  container.dataset.bound = '1';

  const current = getLang();
  const currentMeta = HB_LANGS[current] || HB_LANGS.fr;

  container.className = 'lang-switcher lang-dropdown';
  container.innerHTML = `
    <button type="button" class="lang-dropdown-trigger" aria-haspopup="listbox" aria-expanded="false">
      <span>${currentMeta.label || current.toUpperCase()}</span>
      <span aria-hidden="true">▾</span>
    </button>
    <ul class="lang-dropdown-menu" role="listbox">
      ${Object.entries(HB_LANGS).filter(([code]) => code !== 'lu').map(([code, meta]) => `
        <li>
          <button type="button" role="option" data-lang="${code}" aria-selected="${code === current}"
            class="${code === current ? 'active' : ''}">
            <span>${meta.label || code.toUpperCase()}</span>
            <span>${meta.native}</span>
          </button>
        </li>
      `).join('')}
    </ul>
  `;

  const trigger = container.querySelector('.lang-dropdown-trigger');
  trigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = container.classList.toggle('is-open');
    trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  container.querySelectorAll('[data-lang]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setLang(btn.dataset.lang);
      container.classList.remove('is-open');
      trigger?.setAttribute('aria-expanded', 'false');
    });
  });

  if (!window.__hbLangSelectorDocBound) {
    window.__hbLangSelectorDocBound = true;
    document.addEventListener('click', () => {
      document.querySelectorAll('.lang-switcher.is-open').forEach((el) => {
        el.classList.remove('is-open');
        el.querySelector('.lang-dropdown-trigger')?.setAttribute('aria-expanded', 'false');
      });
    });
  }
}

function initMarketSelector() {
  const container = document.getElementById('marketSelector');
  if (!container || !window.HB_MARKETS) return;

  const current = getMarketId();
  const market = getMarket();

  container.className = 'market-dropdown';
  container.innerHTML = `
    <button type="button" class="market-dropdown-trigger" aria-haspopup="listbox" aria-expanded="false">
      <span class="market-flag">${market.flag === 'FR' ? '🇫🇷' : '🇱🇺'}</span>
      <span>${market.label}</span>
      <span aria-hidden="true">▾</span>
    </button>
    <ul class="market-dropdown-menu" role="listbox">
      ${Object.values(HB_MARKETS).map((m) => `
        <li>
          <button type="button" role="option" data-market="${m.id}" aria-selected="${m.id === current}"
            class="${m.id === current ? 'active' : ''}">
            <span>${m.id === 'fr' ? '🇫🇷' : '🇱🇺'}</span>
            <span>${m.label}</span>
          </button>
        </li>
      `).join('')}
    </ul>
  `;

  const trigger = container.querySelector('.market-dropdown-trigger');
  trigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = container.classList.toggle('is-open');
    trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  container.querySelectorAll('[data-market]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setMarket(btn.dataset.market);
    });
  });

  document.addEventListener('click', () => {
    container.classList.remove('is-open');
    trigger?.setAttribute('aria-expanded', 'false');
  });
}

function bindMarketImages() {
  const market = getMarket();

  document.querySelectorAll('[data-market-img]').forEach((img) => {
    const type = img.dataset.marketImg || 'product';
    const resolved = resolveMarketImage(market, type, 1200);
    img.src = resolved.primary;
    img.onerror = () => {
      if (resolved.fallback && img.src !== resolved.fallback) img.src = resolved.fallback;
    };
  });

  const heroBg = document.getElementById('heroBg');
  if (heroBg) {
    const hero = resolveMarketImage(market, 'hero', 2000);
    heroBg.style.backgroundImage = `url('${hero.primary}')`;
  }

  const depthBg = document.getElementById('hbDepthBg');
  if (depthBg) {
    const hero = resolveMarketImage(market, 'hero', 2000);
    depthBg.style.backgroundImage = `url('${hero.primary}')`;
  }

  const authVisual = document.querySelector('.auth-split-visual');
  if (authVisual) {
    const img = resolveMarketImage(market, 'welcome', 1600);
    authVisual.style.setProperty('--auth-bg', `url('${img.primary}')`);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initLangSelector();
  initMarketSelector();
  bindMarketImages();
});

window.initLangSelector = initLangSelector;
window.refreshLangSelectorUi = refreshLangSelectorUi;
