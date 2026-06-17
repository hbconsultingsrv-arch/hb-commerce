async function initCheckout() {
  const session = await requireAuth();
  if (!session) return;

  const cart = getCart();
  if (!cart.length) {
    window.location.href = 'produits.html';
    return;
  }

  const profile = await getProfile(session.user.id);
  const summaryEl = document.getElementById('checkoutSummary');
  const totalEl = document.getElementById('checkoutTotal');
  const form = document.getElementById('checkoutForm');

  if (summaryEl) {
    summaryEl.innerHTML = cart.map((item) => `
      <div style="display:flex;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid #eee">
        <span>${item.name} × ${item.quantity} ${item.unit}</span>
        <strong>${formatPrice(item.price * item.quantity)}</strong>
      </div>
    `).join('');
  }

  const total = getCartTotal();
  if (totalEl) totalEl.textContent = formatPrice(total);

  if (form) {
    const nameInput = form.querySelector('[name="full_name"]');
    const phoneInput = form.querySelector('[name="phone"]');
    const addressInput = form.querySelector('[name="shipping_address"]');
    const companyInput = form.querySelector('[name="company"]');

    if (profile) {
      if (nameInput) nameInput.value = profile.full_name || '';
      if (phoneInput) phoneInput.value = profile.phone || '';
      if (addressInput) addressInput.value = profile.address || '';
      if (companyInput) companyInput.value = profile.company || '';
    }

    form.addEventListener('submit', handleCheckoutSubmit);
  }

  document.querySelectorAll('.payment-option').forEach((opt) => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.payment-option').forEach((o) => o.classList.remove('selected'));
      opt.classList.add('selected');
      opt.querySelector('input').checked = true;
    });
  });
}

async function handleCheckoutSubmit(e) {
  e.preventDefault();
  const note = document.getElementById('checkoutNote');
  const session = await getSession();
  if (!session) return;

  const fd = new FormData(e.target);
  const paymentMethod = fd.get('payment_method');
  const cart = getCart();

  try {
    const order = await createOrder({
      userId: session.user.id,
      items: cart,
      total: getCartTotal(),
      paymentMethod,
      notes: fd.get('notes') || '',
      shippingAddress: fd.get('shipping_address')
    });

    await updateProfile(session.user.id, {
      full_name: fd.get('full_name'),
      phone: fd.get('phone'),
      address: fd.get('shipping_address'),
      company: fd.get('company')
    });

    clearCart();

    if (paymentMethod === 'stripe' && window.HB_CONFIG?.stripePaymentLink) {
      const link = window.HB_CONFIG.stripePaymentLink;
      window.location.href = link;
      return;
    }

    showAlert(note, `Commande #${order.id.slice(0, 8)} enregistrée avec succès !`, 'success');
    setTimeout(() => {
      window.location.href = 'compte.html';
    }, 2000);
  } catch (err) {
    showAlert(note, err.message || 'Erreur lors de la commande.');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('checkoutForm')) initCheckout();
});
