function initMarketSelector() {
  const container = document.getElementById('marketSelector');
  if (!container || !window.HB_MARKETS) return;

  const current = getMarketId();
  container.innerHTML = Object.values(HB_MARKETS).map((m) => `
    <button type="button" class="market-btn${m.id === current ? ' active' : ''}"
      data-market="${m.id}" aria-pressed="${m.id === current}">
      ${m.flag} ${m.label}
    </button>
  `).join('');

  container.querySelectorAll('[data-market]').forEach((btn) => {
    btn.addEventListener('click', () => setMarket(btn.dataset.market));
  });
}

function bindMarketImages() {
  const market = getMarket();

  document.querySelectorAll('[data-market-img]').forEach((img) => {
    const type = img.dataset.marketImg || 'product';
    const size = parseInt(img.dataset.marketSize || '1200', 10);
    const resolved = resolveMarketImage(market, type, size);
    const tryFallback = () => {
      if (resolved.fallback && img.src.indexOf(resolved.fallback) === -1) {
        img.src = resolved.fallback;
        img.onerror = () => {
          if (resolved.driveAlt && img.src !== resolved.driveAlt) img.src = resolved.driveAlt;
        };
      }
    };
    img.src = resolved.primary;
    img.onerror = tryFallback;
  });

  const heroBg = document.getElementById('heroBg');
  if (heroBg) {
    const hero = resolveMarketImage(market, 'hero', 2000);
    heroBg.style.backgroundImage = `url('${hero.primary}')`;
  }

  const heroImg = document.getElementById('heroProductImg');
  if (heroImg && !heroImg.dataset.marketImg) {
    const product = resolveMarketImage(market, 'product', 800);
    heroImg.src = product.primary;
    heroImg.onerror = () => {
      if (product.fallback) heroImg.src = product.fallback;
    };
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initMarketSelector();
  bindMarketImages();
});
