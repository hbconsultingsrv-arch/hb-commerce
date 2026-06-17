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
  const list = data?.length ? data : getFallbackProducts();
  return list.filter((p) => p.slug !== 'fayafi-huile-olive');
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
  if (typeof buildFayafiCatalog === 'function') return buildFayafiCatalog();
  return [];
}

function getCategoryLabel(categoryId) {
  const cat = FAYAFI_CATEGORIES?.[categoryId];
  return cat?.label || categoryId || '—';
}

function getPackagingLabel(type) {
  if (type === 'bouteille') return 'Bouteille';
  if (type === 'metallique') return 'Métallique';
  return type || '';
}

function isFayafiProduct(product) {
  const slug = (product.slug || '').toLowerCase();
  const name = (product.name || '').toLowerCase();
  return slug.includes('fayafi') || name.includes('fayafi');
}

function resolveProductImage(product) {
  if (product.image_url && !product.image_url.includes('unsplash')) {
    return product.image_url;
  }
  if (isFayafiProduct(product) && typeof resolveMarketImage === 'function') {
    return resolveMarketImage(getMarket(), 'product', 1200).primary;
  }
  return product.image_url || 'assets/markets/france/product.svg';
}

function renderProductCard(product) {
  const minQty = product.min_quantity || 1;
  const imgUrl = resolveProductImage(product);
  const fayafi = isFayafiProduct(product);
  const cardClass = fayafi ? 'product-card fayafi-card' : 'product-card';
  const formatLabel = product.format_label || '';
  const acidity = product.acidity || '';
  const packaging = getPackagingLabel(product.packaging_type);

  return `
    <article class="${cardClass}" data-product-id="${product.id}" data-category="${product.category || ''}">
      <div class="product-img-area">
        <span class="origin-badge">TUNISIE</span>
        ${packaging ? `<span class="packaging-badge">${packaging}</span>` : ''}
        <img src="${imgUrl}" alt="${product.name}" loading="lazy">
      </div>
      <div class="product-card-body">
        ${product.tag ? `<span class="tag">${product.tag}</span>` : ''}
        ${formatLabel ? `<span class="format-label">${formatLabel}</span>` : ''}
        <h3>${product.name}</h3>
        <p class="origin">Origine : ${product.origin || '—'}</p>
        ${acidity ? `<p class="acidity-line">Acidité : <strong>${acidity}</strong></p>` : ''}
        <p class="product-desc">${product.description || ''}</p>
        <div class="price-row">
          <span class="price">${formatPrice(product.price)}</span>
          <span class="unit">/ ${product.unit}</span>
        </div>
        <p class="form-note min-qty">Minimum : ${minQty} ${product.unit}(s)</p>
        <div class="product-actions">
          <div class="qty-control">
            <button type="button" class="qty-minus" aria-label="Moins">−</button>
            <input type="number" class="qty-input" value="${minQty}" min="${minQty}" step="1">
            <button type="button" class="qty-plus" aria-label="Plus">+</button>
          </div>
          <button type="button" class="btn btn-primary btn-add-cart btn-fayafi">Ajouter au panier</button>
        </div>
      </div>
    </article>
  `;
}

function renderCategoryNav(activeId = 'all') {
  const cats = Object.values(FAYAFI_CATEGORIES || {});
  return `
    <nav class="category-nav" aria-label="Categories produits">
      <button type="button" class="category-tab${activeId === 'all' ? ' active' : ''}" data-category="all">Tous les formats</button>
      ${cats.map((c) => `
        <button type="button" class="category-tab${activeId === c.id ? ' active' : ''}" data-category="${c.id}">
          ${c.icon} ${c.label}
        </button>
      `).join('')}
    </nav>
  `;
}

function renderCategoryShowcase() {
  const cats = Object.values(FAYAFI_CATEGORIES || {});
  return cats.map((c) => `
    <a href="produits.html#cat-${c.id}" class="category-card" id="cat-${c.id}">
      <img src="${c.image}" alt="${c.label}" width="120" height="120">
      <h3>${c.label}</h3>
      <p>${c.description}</p>
    </a>
  `).join('');
}

function renderQualitySection() {
  const q = FAYAFI_QUALITY || {};
  if (!q.specs) return '';
  return `
    <section class="quality-section" id="qualite">
      <h2>${q.title || 'Qualité'}</h2>
      <p class="section-sub">${q.intro || ''}</p>
      <dl class="quality-specs">
        ${q.specs.map((s) => `<dt>${s.label}</dt><dd>${s.value}</dd>`).join('')}
      </dl>
    </section>
  `;
}

function filterProductsByCategory(products, categoryId) {
  if (!categoryId || categoryId === 'all') return products;
  return products.filter((p) => p.category === categoryId);
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

function bindCategoryNav(container, products, gridEl, onAdded) {
  if (!container || !gridEl) return;
  let current = 'all';

  const render = (categoryId) => {
    current = categoryId;
    const filtered = filterProductsByCategory(products, categoryId);
    gridEl.innerHTML = filtered.length
      ? filtered.map(renderProductCard).join('')
      : '<p class="empty-state">Aucun produit dans cette catégorie.</p>';
    bindProductCardEvents(gridEl, onAdded);
    container.querySelectorAll('.category-tab').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.category === categoryId);
    });
  };

  container.innerHTML = renderCategoryNav(current);
  container.querySelectorAll('.category-tab').forEach((btn) => {
    btn.addEventListener('click', () => render(btn.dataset.category));
  });

  render(current);
}
