async function fetchProducts(activeOnly = true) {
  const sb = getSupabase();
  if (!sb) return getFallbackProducts();
  let query = sb.from('products').select('*').order('sort_order', { ascending: true });
  if (activeOnly) query = query.eq('active', true);
  const { data, error } = await query;
  if (error) {
    console.warn('fetchProducts:', error.message);
    return getFallbackProducts();
  }
  return data?.length ? data : getFallbackProducts();
}

async function fetchProductBySlug(slug) {
  const sb = getSupabase();
  if (!sb) {
    return getFallbackProducts().find((p) => p.slug === slug);
  }
  const { data, error } = await sb.from('products').select('*').eq('slug', slug).maybeSingle();
  if (error) throw error;
  return data;
}

function getFallbackProducts() {
  return [
    {
      id: 'fayafi-olive-oil',
      name: 'FAYAFI — Huile d\'olive extra vierge',
      slug: 'fayafi-huile-olive',
      description: 'Huile d\'olive extra vierge de première pression à froid, origine Tunisie. Idéale pour la restauration et le commerce en gros.',
      origin: 'Tunisie',
      category: 'huiles',
      price: 4.50,
      unit: 'litre',
      min_quantity: 12,
      image_url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800&q=85&auto=format&fit=crop',
      tag: 'Produit phare',
      active: true,
      sort_order: 1
    }
  ];
}

function renderProductCard(product) {
  const minQty = product.min_quantity || 1;
  return `
    <article class="product-card" data-product-id="${product.id}">
      <img src="${product.image_url}" alt="${product.name}" loading="lazy">
      <div class="product-card-body">
        ${product.tag ? `<span class="tag">${product.tag}</span>` : ''}
        <h3>${product.name}</h3>
        <p class="origin">Origine : ${product.origin || '—'}</p>
        <p>${product.description || ''}</p>
        <div class="price-row">
          <span class="price">${formatPrice(product.price)}</span>
          <span class="unit">/ ${product.unit}</span>
        </div>
        <p class="form-note" style="margin-bottom:0.75rem">Minimum : ${minQty} ${product.unit}(s)</p>
        <div class="product-actions">
          <div class="qty-control">
            <button type="button" class="qty-minus" aria-label="Moins">−</button>
            <input type="number" class="qty-input" value="${minQty}" min="${minQty}" step="1">
            <button type="button" class="qty-plus" aria-label="Plus">+</button>
          </div>
          <button type="button" class="btn btn-primary btn-add-cart">Ajouter au panier</button>
        </div>
      </div>
    </article>
  `;
}

function bindProductCardEvents(container, onAdded) {
  container.querySelectorAll('.product-card').forEach((card) => {
    const input = card.querySelector('.qty-input');
    const min = parseInt(input.min, 10) || 1;

    card.querySelector('.qty-minus')?.addEventListener('click', () => {
      const v = parseInt(input.value, 10) || min;
      input.value = Math.max(min, v - 1);
    });
    card.querySelector('.qty-plus')?.addEventListener('click', () => {
      const v = parseInt(input.value, 10) || min;
      input.value = v + 1;
    });

    card.querySelector('.btn-add-cart')?.addEventListener('click', async () => {
      const id = card.dataset.productId;
      const products = await fetchProducts();
      const product = products.find((p) => p.id === id);
      if (!product) return;
      const qty = parseInt(input.value, 10) || min;
      addToCart(product, qty);
      if (onAdded) onAdded(product, qty);
      else alert(`${product.name} ajouté au panier (${qty} ${product.unit}(s))`);
    });
  });
}
