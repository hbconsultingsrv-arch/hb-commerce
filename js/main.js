function redirectToCartAfterAdd(product, qty) {
  try {
    sessionStorage.setItem('hb_cart_flash', JSON.stringify({
      name: product.name,
      qty,
      unit: product.unit
    }));
  } catch {
    /* ignore */
  }
  window.location.href = 'panier.html';
}

function onProductAddedToCart(product, qty) {
  redirectToCartAfterAdd(product, qty);
}

async function initProductsPage() {
  const grid = document.getElementById('productsGrid');
  const navHost = document.getElementById('categoryNav');
  const qualityHost = document.getElementById('qualitySection');
  if (!grid) return;

  if (typeof refreshPriceVisibility === 'function') {
    await refreshPriceVisibility();
  }

  if (qualityHost && typeof renderQualitySection === 'function') {
    qualityHost.innerHTML = renderQualitySection();
  }

  const products = await fetchProducts();

  if (navHost && typeof bindCategoryNav === 'function') {
    bindCategoryNav(navHost, products, grid, onProductAddedToCart);
  } else {
    grid.innerHTML = products.map(renderProductCard).join('');
    bindProductCardEvents(grid, onProductAddedToCart, products);
  }

  const hash = window.location.hash.replace('#cat-', '');
  if (hash && navHost) {
    const btn = navHost.querySelector(`[data-category="${hash}"]`);
    if (btn) btn.click();
  }
}

async function initHomeProducts() {
  if (typeof refreshPriceVisibility === 'function') {
    await refreshPriceVisibility();
  }

  const catalogHost = document.getElementById('homeBrandCatalog');
  if (!catalogHost) return;

  const products = await fetchProducts();
  const brandGroups = typeof groupProductsByBrand === 'function' ? groupProductsByBrand(products) : [];

  catalogHost.innerHTML = typeof renderHomeBrandCatalog === 'function'
    ? renderHomeBrandCatalog(products)
    : products.map(renderProductCard).join('');
  bindProductCardEvents(catalogHost, onProductAddedToCart, products);
  if (typeof bindBrandImageFallbacks === 'function') bindBrandImageFallbacks(catalogHost);

  if (typeof populateCatalogFilters === 'function') populateCatalogFilters(products);
  if (typeof updateHeroStats === 'function') updateHeroStats(products);

  if (typeof initHeroBrandCube === 'function') {
    initHeroBrandCube(products);
  } else {
    const promoHost = document.getElementById('heroPromoBrands');
    if (promoHost && typeof renderHeroPromoBrands === 'function') {
      promoHost.innerHTML = renderHeroPromoBrands(products);
    }
  }

  const catalogNote = document.getElementById('heroCatalogNote');
  if (catalogNote) {
    const brandCount = brandGroups.length;
    const productCount = products.length;
    if (brandCount) {
      catalogNote.textContent = `${brandCount} marque${brandCount > 1 ? 's' : ''} · ${productCount} produit${productCount > 1 ? 's' : ''} en ligne`;
    } else {
      const status = typeof getCatalogStatus === 'function' ? getCatalogStatus() : null;
      catalogNote.textContent = status?.code === 'empty'
        ? 'Base vide — lancez seed-demo-data.sql dans Supabase.'
        : (status?.message || 'Catalogue indisponible pour le moment.');
    }
  }

  const heroPills = document.getElementById('heroBrandPills');
  const heroPillsRow = document.getElementById('heroBrandPillsRow');
  if (brandGroups.length) {
    const pillsHtml = brandGroups.slice(0, 6).map(([brand]) => {
      const meta = getBrandMeta(brand);
      return `<li><a href="#marque-${meta.slug}">${escapeHtml(brand)}</a></li>`;
    }).join('');
    if (heroPills) {
      heroPills.innerHTML = brandGroups.slice(0, 4).map(([brand]) => {
        const meta = getBrandMeta(brand);
        return `<li><a href="#marque-${meta.slug}">${escapeHtml(brand)}</a></li>`;
      }).join('');
    }
    if (heroPillsRow) heroPillsRow.innerHTML = pillsHtml;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (typeof bindAppModal === 'function') bindAppModal('productTechModal');
  initProductsPage();
  initHomeProducts();
});
