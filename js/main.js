async function initProductsPage() {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  const products = await fetchProducts();
  grid.innerHTML = products.map(renderProductCard).join('');
  grid.querySelectorAll('img[data-fayafi]').forEach(applyFayafiImageFallback);
  bindProductCardEvents(grid, (product, qty) => {
    const toast = document.getElementById('cartToast');
    if (toast) {
      toast.textContent = `${product.name} ajouté (${qty} ${product.unit}(s))`;
      toast.hidden = false;
      setTimeout(() => { toast.hidden = true; }, 3000);
    }
  });
}

async function initHomeProducts() {
  const grid = document.getElementById('homeProductsGrid');
  if (!grid) return;
  const products = await fetchProducts();
  const featured = products.slice(0, 3);
  grid.innerHTML = featured.map(renderProductCard).join('');
  grid.querySelectorAll('img[data-fayafi]').forEach(applyFayafiImageFallback);
  bindProductCardEvents(grid);
}

document.addEventListener('DOMContentLoaded', () => {
  initProductsPage();
  initHomeProducts();
});
