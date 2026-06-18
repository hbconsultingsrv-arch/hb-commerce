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
    if (form.siren) form.siren.value = profile.siren || '';
    if (form.vat_number) form.vat_number.value = profile.vat_number || '';

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const note = document.getElementById('profileNote');
      const fd = new FormData(form);
      try {
        await updateProfile(session.user.id, {
          full_name: fd.get('full_name'),
          phone: fd.get('phone'),
          address: fd.get('address'),
          company: fd.get('company'),
          siren: fd.get('siren'),
          vat_number: fd.get('vat_number')
        });
        showAlert(note, 'Profil mis à jour.', 'success');
      } catch (err) {
        showAlert(note, err.message);
      }
    });
  }

  await loadCompanyChat(session);
  const orders = await fetchUserOrders(session.user.id);
  const emptyEl = document.getElementById('ordersEmpty');
  const tableEl = document.getElementById('ordersTable');
  const bodyEl = document.getElementById('ordersBody');

  if (!orders.length) {
    if (emptyEl) emptyEl.hidden = false;
    if (tableEl) tableEl.hidden = true;
  } else if (bodyEl) {
    if (emptyEl) emptyEl.hidden = true;
    if (tableEl) tableEl.hidden = false;
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
  const superRootLink = document.getElementById('compteSuperRootLink');
  if (superRootLink && typeof isSuperRoot === 'function' && await isSuperRoot()) {
    superRootLink.style.display = '';
  }

  document.getElementById('logoutBtn')?.addEventListener('click', signOut);
}

function chatStatusLabel(status) {
  if (status === 'pending') return 'En attente';
  if (status === 'rejected') return 'Rejeté';
  return 'Validé';
}

function renderCompanyChat(messages) {
  const host = document.getElementById('companyChatHistory');
  if (!host) return;

  if (!messages.length) {
    host.innerHTML = '<p class="empty-state">Aucun message pour le moment.</p>';
    return;
  }

  host.innerHTML = messages.map((msg) => `
    <article class="chat-message ${msg.author_role === 'client' ? 'from-client' : 'from-admin'}">
      <div class="chat-meta">
        <strong>${msg.author_role === 'client' ? 'Votre société' : 'HB Commerce'}</strong>
        <span>${formatDate(msg.created_at)}</span>
        <span class="chat-status ${msg.status}">${chatStatusLabel(msg.status)}</span>
      </div>
      <p>${escapeHtml(msg.message)}</p>
    </article>
  `).join('');
  host.scrollTop = host.scrollHeight;
}

async function loadCompanyChat(session) {
  if (typeof fetchChatMessages !== 'function') return;
  try {
    const messages = await fetchChatMessages(session.user.id);
    renderCompanyChat(messages);
  } catch (err) {
    const host = document.getElementById('companyChatHistory');
    if (host) host.innerHTML = `<p class="empty-state">${escapeHtml(err.message)}</p>`;
    return;
  }

  document.getElementById('refreshChatBtn')?.addEventListener('click', async () => {
    try {
      renderCompanyChat(await fetchChatMessages(session.user.id));
    } catch (err) {
      showAlert(document.getElementById('companyChatNote'), err.message);
    }
  });

  const form = document.getElementById('companyChatForm');
  if (!form || form.dataset.bound === '1') return;
  form.dataset.bound = '1';
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const note = document.getElementById('companyChatNote');
    const fd = new FormData(form);
    try {
      await sendCompanyChatMessage({
        companyId: session.user.id,
        authorId: session.user.id,
        message: fd.get('message')
      });
      form.reset();
      showAlert(note, 'Message envoyé, en attente de validation.', 'success');
      renderCompanyChat(await fetchChatMessages(session.user.id));
    } catch (err) {
      showAlert(note, err.message);
    }
  });
}

document.addEventListener('DOMContentLoaded', initDashboard);
