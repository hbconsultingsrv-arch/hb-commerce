/**
 * Sélecteur marché — dropdown pays
 */
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
  initMarketSelector();
  bindMarketImages();
});
