async function initDashboard() {
  const session = await requireAuth();
  if (!session) return;

  const profile = await getProfile(session.user.id);
  const welcomeName = document.getElementById('welcomeName');
  if (welcomeName) welcomeName.textContent = profile?.full_name || session.user.email;

  const form = document.getElementById('profileForm');
  if (form && profile) {
    form.full_name.value = profile.full_name || '';
    form.email.value = profile.email || session.user.email;
    form.phone.value = profile.phone || '';
    form.address.value = profile.address || '';
    if (form.company) form.company.value = profile.company || '';

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const note = document.getElementById('profileNote');
      const fd = new FormData(form);
      try {
        await updateProfile(session.user.id, {
          full_name: fd.get('full_name'),
          phone: fd.get('phone'),
          address: fd.get('address'),
          company: fd.get('company')
        });
        showAlert(note, 'Profil mis à jour.', 'success');
      } catch (err) {
        showAlert(note, err.message);
      }
    });
  }

  const orders = await fetchUserOrders(session.user.id);
  const emptyEl = document.getElementById('ordersEmpty');
  const tableEl = document.getElementById('ordersTable');
  const bodyEl = document.getElementById('ordersBody');

  if (!orders.length) {
    if (emptyEl) emptyEl.hidden = false;
    if (tableEl) tableEl.hidden = true;
    return;
  }

  if (emptyEl) emptyEl.hidden = true;
  if (tableEl) tableEl.hidden = false;

  if (bodyEl) {
    bodyEl.innerHTML = orders.map((order) => {
      const items = (order.order_items || [])
        .map((i) => `${i.product_name} × ${i.quantity}`)
        .join(', ');
      const statusLabel = ORDER_STATUS_LABELS[order.status] || order.status;
      return `
        <tr>
          <td>${formatDate(order.created_at)}</td>
          <td>#${order.id.slice(0, 8)}</td>
          <td>${items}</td>
          <td><strong>${formatPrice(order.total)}</strong></td>
          <td><span class="order-status ${order.status}">${statusLabel}</span></td>
        </tr>
      `;
    }).join('');
  }

  const adminLink = document.getElementById('compteAdminLink');
  if (adminLink && await isAdmin()) {
    adminLink.style.display = '';
  }

  document.getElementById('logoutBtn')?.addEventListener('click', signOut);
}

document.addEventListener('DOMContentLoaded', initDashboard);
