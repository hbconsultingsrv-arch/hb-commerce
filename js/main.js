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

  const showcase = document.getElementById('categoryShowcase');
  if (showcase && typeof renderCategoryShowcase === 'function') {
    showcase.innerHTML = renderCategoryShowcase();
  }

  const grid = document.getElementById('homeProductsGrid');
  if (!grid) return;
  const products = await fetchProducts();
  const featured = products.slice(0, 6);
  grid.innerHTML = featured.map(renderProductCard).join('');
  bindProductCardEvents(grid);
}

document.addEventListener('DOMContentLoaded', () => {
  initProductsPage();
  initHomeProducts();
});
