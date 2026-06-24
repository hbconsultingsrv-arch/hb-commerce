async function initHomeProducts() {
  if (typeof refreshPriceVisibility === 'function') {
    await refreshPriceVisibility();
  }

  const catalogHost = document.getElementById('homeBrandCatalog');
  const products = await fetchProducts();
  const brandGroups = typeof groupProductsByBrand === 'function' ? groupProductsByBrand(products) : [];

  if (catalogHost) {
    catalogHost.innerHTML = typeof renderHomeBrandCatalog === 'function'
      ? renderHomeBrandCatalog(products)
      : products.map(renderProductCard).join('');
    bindProductCardEvents(catalogHost, null, products);
  }

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
  if (heroPills && brandGroups.length) {
    heroPills.innerHTML = brandGroups.slice(0, 4).map(([brand]) => {
      const meta = getBrandMeta(brand);
      return `<li><a href="#products">${escapeHtml(brand)}</a></li>`;
    }).join('');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (typeof bindAppModal === 'function') bindAppModal('productTechModal');
  initProductsPage();
  initHomeProducts();
});
