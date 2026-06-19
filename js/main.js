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
    bindCategoryNav(navHost, products, grid, (product, qty) => {
      const toast = document.getElementById('cartToast');
      if (toast) {
        toast.textContent = `${product.name} ajouté (${qty} ${product.unit}(s))`;
        toast.hidden = false;
        setTimeout(() => { toast.hidden = true; }, 3000);
      }
    });
  } else {
    grid.innerHTML = products.map(renderProductCard).join('');
    bindProductCardEvents(grid);
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
  bindProductCardEvents(catalogHost);

  const promoHost = document.getElementById('heroPromoBrands');
  if (promoHost && typeof renderHeroPromoBrands === 'function') {
    promoHost.innerHTML = renderHeroPromoBrands(products);
  }

  const catalogNote = document.getElementById('heroCatalogNote');
  if (catalogNote) {
    const brandCount = brandGroups.length;
    const productCount = products.length;
    catalogNote.textContent = brandCount
      ? `${brandCount} marque${brandCount > 1 ? 's' : ''} · ${productCount} produit${productCount > 1 ? 's' : ''} en ligne`
      : 'Catalogue en cours de mise à jour.';
  }

  const heroPills = document.getElementById('heroBrandPills');
  if (heroPills && brandGroups.length) {
    heroPills.innerHTML = brandGroups.slice(0, 4).map(([brand]) => {
      const meta = getBrandMeta(brand);
      return `<li><a href="#marque-${meta.slug}">${escapeHtml(brand)}</a></li>`;
    }).join('');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initProductsPage();
  initHomeProducts();
});
