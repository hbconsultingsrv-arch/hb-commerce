/**
 * Enrichit l'affichage catalogue avec stock dépôt et rupture
 */
(function patchProductsStockDisplay() {
  if (typeof renderProductInfoStrip !== 'function' || typeof getStockStatus !== 'function') return;

  window.renderProductInfoStrip = function renderProductInfoStripWithStock(product) {
    const origin = product.origin || '—';
    const stock = getStockStatus(product);
    const showAcidity = typeof isOilProduct === 'function' && isOilProduct(product);
    const acidityDisplay = showAcidity
      ? (typeof formatAcidity === 'function' ? formatAcidity(product.acidity || '') : (product.acidity || '—'))
      : '';
    const stockClass = stock.tone === 'out-of-stock' ? 'out-of-stock' : (stock.low ? 'low-stock' : 'in-stock');

    return `
    <div class="product-info-strip">
      ${showAcidity ? `
      <div class="product-info-item">
        <span class="product-info-label">Acidité</span>
        <span class="product-info-value">${escapeHtml(acidityDisplay || '—')}</span>
      </div>` : ''}
      <div class="product-info-item">
        <span class="product-info-label">Pays</span>
        <span class="product-info-value">${escapeHtml(origin)}</span>
      </div>
      <div class="product-info-item product-info-item--${stockClass}">
        <span class="product-info-label">Stock</span>
        <span class="product-info-value">${escapeHtml(stock.detail)}</span>
      </div>
      <button type="button" class="product-info-tech btn-tech-sheet" aria-label="Fiche technique de ${escapeHtml(product.name)}">
        Fiche technique
      </button>
    </div>
    `;
  };

  if (typeof renderProductCard === 'function') {
    const legacyCard = renderProductCard;
    window.renderProductCard = function renderProductCardWithZeroStock(product) {
      const html = legacyCard(product);
      if (typeof renderZeroStockBanner !== 'function') return html;
      const banner = renderZeroStockBanner(product);
      if (!banner) return html;
      return html.replace(
        '<div class="product-card-body">',
        `${banner}<div class="product-card-body">`
      );
    };
  }
})();
