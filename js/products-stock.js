/**
 * Enrichit fetchProducts / affichage avec stock_quantity depuis products
 * Charger APRÈS products.js et stock.js
 */
(function patchProductsStock() {
  if (typeof applyStockInfo !== 'function') return;

  const legacyApplyStockInfo = applyStockInfo;

  window.applyStockInfo = async function applyStockInfoPatched(products) {
    const enriched = await legacyApplyStockInfo(products);
    return enriched.map((product) => {
      if (typeof product.stock_quantity === 'number') {
        const available = Math.max(0, product.stock_quantity);
        const min = getProductMinStockAlert(product);
        const lead = available > 0 ? 3 : 14;
        return {
          ...product,
          stock_available: available,
          estimated_delivery_days: lead,
          delivery_delay_label: available > 0
            ? `En stock (${available} u.) — livraison estimée ${lead} jours`
            : `Sur commande — réapprovisionnement en cours`
        };
      }
      return product;
    });
  };

  if (typeof getProductAvailability === 'function') {
    window.getProductAvailability = function getProductAvailabilityPatched(product) {
      if (typeof product.stock_quantity === 'number') {
        return getStockStatus(product);
      }
      return {
        label: product?.stock_available > 0 ? 'En stock' : 'Sur commande',
        detail: product?.delivery_delay_label || '',
        tone: product?.stock_available > 0 ? 'in-stock' : 'on-order'
      };
    };
  }

  if (typeof renderProductInfoStrip === 'function') {
    const legacyStrip = renderProductInfoStrip;
    window.renderProductInfoStrip = function renderProductInfoStripPatched(product) {
      const strip = legacyStrip(product);
      if (typeof renderStockBadge !== 'function') return strip;
      const badge = renderStockBadge(product);
      return strip.replace('</div>\n    <button', `${badge}</div>\n    <button`).replace(
        'class="product-info-strip"',
        'class="product-info-strip"'
      ).replace(
        /<\/div>\s*<button class="btn-tech-sheet"/,
        `${badge}\n    <button class="btn-tech-sheet"`
      );
    };
  }
})();

(function patchRenderProductInfoStripSimple() {
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
      <button type="button" class="btn-tech-sheet" data-action="tech-sheet">Fiche technique</button>
    </div>
    `;
  };
})();
