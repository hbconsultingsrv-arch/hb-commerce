/**
 * Enrichit les cartes produit existantes avec boutons de négociation
 */
(function enhanceProductCards() {
  function injectButtons(card) {
    if (card.querySelector('[data-open-negotiation]')) return;

    const id = card.dataset.productId;
    const nameEl = card.querySelector('h3');
    const priceEl = card.querySelector('.price');
    const refEl = card.querySelector('.sku-ref');
    const qtyInput = card.querySelector('.qty-input');

    const name = nameEl?.textContent?.trim() || 'Produit';
    const ref = refEl?.textContent?.replace('Réf.', '').trim() || id;
    const minQty = qtyInput?.min || qtyInput?.value || 1;

    let price = 0;
    if (priceEl?.dataset?.privatePrice) {
      price = parseFloat(priceEl.dataset.privatePrice);
    }

    const wrap = document.createElement('div');
    wrap.className = 'product-negotiation-actions';
    wrap.innerHTML = `
      <button type="button" class="btn-neg-premium" data-open-negotiation data-neg-mode="price"
        data-product-id="${id || ''}" data-product-slug="${escapeHtml(ref)}"
        data-product-name="${escapeHtml(name)}" data-product-price="${price}"
        data-product-unit="unité" data-product-min="${minQty}">
        Demander un meilleur prix
      </button>
      <button type="button" class="btn-neg-outline" data-open-negotiation data-neg-mode="quote"
        data-product-id="${id || ''}" data-product-slug="${escapeHtml(ref)}"
        data-product-name="${escapeHtml(name)}" data-product-price="${price}"
        data-product-unit="unité" data-product-min="${minQty}">
        Obtenir un devis
      </button>
    `;

    const actions = card.querySelector('.product-actions') || card.querySelector('.product-card-body');
    if (actions) actions.insertBefore(wrap, actions.firstChild);
  }

  function scan() {
    document.querySelectorAll('.product-card').forEach(injectButtons);
  }

  document.addEventListener('DOMContentLoaded', () => {
    scan();
    const obs = new MutationObserver(scan);
    const grid = document.getElementById('productsGrid') || document.getElementById('catalogGrid');
    if (grid) obs.observe(grid, { childList: true, subtree: true });
  });
})();
