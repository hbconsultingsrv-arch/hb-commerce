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
  const imgs = resolveMarketImage(market, 'product', 2000);

  document.querySelectorAll('[data-market-img]').forEach((img) => {
    const type = img.dataset.marketImg || 'product';
    const size = parseInt(img.dataset.marketSize || '1200', 10);
    const resolved = resolveMarketImage(market, type, size);
    img.src = resolved.primary;
    img.addEventListener('error', () => {
      if (img.src !== resolved.fallback) img.src = resolved.fallback;
      else if (resolved.driveAlt && img.src !== resolved.driveAlt) img.src = resolved.driveAlt;
    }, { once: true });
  });

  const heroBg = document.getElementById('heroBg');
  if (heroBg) {
    const hero = resolveMarketImage(market, 'hero', 2000);
    heroBg.style.backgroundImage = `url('${hero.primary}')`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initMarketSelector();
  bindMarketImages();
});
