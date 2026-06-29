let lastCatalogStatus = { code: 'loading', message: '' };

function getCatalogStatus() {
  return lastCatalogStatus;
}

async function fetchProducts(activeOnly = true) {
  const sb = getSupabase();
  if (!sb) {
    const message = typeof window.supabase === 'undefined'
      ? 'Bibliotheque Supabase absente sur la page.'
      : (typeof configErrorMessage === 'function' ? configErrorMessage() : 'Supabase non configure.');
    lastCatalogStatus = { code: 'no_client', message };
    console.warn('fetchProducts:', message);
    return [];
  }

  let query = sb.from('products').select('*').order('sort_order', { ascending: true });
  if (activeOnly) query = query.eq('active', true);
  const { data, error } = await query;
  if (error) {
    lastCatalogStatus = { code: 'error', message: error.message };
    console.warn('fetchProducts:', error.message);
    return [];
  }

  const dbList = (data || [])
    .map((p) => (typeof normalizeFiafiProduct === 'function' ? normalizeFiafiProduct(p) : p))
    .filter((p) => p.slug !== 'fiafi-huile-olive');
  const enriched = typeof enrichDbProducts === 'function'
    ? enrichDbProducts(dbList)
    : dbList;

  const products = activeOnly ? enriched.filter((p) => p.active) : enriched;
  if (!products.length) {
    lastCatalogStatus = {
      code: 'empty',
      message: 'Aucun produit actif en base. Executez supabase/seed-demo-data.sql dans Supabase.'
    };
  } else {
    lastCatalogStatus = { code: 'ok', message: '' };
  }

  const priced = await applyCustomerPrices(products);
  return applyStockInfo(priced);
}

async function applyStockInfo(products) {
  if (!products.length) return products;

  const slugs = [...new Set(products.map((p) => p.slug).filter(Boolean))];
  const hasDepotStock = products.some((p) => typeof p.stock_quantity === 'number');

  if (hasDepotStock) {
    const pending = typeof fetchPendingRestockMap === 'function'
      ? await fetchPendingRestockMap(slugs)
      : {};

    return products.map((product) => {
      const available = Math.max(0, Number(product.stock_quantity) || 0);
      const pendingRow = pending[product.slug];
      const nextRestock = pendingRow?.next_arrival_date || null;
      const lead = available > 0 ? 3 : 14;

      return {
        ...product,
        stock_available: available,
        next_restock_date: nextRestock,
        estimated_delivery_days: lead,
        delivery_delay_label: available > 0
          ? `En stock (${available} u.) — livraison estimée ${lead} jours`
          : (nextRestock
            ? `Zero stock — réapprovisionnement estimé le ${formatRestockDate ? formatRestockDate(nextRestock) : nextRestock}`
            : 'Zero stock — réapprovisionnement en cours')
      };
    });
  }

  const sb = getSupabase();
  const bySlug = new Map();
  if (sb) {
    const { data, error } = await sb
      .from('product_stocks')
      .select('product_slug, quantity, reserved_quantity, lead_time_days')
      .in('product_slug', slugs);
    if (error) {
      console.warn('product_stocks:', error.message);
    } else {
      (data || []).forEach((row) => {
        const current = bySlug.get(row.product_slug) || { available: 0, lead: 30 };
        const available = Math.max(0, Number(row.quantity || 0) - Number(row.reserved_quantity || 0));
        bySlug.set(row.product_slug, {
          available: current.available + available,
          lead: Math.min(current.lead, Number(row.lead_time_days || 30))
        });
      });
    }
  }

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
  if (!sb) return null;
  const { data, error } = await sb.from('products').select('*').eq('slug', normalizedSlug).maybeSingle();
  if (error) throw error;
  const product = typeof normalizeFiafiProduct === 'function' ? normalizeFiafiProduct(data) : data;
  const priced = await applyCustomerPrices(product ? [product] : []);
  return priced[0] || null;
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
  if (isFiafiProduct(product) && typeof getFiafiProductImage === 'function') {
    return getFiafiProductImage(product);
  }
  return product.image_url || FIAFI_IMAGES?.product || 'images/prenium.PNG';
}

function isOilProduct(product) {
  const text = `${product?.name || ''} ${product?.category || ''} ${product?.description || ''}`.toLowerCase();
  return Boolean(product?.acidity) || /huile|olive|oil/.test(text);
}

function getProductAvailability(product) {
  if (typeof getStockStatus === 'function' && typeof product?.stock_quantity === 'number') {
    return getStockStatus(product);
  }
  const available = Number(product?.stock_available || 0);
  if (available > 0) {
    return {
      label: 'En stock',
      detail: `${available} unité${available > 1 ? 's' : ''} disponible${available > 1 ? 's' : ''}`,
      tone: 'in-stock'
    };
  }
  return {
    label: 'Zero stock',
    detail: product?.delivery_delay_label || 'Zero stock — réapprovisionnement en cours',
    tone: 'out-of-stock'
  };
}

function buildProductTechSpecs(product) {
  const specs = [];
  const LE = '\u2264';

  if (product.name) specs.push({ label: 'Produit', value: product.name });
  if (product.format_label) specs.push({ label: 'Format', value: product.format_label });
  if (product.category) specs.push({ label: 'Catégorie', value: getCategoryLabel(product.category) });
  if (product.packaging_type) specs.push({ label: 'Conditionnement', value: getPackagingLabel(product.packaging_type) });
  if (product.volume_ml) specs.push({ label: 'Volume', value: `${product.volume_ml} ml` });
  if (product.acidity) {
    const acidityDisplay = typeof formatAcidity === 'function' ? formatAcidity(product.acidity) : product.acidity;
    specs.push({ label: 'Acidité', value: acidityDisplay });
  }
  if (product.origin) specs.push({ label: 'Pays / origine', value: product.origin });

  if (isOilProduct(product)) {
    specs.push({ label: 'Type', value: 'Huile d\'olive extra vierge' });
    if (isFiafiProduct(product)) {
      specs.push({ label: 'Pression', value: 'Première pression à froid' });
      specs.push({ label: 'Indice de peroxyde', value: `${LE} 20 meq O2/kg` });
      specs.push({ label: 'Humidité', value: `${LE} 0,2 %` });
    }
  }

  if (product.unit) specs.push({ label: 'Unité de vente', value: product.unit });
  if (product.min_quantity) {
    specs.push({ label: 'Quantité minimum', value: `${product.min_quantity} ${product.unit}(s)` });
  }

  const availability = getProductAvailability(product);
  specs.push({ label: 'Disponibilité', value: availability.detail || availability.label });
  if (product.delivery_delay_label) {
    specs.push({ label: 'Délai de livraison', value: product.delivery_delay_label });
  }
  if (product.description) {
    specs.push({ label: 'Description', value: product.description, wide: true });
  }

  return specs;
}

function renderProductInfoStrip(product) {
  const origin = product.origin || '—';
  const availability = getProductAvailability(product);
  const showAcidity = isOilProduct(product);
  const acidityDisplay = showAcidity
    ? (typeof formatAcidity === 'function' ? formatAcidity(product.acidity || '') : (product.acidity || '—'))
    : '';

  return `
    <div class="product-info-strip">
      ${showAcidity ? `
        <div class="product-info-item">
          <span class="product-info-label">Acidité</span>
          <span class="product-info-value">${escapeHtml(acidityDisplay || '—')}</span>
        </div>
      ` : ''}
      <div class="product-info-item">
        <span class="product-info-label">Pays</span>
        <span class="product-info-value">${escapeHtml(origin)}</span>
      </div>
      <div class="product-info-item product-info-item--${availability.tone}">
        <span class="product-info-label">Dispo.</span>
        <span class="product-info-value">${escapeHtml(availability.label)}</span>
      </div>
      <button type="button" class="product-info-tech btn-tech-sheet" aria-label="Fiche technique de ${escapeHtml(product.name)}">
        Fiche technique
      </button>
    </div>
  `;
}

function renderProductTechSheetContent(product) {
  const imgUrl = resolveProductImage(product);
  const imgFallback = FIAFI_IMAGES?.product || 'images/prenium.PNG';
  const specs = buildProductTechSpecs(product);

  return `
    <div class="tech-sheet">
      <div class="tech-sheet-head">
        <img src="${imgUrl}" alt="${escapeHtml(product.name)}" class="tech-sheet-img" onerror="this.onerror=null;this.src='${imgFallback}'">
        <div>
          <p class="tech-sheet-brand">${escapeHtml(getProductBrand(product))}</p>
          <h3 id="productTechModalTitle">${escapeHtml(product.name)}</h3>
          ${product.format_label ? `<p class="tech-sheet-format">${escapeHtml(product.format_label)}</p>` : ''}
        </div>
      </div>
      <dl class="tech-sheet-specs">
        ${specs.map((spec) => `
          <div class="tech-sheet-row${spec.wide ? ' tech-sheet-row-wide' : ''}">
            <dt>${escapeHtml(spec.label)}</dt>
            <dd>${escapeHtml(spec.value)}</dd>
          </div>
        `).join('')}
      </dl>
      <div style="margin-top:1.25rem;display:flex;flex-wrap:wrap;gap:0.65rem">
        <button type="button" class="btn-quote" data-open-quote
          data-product-name="${escapeHtml(product.name)}"
          data-product-ref="${escapeHtml(product.slug || product.id)}">Demander un devis</button>
      </div>
    </div>
  `;
}

function openProductTechSheet(product) {
  const modal = document.getElementById('productTechModal');
  const body = document.getElementById('productTechModalBody');
  if (!modal || !body || !product) return;

  body.innerHTML = renderProductTechSheetContent(product);
  if (typeof bindAppModal === 'function' && modal.dataset.bound !== '1') {
    bindAppModal('productTechModal');
  }
  if (typeof openAppModal === 'function') {
    openAppModal('productTechModal');
  } else {
    modal.hidden = false;
    document.body.classList.add('modal-open');
  }
}

function renderProductCard(product) {
  const minQty = product.min_quantity || 1;
  const imgUrl = resolveProductImage(product);
  const imgFallback = FIAFI_IMAGES?.product || 'images/prenium.PNG';
  const fiafi = isFiafiProduct(product);
  const cardClass = fiafi ? 'product-card fiafi-card product-card--premium' : 'product-card product-card--premium';
  const formatLabel = product.format_label || '';
  const packaging = getPackagingLabel(product.packaging_type) || product.unit || '—';
  const priceDisplay = typeof formatDisplayPrice === 'function' ? formatDisplayPrice(product.price) : 'xx';
  const unitDisplay = typeof canViewPrices === 'function' && !canViewPrices() ? '' : `/ ${product.unit}`;
  const brand = getProductBrand(product);
  const availability = getProductAvailability(product);
  const stock = typeof getStockStatus === 'function' ? getStockStatus(product) : { tone: 'in-stock', detail: availability.detail };
  const stockKey = stock.tone === 'out-of-stock' ? 'out' : (stock.low ? 'low' : 'in');
  const stockClass = stock.tone === 'out-of-stock' ? 'stock-out' : (stock.low ? 'stock-low' : 'stock-in');
  const ref = product.slug || product.id;

  return `
    <article class="${cardClass}" data-product-id="${product.id}" data-category="${product.category || ''}"
      data-brand="${escapeHtml(brand)}" data-origin="${escapeHtml(product.origin || '')}"
      data-format="${escapeHtml(formatLabel || product.unit || '')}" data-stock="${stockKey}">
      <div class="product-img-area">
        ${product.tag ? '<span class="premium-badge">Premium</span>' : ''}
        ${product.origin ? `<span class="origin-badge">${escapeHtml(String(product.origin).toUpperCase())}</span>` : ''}
        ${packaging && packaging !== '—' ? `<span class="packaging-badge">${packaging}</span>` : ''}
        <img src="${imgUrl}" alt="${product.name}" loading="lazy" onerror="this.onerror=null;this.src='${imgFallback}'">
      </div>
      ${renderProductInfoStrip(product)}
      <div class="product-card-body">
        <span class="sku-ref">Réf. ${escapeHtml(ref)}</span>
        ${product.tag ? `<span class="tag">${product.tag}</span>` : ''}
        ${formatLabel ? `<span class="format-label">${formatLabel}</span>` : ''}
        <h3>${product.name}</h3>
        <p class="product-desc">${product.description || ''}</p>
        <div class="product-card-meta">
          <div class="product-meta-row">
            <span class="product-meta-label">Origine</span>
            <span class="product-meta-value">${escapeHtml(product.origin || '—')}</span>
          </div>
          <div class="product-meta-row">
            <span class="product-meta-label">Conditionnement</span>
            <span class="product-meta-value">${escapeHtml(packaging)}</span>
          </div>
          <div class="product-meta-row">
            <span class="product-meta-label">Disponibilité</span>
            <span class="product-meta-value ${stockClass}">${escapeHtml(availability.label)}</span>
          </div>
          <div class="product-meta-row">
            <span class="product-meta-label">Référence</span>
            <span class="product-meta-value">${escapeHtml(String(ref))}</span>
          </div>
        </div>
        <div class="price-row">
          <span class="price">${priceDisplay}</span>
          ${unitDisplay ? `<span class="unit">${unitDisplay}</span>` : ''}
        </div>
        ${product.customer_price ? '<p class="form-note min-qty">Prix personnalis&eacute; soci&eacute;t&eacute;</p>' : ''}
        ${product.delivery_delay_label ? `<p class="form-note min-qty">${escapeHtml(product.delivery_delay_label)}</p>` : ''}
        <p class="form-note min-qty">Minimum : ${minQty} ${product.unit}(s)</p>
        <div class="product-actions product-actions--dual">
          <button type="button" class="btn-quote-outline" data-open-quote
            data-product-name="${escapeHtml(product.name)}"
            data-product-ref="${escapeHtml(String(ref))}"
            data-product-qty="${minQty} ${product.unit}(s) minimum">Demander un devis</button>
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
  },
  'CAP BON': {
    slug: 'cap-bon',
    tagline: 'Épicerie tunisienne — harissa et spécialités',
    origin: 'Tunisie',
    accent: 'default',
    image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800&q=80'
  },
  OASIS: {
    slug: 'oasis',
    tagline: 'Fruits secs — dattes Deglet Nour',
    origin: 'Tunisie',
    accent: 'default',
    image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&q=80'
  },
  MONCEF: {
    slug: 'moncef',
    tagline: 'Couscous et semoules — restauration collective',
    origin: 'Tunisie',
    accent: 'default',
    image: 'https://images.unsplash.com/photo-1598866594230-a7c127049e09?w=800&q=80'
  },
  'LES MOULINS': {
    slug: 'les-moulins',
    tagline: 'Huiles et friture professionnelle',
    origin: 'Tunisie',
    accent: 'default',
    image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800&q=80'
  },
  MOULIN: {
    slug: 'moulin',
    tagline: 'Épicerie fine — confitures',
    origin: 'Tunisie',
    accent: 'default',
    image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&q=80'
  }
};

function defaultProductImageFallback() {
  if (typeof getFiafiImageUrl === 'function') return getFiafiImageUrl(600);
  return window.FIAFI_IMAGES?.product || window.HB_BRANDING?.images?.thumb || 'images/prenium.PNG';
}

function resolveBrandHeroImage(brand, products) {
  const meta = getBrandMeta(brand);
  if (meta.image) return meta.image;

  if (products?.length) {
    for (const product of products) {
      const url = (product.image_url || '').trim();
      if (url && !isStaleFiafiImage(url)) return url;
    }
    const sample = products.find((p) => p.tag) || products[0];
    if (sample) {
      const resolved = resolveProductImage(sample);
      const fallback = defaultProductImageFallback();
      if (resolved && resolved !== fallback) return resolved;
    }
  }

  return defaultProductImageFallback();
}

function bindBrandImageFallbacks(root = document) {
  const globalFallback = defaultProductImageFallback();
  root.querySelectorAll('.brand-block-thumb, .hero-promo-brand img').forEach((img) => {
    if (img.dataset.fallbackBound === '1') return;
    img.dataset.fallbackBound = '1';
    const primaryFallback = img.dataset.fallbackSrc || globalFallback;
    img.addEventListener('error', () => {
      const next = img.dataset.fallbackSrc && img.src !== img.dataset.fallbackSrc
        ? img.dataset.fallbackSrc
        : globalFallback;
      if (img.src !== next) img.src = next;
    });
  });
}

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
  const heroImg = resolveBrandHeroImage(brand, products);
  const imgFallback = escapeHtml(meta.image || defaultProductImageFallback());
  const countLabel = `${products.length} format${products.length > 1 ? 's' : ''}`;

  return `
    <section class="brand-block brand-block--${meta.accent}" id="marque-${meta.slug}">
      <header class="brand-block-head">
        <div class="brand-block-intro">
          <img class="brand-block-thumb" src="${escapeHtml(heroImg)}" data-fallback-src="${imgFallback}" alt="${escapeHtml(brand)}" loading="lazy" onerror="if(this.dataset.fallbackSrc&&this.src!==this.dataset.fallbackSrc){this.onerror=null;this.src=this.dataset.fallbackSrc}">
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
    return `<p class="empty-state">${renderCatalogEmptyMessage()}</p>`;
  }
  return groupProductsByBrand(products)
    .map(([brand, list]) => renderBrandBlock(brand, list, { limit: 6 }))
    .join('');
}

function renderCatalogEmptyMessage() {
  const status = typeof getCatalogStatus === 'function' ? getCatalogStatus() : null;
  if (status?.code === 'empty') {
    return 'Aucun produit actif en base. Executez <strong>supabase/seed-demo-data.sql</strong> dans le SQL Editor Supabase.';
  }
  if (status?.code === 'error') {
    return `Erreur Supabase : ${escapeHtml(status.message || 'lecture impossible')}`;
  }
  if (status?.code === 'no_client') {
    return escapeHtml(status.message || 'Connexion Supabase indisponible.');
  }
  return 'Catalogue en cours de mise a jour.';
}

function renderHeroPromoBrands(products) {
  const groups = groupProductsByBrand(products);
  if (!groups.length) {
    return `<p class="hero-promo-empty">${renderCatalogEmptyMessage()}</p>`;
  }
  return groups.map(([brand, list]) => {
    const meta = getBrandMeta(brand);
    const img = resolveBrandHeroImage(brand, list);
    const imgFallback = escapeHtml(meta.image || defaultProductImageFallback());
    return `
      <a href="#marque-${meta.slug}" class="hero-promo-brand hero-promo-brand--${meta.accent}">
        <img src="${escapeHtml(img)}" data-fallback-src="${imgFallback}" alt="${escapeHtml(brand)}" loading="lazy" onerror="if(this.dataset.fallbackSrc&&this.src!==this.dataset.fallbackSrc){this.onerror=null;this.src=this.dataset.fallbackSrc}">
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

function bindProductCardEvents(container, onAdded, productsList) {
  const byId = new Map((productsList || []).map((product) => [String(product.id), product]));

  container.querySelectorAll('.product-card').forEach((card) => {
    const input = card.querySelector('.qty-input');
    const min = parseInt(input.min, 10) || 1;

    card.querySelector('.btn-tech-sheet')?.addEventListener('click', async () => {
      const id = card.dataset.productId;
      let product = byId.get(id);
      if (!product) {
        const list = await fetchProducts();
        product = list.find((item) => String(item.id) === id);
      }
      if (product) openProductTechSheet(product);
    });

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
    bindProductCardEvents(gridEl, onAdded, products);
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
