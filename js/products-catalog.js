/**
 * Catalogue produits avec boutons de négociation
 */
function renderNegotiationProductCard(product) {
  const minQty = product.min_quantity || 1;
  const priceDisplay = typeof formatDisplayPrice === 'function' ? formatDisplayPrice(product.price) : formatPrice(product.price);
  const ref = product.slug || product.id;
  const img = product.image_url || 'assets/logo-icon.svg';

  return `
    <article class="product-card product-card--premium" data-product-id="${product.id}">
      <div class="product-img-area">
        <img src="${escapeHtml(img)}" alt="${escapeHtml(product.name)}" loading="lazy" onerror="this.src='assets/logo-icon.svg'">
      </div>
      <div class="product-card-body">
        <span class="sku-ref">Réf. ${escapeHtml(String(ref))}</span>
        <h3>${escapeHtml(product.name)}</h3>
        <p class="product-desc">${escapeHtml(product.description || '')}</p>
        <div class="price-row">
          <span class="price">${priceDisplay}</span>
          <span class="unit">/ ${escapeHtml(product.unit || 'unité')}</span>
        </div>
        <p class="form-note min-qty">Minimum : ${minQty} ${escapeHtml(product.unit || 'unité')}(s)</p>
        <div class="product-negotiation-actions">
          <button type="button" class="btn-neg-premium" data-open-negotiation data-neg-mode="price"
            data-product-id="${product.id}" data-product-slug="${escapeHtml(ref)}"
            data-product-name="${escapeHtml(product.name)}" data-product-price="${product.price}"
            data-product-unit="${escapeHtml(product.unit || 'unité')}" data-product-min="${minQty}"
            data-product-image="${escapeHtml(img)}">
            Demander un meilleur prix
          </button>
          <button type="button" class="btn-neg-outline" data-open-negotiation data-neg-mode="quote"
            data-product-id="${product.id}" data-product-slug="${escapeHtml(ref)}"
            data-product-name="${escapeHtml(product.name)}" data-product-price="${product.price}"
            data-product-unit="${escapeHtml(product.unit || 'unité')}" data-product-min="${minQty}">
            Obtenir un devis
          </button>
          <button type="button" class="btn-neg-outline" data-open-negotiation data-neg-mode="offer"
            data-product-id="${product.id}" data-product-slug="${escapeHtml(ref)}"
            data-product-name="${escapeHtml(product.name)}" data-product-price="${product.price}"
            data-product-unit="${escapeHtml(product.unit || 'unité')}" data-product-min="${minQty}">
            Faire une offre
          </button>
        </div>
        <div class="product-actions" style="margin-top:0.75rem">
          <button type="button" class="btn btn-primary btn-sm btn-add-cart-neg" data-id="${product.id}"
            data-name="${escapeHtml(product.name)}" data-price="${product.price}"
            data-unit="${escapeHtml(product.unit || '')}" data-slug="${escapeHtml(ref)}">
            Ajouter au panier
          </button>
        </div>
      </div>
    </article>
  `;
}

async function initNegotiationCatalog() {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  await refreshPriceVisibility();
  let products = [];
  if (typeof fetchProducts === 'function') {
    products = await fetchProducts(true);
  } else if (typeof fetchAllProducts === 'function') {
    products = (await fetchAllProducts()).filter((p) => p.active !== false);
  }

  if (!products.length) {
    grid.innerHTML = '<p class="empty-state">Catalogue en cours de chargement ou aucun produit actif.</p>';
    return;
  }

  grid.innerHTML = products.map(renderNegotiationProductCard).join('');

  grid.querySelectorAll('.btn-add-cart-neg').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (typeof addToCart === 'function') {
        addToCart({
          id: btn.dataset.id,
          name: btn.dataset.name,
          slug: btn.dataset.slug,
          price: parseFloat(btn.dataset.price),
          unit: btn.dataset.unit,
          quantity: 1
        });
        alert('Produit ajouté au panier');
      } else {
        window.location.href = 'panier.html';
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', initNegotiationCatalog);
