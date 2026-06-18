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
  updateHeroPrice(products);
  const featured = products.slice(0, 6);
  grid.innerHTML = featured.map(renderProductCard).join('');
  bindProductCardEvents(grid);
}

function updateHeroPrice(products) {
  const heroPrice = document.getElementById('heroPrice');
  if (!heroPrice) return;

  if (typeof canViewPrices === 'function' && !canViewPrices()) {
    heroPrice.textContent = 'xx';
    return;
  }

  const prices = products
    .map((product) => Number(product.price))
    .filter((price) => Number.isFinite(price));
  if (!prices.length) {
    heroPrice.textContent = 'xx';
    return;
  }

  const premium = products.find((product) => product.category === 'premium') || products[0];
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  heroPrice.textContent = `${formatPrice(premium.price)} / ${premium.unit} · formats ${formatPrice(min)} à ${formatPrice(max)}`;
}

document.addEventListener('DOMContentLoaded', () => {
  initProductsPage();
  initHomeProducts();
});
