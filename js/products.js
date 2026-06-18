async function fetchProducts(activeOnly = true) {
  const catalog = getFallbackProducts();
  const sb = getSupabase();
  if (!sb) return catalog;

  let query = sb.from('products').select('*').order('sort_order', { ascending: true });
  if (activeOnly) query = query.eq('active', true);
  const { data, error } = await query;
  if (error) {
    console.warn('fetchProducts:', error.message);
    return catalog;
  }

  const dbList = (data || [])
    .map((p) => (typeof normalizeFiafiProduct === 'function' ? normalizeFiafiProduct(p) : p))
    .filter((p) => p.slug !== 'fiafi-huile-olive');
  const merged = typeof mergeProductsWithCatalog === 'function'
    ? mergeProductsWithCatalog(dbList.length ? dbList : catalog)
    : (dbList.length ? dbList : catalog);

  if (activeOnly) return merged.filter((p) => p.active);
  return merged;
}

async function fetchProductBySlug(slug) {
  const normalizedSlug = typeof normalizeFiafiProduct === 'function'
    ? normalizeFiafiProduct({ slug }).slug
    : slug;
  const sb = getSupabase();
  if (!sb) {
    return getFallbackProducts().find((p) => p.slug === normalizedSlug);
  }
  const { data, error } = await sb.from('products').select('*').eq('slug', normalizedSlug).maybeSingle();
  if (error) throw error;
  return typeof normalizeFiafiProduct === 'function' ? normalizeFiafiProduct(data) : data;
}

function getFallbackProducts() {
  if (typeof buildFiafiCatalog === 'function') return buildFiafiCatalog();
  return [];
}

function getCategoryLabel(categoryId) {
  const cat = FIAFI_CATEGORIES?.[categoryId];
  return cat?.label || categoryId || '—';
}

function getPackagingLabel(type) {
  if (type === 'bouteille') return 'Bouteille';
  if (type === 'metallique') return 'Métallique';
  return type || '';
}

function isFiafiProduct(product) {
  const slug = (product.slug || '').toLowerCase();
  const name = (product.name || '').toLowerCase();
  return slug.includes('fiafi') || name.includes('fiafi');
}

function isStaleFiafiImage(url) {
  if (!url) return true;
  return url.includes('drive.google.com')
    || url.includes('assets/products/')
    || url.includes('assets/markets/')
    || url.endsWith('.svg');
}

function resolveProductImage(product) {
  if (isFiafiProduct(product) && typeof getFiafiProductImage === 'function') {
    return getFiafiProductImage(product);
  }
  if (product.image_url && !isStaleFiafiImage(product.image_url)) {
    return product.image_url;
  }
  if (typeof getFiafiProductImage === 'function') {
    return getFiafiProductImage(product);
  }
  return FIAFI_IMAGES?.product || 'images/prenium.PNG';
}

function renderProductCard(product) {
  const minQty = product.min_quantity || 1;
  const imgUrl = resolveProductImage(product);
  const imgFallback = FIAFI_IMAGES?.product || 'images/prenium.PNG';
  const fiafi = isFiafiProduct(product);
  const cardClass = fiafi ? 'product-card fiafi-card' : 'product-card';
  const formatLabel = product.format_label || '';
  const acidity = product.acidity || '';
  const acidityDisplay = typeof formatAcidity === 'function' ? formatAcidity(acidity) : acidity;
  const packaging = getPackagingLabel(product.packaging_type);
  const priceDisplay = typeof formatDisplayPrice === 'function' ? formatDisplayPrice(product.price) : formatPrice(product.price);
  const unitDisplay = typeof canViewPrices === 'function' && !canViewPrices() ? '' : `/ ${product.unit}`;

  return `
    <article class="${cardClass}" data-product-id="${product.id}" data-category="${product.category || ''}">
      <div class="product-img-area">
        <span class="origin-badge">TUNISIE</span>
        ${packaging ? `<span class="packaging-badge">${packaging}</span>` : ''}
        <img src="${imgUrl}" alt="${product.name}" loading="lazy" onerror="this.onerror=null;this.src='${imgFallback}'">
      </div>
      <div class="product-card-body">
        ${product.tag ? `<span class="tag">${product.tag}</span>` : ''}
        ${formatLabel ? `<span class="format-label">${formatLabel}</span>` : ''}
        <h3>${product.name}</h3>
        <p class="origin">Origine : ${product.origin || '—'}</p>
        ${acidity ? `<p class="acidity-line">Acidit&eacute; : <strong>${acidityDisplay}</strong></p>` : ''}
        <p class="product-desc">${product.description || ''}</p>
        <div class="price-row">
          <span class="price">${priceDisplay}</span>
          ${unitDisplay ? `<span class="unit">${unitDisplay}</span>` : ''}
        </div>
        <p class="form-note min-qty">Minimum : ${minQty} ${product.unit}(s)</p>
        <div class="product-actions">
          <div class="qty-control">
            <button type="button" class="qty-minus" aria-label="Moins">−</button>
            <input type="number" class="qty-input" value="${minQty}" min="${minQty}" step="1">
            <button type="button" class="qty-plus" aria-label="Plus">+</button>
          </div>
          <button type="button" class="btn btn-primary btn-add-cart btn-fiafi">Ajouter au panier</button>
        </div>
      </div>
    </article>
  `;
}

function renderCategoryNav(activeId = 'all') {
  const cats = Object.values(FIAFI_CATEGORIES || {});
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
  const cats = Object.values(FIAFI_CATEGORIES || {});
  const fallback = FIAFI_IMAGES?.product || 'images/prenium.PNG';
  return cats.map((c) => `
    <a href="produits.html#cat-${c.id}" class="category-card" id="cat-${c.id}">
      <img src="${c.image}" alt="${c.label}" width="200" height="140" onerror="this.onerror=null;this.src='${fallback}'">
      <h3>${c.label}</h3>
      <p>${c.description}</p>
    </a>
  `).join('');
}

function renderQualitySection() {
  const q = FIAFI_QUALITY || {};
  if (!q.specs) return '';
  const qualityImg = q.image || FIAFI_IMAGES?.acidity || 'images/acidity.PNG';
  const techImg = FIAFI_IMAGES?.technology || 'images/technology.PNG';
  return `
    <section class="quality-section" id="qualite">
      <div class="quality-grid">
        <div>
          <h2>Qualit&eacute; &amp; acidit&eacute;</h2>
          <p class="section-sub">${q.intro || ''}</p>
          <dl class="quality-specs">
            ${q.specs.map((s) => `<dt>${s.label}</dt><dd>${s.value}</dd>`).join('')}
          </dl>
        </div>
        <div class="quality-visuals">
          <img src="${qualityImg}" alt="Qualite FIAFI - acidite" class="quality-photo">
          <img src="${techImg}" alt="Technologie FIAFI - fraicheur" class="quality-photo">
        </div>
      </div>
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
