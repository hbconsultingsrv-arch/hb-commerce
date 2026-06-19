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

  const products = activeOnly ? merged.filter((p) => p.active) : merged;
  const priced = await applyCustomerPrices(products);
  return applyStockInfo(priced);
}

async function applyStockInfo(products) {
  const sb = getSupabase();
  if (!sb || !products.length) return products;
  const slugs = [...new Set(products.map((product) => product.slug).filter(Boolean))];
  const { data, error } = await sb
    .from('product_stocks')
    .select('product_slug, quantity, reserved_quantity, lead_time_days')
    .in('product_slug', slugs);
  if (error) {
    console.warn('product_stocks:', error.message);
    return products;
  }

  const bySlug = new Map();
  (data || []).forEach((row) => {
    const current = bySlug.get(row.product_slug) || { available: 0, lead: 30 };
    const available = Math.max(0, Number(row.quantity || 0) - Number(row.reserved_quantity || 0));
    bySlug.set(row.product_slug, {
      available: current.available + available,
      lead: Math.min(current.lead, Number(row.lead_time_days || 30))
    });
  });

  return products.map((product) => {
    const stock = bySlug.get(product.slug);
    const available = stock?.available || 0;
    const lead = available > 0 ? 3 : (stock?.lead || 14);
    return {
      ...product,
      stock_available: available,
      estimated_delivery_days: lead,
      delivery_delay_label: available > 0
        ? `En stock - livraison estimee ${lead} jours`
        : `Sur commande - delai estime ${lead} jours`
    };
  });
}

async function applyCustomerPrices(products) {
  if (typeof getSession !== 'function') return products;
  const session = await getSession();
  if (!session) return products;

  const sb = getSupabase();
  if (!sb) return products;

  const { data, error } = await sb
    .from('customer_prices')
    .select('product_slug, price')
    .eq('profile_id', session.user.id);
  if (error) {
    console.warn('customer_prices:', error.message);
    return products;
  }

  const prices = new Map((data || []).map((row) => [row.product_slug, Number(row.price)]));
  return products.map((product) => {
    if (!prices.has(product.slug)) return product;
    return {
      ...product,
      price: prices.get(product.slug),
      customer_price: true
    };
  });
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
  const product = typeof normalizeFiafiProduct === 'function' ? normalizeFiafiProduct(data) : data;
  const priced = await applyCustomerPrices(product ? [product] : []);
  return priced[0] || null;
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
  const priceDisplay = typeof formatDisplayPrice === 'function' ? formatDisplayPrice(product.price) : 'xx';
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
        ${product.customer_price ? '<p class="form-note min-qty">Prix personnalis&eacute; soci&eacute;t&eacute;</p>' : ''}
        ${product.delivery_delay_label ? `<p class="form-note min-qty">${escapeHtml(product.delivery_delay_label)}</p>` : ''}
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

const HB_BRAND_META = {
  FIAFI: {
    slug: 'fiafi',
    tagline: 'Huile d\'olive extra vierge — origine Tunisie',
    origin: 'Tunisie',
    accent: 'fiafi'
  },
  TOUNSI: {
    slug: 'tounsi',
    tagline: 'Huile d\'olive — gamme TOUNSI',
    origin: 'Tunisie',
    accent: 'tounsi'
  }
};

function getProductBrand(product) {
  const name = product?.name || '';
  const slug = (product?.slug || '').toLowerCase();
  if (/fiafi/i.test(name) || slug.includes('fiafi')) return 'FIAFI';
  if (/tounsi/i.test(name) || slug.includes('tounsi')) return 'TOUNSI';
  const prefix = name.split(/[—\-–|]/)[0]?.trim();
  if (prefix && prefix.length <= 28) return prefix.toUpperCase();
  return 'Autres produits';
}

function getBrandMeta(brand) {
  return HB_BRAND_META[brand] || {
    slug: brand.toLowerCase().replace(/\s+/g, '-'),
    tagline: 'Produit distribué par HB Commerce',
    origin: '',
    accent: 'default'
  };
}

function groupProductsByBrand(products) {
  const map = new Map();
  products.forEach((product) => {
    const brand = getProductBrand(product);
    if (!map.has(brand)) map.set(brand, []);
    map.get(brand).push(product);
  });
  return [...map.entries()].sort(([a], [b]) => {
    if (a === 'FIAFI') return -1;
    if (b === 'FIAFI') return 1;
    if (a === 'TOUNSI') return -1;
    if (b === 'TOUNSI') return 1;
    return a.localeCompare(b, 'fr');
  });
}

function renderBrandBlock(brand, products, options = {}) {
  const meta = getBrandMeta(brand);
  const limit = options.limit || products.length;
  const slice = products.slice(0, limit);
  const heroProduct = products.find((p) => p.tag) || products[0];
  const heroImg = heroProduct ? resolveProductImage(heroProduct) : (FIAFI_IMAGES?.product || 'images/prenium.PNG');
  const countLabel = `${products.length} format${products.length > 1 ? 's' : ''}`;

  return `
    <section class="brand-block brand-block--${meta.accent}" id="marque-${meta.slug}">
      <header class="brand-block-head">
        <div class="brand-block-intro">
          <img class="brand-block-thumb" src="${heroImg}" alt="${escapeHtml(brand)}" loading="lazy">
          <div>
            <span class="brand-block-label">Marque</span>
            <h3 class="brand-block-title">${escapeHtml(brand)}</h3>
            <p class="brand-block-tagline">${escapeHtml(meta.tagline)}${meta.origin ? ` · ${escapeHtml(meta.origin)}` : ''}</p>
            <span class="brand-block-count">${countLabel}</span>
          </div>
        </div>
        <a href="produits.html#marque-${meta.slug}" class="btn btn-sm btn-outline-dark">Tous les produits ${escapeHtml(brand)}</a>
      </header>
      <div class="products-grid brand-block-grid">
        ${slice.map(renderProductCard).join('')}
      </div>
    </section>
  `;
}

function renderHomeBrandCatalog(products) {
  if (!products.length) {
    return '<p class="empty-state">Aucun produit disponible pour le moment.</p>';
  }
  return groupProductsByBrand(products)
    .map(([brand, list]) => renderBrandBlock(brand, list, { limit: 6 }))
    .join('');
}

function renderHeroPromoBrands(products) {
  const groups = groupProductsByBrand(products);
  if (!groups.length) {
    return '<p class="hero-promo-empty">Catalogue en cours de mise à jour.</p>';
  }
  return groups.map(([brand, list]) => {
    const meta = getBrandMeta(brand);
    const sample = list[0];
    const img = sample ? resolveProductImage(sample) : (FIAFI_IMAGES?.product || 'images/prenium.PNG');
    return `
      <a href="#marque-${meta.slug}" class="hero-promo-brand hero-promo-brand--${meta.accent}">
        <img src="${img}" alt="${escapeHtml(brand)}" loading="lazy">
        <span class="hero-promo-brand-name">${escapeHtml(brand)}</span>
        <span class="hero-promo-brand-count">${list.length} produit${list.length > 1 ? 's' : ''}</span>
      </a>
    `;
  }).join('');
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
