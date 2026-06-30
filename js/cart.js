const CART_KEY = 'hb_commerce_cart';

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  const badge = document.getElementById('cartBadge');
  if (badge) {
    const count = items.reduce((s, i) => s + i.quantity, 0);
    badge.textContent = count;
    badge.style.display = count > 0 ? '' : 'none';
  }
}

function getCartCount() {
  return getCart().reduce((s, i) => s + i.quantity, 0);
}

function addToCart(product, quantity = 1) {
  const cart = getCart();
  const productId = String(product.id);
  const existing = cart.find((i) => String(i.id) === productId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      unit: product.unit,
      image_url: product.image_url,
      stock_available: product.stock_available || 0,
      estimated_delivery_days: product.estimated_delivery_days || 14,
      delivery_delay_label: product.delivery_delay_label || '',
      quantity
    });
  }
  saveCart(cart);
  return cart;
}

function updateCartQuantity(productId, quantity) {
  const cart = getCart();
  const id = String(productId);
  const item = cart.find((i) => String(i.id) === id);
  if (!item) return cart;
  if (quantity <= 0) {
    return removeFromCart(productId);
  }
  item.quantity = quantity;
  saveCart(cart);
  return cart;
}

function removeFromCart(productId) {
  const id = String(productId);
  const cart = getCart().filter((i) => String(i.id) !== id);
  saveCart(cart);
  return cart;
}

function clearCart() {
  saveCart([]);
}

function getCartTotal() {
  return getCart().reduce((s, i) => s + i.price * i.quantity, 0);
}
