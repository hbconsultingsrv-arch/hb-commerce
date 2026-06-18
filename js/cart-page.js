function renderCartPage() {
  const cart = getCart();
  const emptyEl = document.getElementById('cartEmpty');
  const tableEl = document.getElementById('cartTable');
  const bodyEl = document.getElementById('cartBody');
  const totalEl = document.getElementById('cartTotal');

  if (!cart.length) {
    if (emptyEl) emptyEl.hidden = false;
    if (tableEl) tableEl.hidden = true;
    return;
  }

  if (emptyEl) emptyEl.hidden = true;
  if (tableEl) tableEl.hidden = false;

  if (bodyEl) {
    bodyEl.innerHTML = cart.map((item) => `
      <tr>
        <td><img src="${item.image_url}" alt=""></td>
        <td><strong>${item.name}</strong></td>
        <td>${formatDisplayUnitPrice(item.price, item.unit)}</td>
        <td>
          <div class="qty-control">
            <button type="button" data-action="minus" data-id="${item.id}">−</button>
            <input type="number" value="${item.quantity}" min="1" data-id="${item.id}" class="cart-qty-input">
            <button type="button" data-action="plus" data-id="${item.id}">+</button>
          </div>
        </td>
        <td><strong>${formatDisplayPrice(item.price * item.quantity)}</strong></td>
        <td><button type="button" class="btn btn-sm btn-outline-dark" data-action="remove" data-id="${item.id}">Supprimer</button></td>
      </tr>
    `).join('');
  }

  if (totalEl) totalEl.textContent = formatDisplayPrice(getCartTotal());

  bodyEl?.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const item = getCart().find((i) => i.id === id);
      if (!item) return;

      if (btn.dataset.action === 'remove') {
        removeFromCart(id);
      } else if (btn.dataset.action === 'minus') {
        updateCartQuantity(id, item.quantity - 1);
      } else if (btn.dataset.action === 'plus') {
        updateCartQuantity(id, item.quantity + 1);
      }
      renderCartPage();
    });
  });

  bodyEl?.querySelectorAll('.cart-qty-input').forEach((input) => {
    input.addEventListener('change', () => {
      updateCartQuantity(input.dataset.id, parseInt(input.value, 10) || 1);
      renderCartPage();
    });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  if (typeof refreshPriceVisibility === 'function') {
    await refreshPriceVisibility();
  }
  renderCartPage();
});
