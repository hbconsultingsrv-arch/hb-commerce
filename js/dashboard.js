function activateDashboardTab(tabId) {
  const tab = document.querySelector(`#compteTabs [data-tab="${tabId}"]`);
  if (!tab) return;
  document.querySelectorAll('#compteTabs .admin-tab').forEach((t) => t.classList.remove('active'));
  document.querySelectorAll('.admin-panel').forEach((p) => { p.hidden = true; });
  tab.classList.add('active');
  const panel = document.getElementById(`panel-${tabId}`);
  if (panel) panel.hidden = false;
}

async function applyCompteBackOfficeLink() {
  const link = document.getElementById('compteBackOfficeLink');
  if (!link) return;
  if (typeof isSuperRoot === 'function' && await isSuperRoot()) {
    link.href = 'admin.html?tab=equipe';
    link.style.display = '';
    return;
  }
  if (typeof isAdmin === 'function' && await isAdmin()) {
    link.href = 'admin.html';
    link.style.display = '';
    return;
  }
  link.style.display = 'none';
}

function isStorageBucketMissingError(message) {
  const text = String(message || '').toLowerCase();
  return text.includes('bucket not found') || text.includes('bucket introuvable');
}

function profileAvatarMigrationHint() {
  return 'Photo non disponible : exécutez supabase/migration-profile-avatar.sql dans Supabase.';
}

function bindProfileForm(profile, session) {
  const form = document.getElementById('profileForm');
  if (!form || !profile) return profile;

  if (typeof initProfileAvatarUpload === 'function') initProfileAvatarUpload(profile, session);

  form.full_name.value = profile.full_name || '';
  form.email.value = profile.email || session.user.email;
  form.phone.value = profile.phone || '';
  form.address.value = profile.address || '';
  if (form.company) form.company.value = profile.company || '';
  if (form.siren) form.siren.value = profile.siren || '';
  if (form.vat_number) form.vat_number.value = profile.vat_number || '';

  if (form.dataset.bound === '1') return profile;
  form.dataset.bound = '1';
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const note = document.getElementById('profileNote');
    const fd = new FormData(form);
    try {
      let avatarUrl = profile.avatar_url || null;
      let avatarWarning = '';
      const avatarFile = document.getElementById('profileAvatarFile')?.files?.[0];
      if (avatarFile && typeof uploadProfileAvatar === 'function') {
        const uploaded = await uploadProfileAvatar(avatarFile, session.user.id);
        if (uploaded.uploadError) {
          if (isStorageBucketMissingError(uploaded.uploadError)) {
            avatarWarning = profileAvatarMigrationHint();
          } else {
            throw new Error(uploaded.uploadError);
          }
        } else if (uploaded.url) {
          avatarUrl = uploaded.url;
        }
      } else if (document.getElementById('profileAvatarPreview')?.hidden) {
        avatarUrl = null;
      }

      const profileFields = {
        full_name: fd.get('full_name'),
        phone: fd.get('phone'),
        address: fd.get('address'),
        company: fd.get('company'),
        siren: fd.get('siren'),
        vat_number: fd.get('vat_number'),
      };
      if (avatarUrl !== profile.avatar_url) {
        profileFields.avatar_url = avatarUrl;
      }

      profile = await updateProfile(session.user.id, profileFields);
      if (profile?._avatarColumnMissing) {
        avatarWarning = avatarWarning || profileAvatarMigrationHint();
        delete profile._avatarColumnMissing;
      }
      await applySessionUserDisplay(profile, session);
      if (typeof initProfileAvatarUpload === 'function') initProfileAvatarUpload(profile, session);
      const message = avatarWarning ? `Profil mis à jour. ${avatarWarning}` : 'Profil mis à jour.';
      showAlert(note, message, avatarWarning ? 'error' : 'success');
    } catch (err) {
      showAlert(note, err.message);
    }
  });
  return profile;
}

async function initInternalProfileDashboard(profile, session) {
  bindDashboardTabs('#compteTabs .admin-tab');
  await applySessionUserDisplay(profile, session);

  const sectionTag = document.querySelector('.dashboard-header .section-tag');
  if (sectionTag) sectionTag.textContent = 'Mon profil';
  const headerSub = document.querySelector('.dashboard-header .auth-sub');
  if (headerSub) headerSub.textContent = 'Photo, coordonnées et informations personnelles.';

  document.getElementById('commercialAgentContact')?.setAttribute('hidden', '');
  document.querySelectorAll('#compteTabs .admin-tab[data-tab="commandes"], #compteTabs .admin-tab[data-tab="chat"]').forEach((el) => {
    el.hidden = true;
  });
  const orderLink = document.querySelector('.nav-actions a[href="produits.html"]');
  if (orderLink) orderLink.style.display = 'none';

  await applyCompteBackOfficeLink();

  bindProfileForm(profile, session);
  activateDashboardTab('profil');
  document.getElementById('logoutBtn')?.addEventListener('click', signOut);
}

async function initDashboard() {
  const session = await requireAuth();
  if (!session) return;

  let profile = null;
  try {
    profile = await getProfile(session.user.id);
  } catch (err) {
    console.warn('initDashboard: profil inaccessible', err.message);
  }

  const requestedTab = new URLSearchParams(window.location.search).get('tab');
  const profileFocus = requestedTab === 'profil';
  const role = resolveProfileRole(profile, session);

  if (role === 'supplier' && !profileFocus) {
    redirectToRoleHome('supplier.html');
    return;
  }

  if (!isClientDashboardRole(profile, session)) {
    if (profileFocus) {
      await initInternalProfileDashboard(profile, session);
      return;
    }
    redirectToRoleHome(await getDefaultDashboardUrl(session, profile));
    return;
  }

  bindDashboardTabs('#compteTabs .admin-tab');
  await applySessionUserDisplay(profile, session);

  let commercialAgent = null;
  if (profile && typeof fetchAssignedCommercialAgent === 'function') {
    try {
      commercialAgent = await fetchAssignedCommercialAgent(profile);
    } catch (err) {
      console.warn('commercial agent:', err.message);
    }
  }
  renderCommercialAgentContact(commercialAgent);

  profile = bindProfileForm(profile, session) || profile;

  await loadCompanyChat(session, commercialAgent);
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
          <td>${renderTrackingSummary(order)}</td>
          <td><button type="button" class="btn btn-sm btn-outline-dark" data-invoice="${order.id}">Télécharger</button></td>
        </tr>
      `;
    }).join('');
    bindInvoiceButtons(orders, profile);
  }

  if (requestedTab === 'profil') activateDashboardTab('profil');

  await applyCompteBackOfficeLink();

  document.getElementById('logoutBtn')?.addEventListener('click', signOut);
}

function commercialAgentDisplayName(agent) {
  return agent?.full_name || agent?.email || 'Votre agent commercial';
}

function renderCommercialAgentContact(agent) {
  const card = document.getElementById('commercialAgentContact');
  const nameEl = document.getElementById('commercialAgentName');
  const metaEl = document.getElementById('commercialAgentMeta');
  const chatTab = document.getElementById('compteChatTab');
  const chatTitle = document.getElementById('companyChatTitle');
  const chatLabel = document.getElementById('companyChatMessageLabel');
  const chatTextarea = document.querySelector('#companyChatForm textarea[name="message"]');

  if (!agent) {
    if (card) card.hidden = true;
    return;
  }

  const agentName = commercialAgentDisplayName(agent);
  if (card) card.hidden = false;
  if (nameEl) nameEl.textContent = agentName;

  const metaParts = ['Agent commercial HB Commerce'];
  if (agent.email) metaParts.push(agent.email);
  if (agent.phone) metaParts.push(agent.phone);
  if (metaEl) metaEl.textContent = metaParts.join(' · ');

  if (chatTab) chatTab.textContent = `Chat · ${agentName.split(' ')[0] || agentName}`;
  if (chatTitle) chatTitle.textContent = `Chat avec ${agentName}`;
  if (chatLabel) chatLabel.textContent = `Message à ${agentName}`;
  if (chatTextarea) chatTextarea.placeholder = `Écrivez à ${agentName}…`;

  const openChatBtn = document.getElementById('openAgentChatBtn');
  if (openChatBtn && openChatBtn.dataset.bound !== '1') {
    openChatBtn.dataset.bound = '1';
    openChatBtn.addEventListener('click', () => {
      document.querySelector('#compteTabs .admin-tab[data-tab="chat"]')?.click();
      document.getElementById('panel-chat')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
}

function renderTrackingSummary(order) {
  const deliveryLabel = DELIVERY_STATUS_LABELS[order.delivery_status || 'non_preparee'] || 'Non préparée';
  const tracking = order.tracking_url && order.tracking_number
    ? `<a href="${escapeHtml(order.tracking_url)}" target="_blank" rel="noopener">${escapeHtml(order.tracking_number)}</a>`
    : escapeHtml(order.tracking_number || '—');
  return `
    <div class="tracking-summary">
      <strong>${deliveryLabel}</strong>
      <small>Transporteur : ${escapeHtml(order.carrier || '—')}</small>
      <small>Suivi : ${tracking}</small>
      <small>Livraison estimée : ${formatDate(order.estimated_delivery_date)}</small>
      <small>Livrée le : ${formatDate(order.delivered_at)}</small>
      ${order.delivery_notes ? `<small>${escapeHtml(order.delivery_notes)}</small>` : ''}
    </div>
  `;
}

function bindInvoiceButtons(orders, profile) {
  document.querySelectorAll('[data-invoice]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const order = orders.find((o) => o.id === btn.dataset.invoice);
      if (order) downloadInvoice(order, profile);
    });
  });
}

function downloadInvoice(order, profile) {
  const invoiceNumber = `FAC-${new Date(order.created_at).getFullYear()}-${order.id.slice(0, 8).toUpperCase()}`;
  const rows = (order.order_items || []).map((item) => {
    const lineTotal = Number(item.unit_price) * Number(item.quantity);
    return `
      <tr>
        <td>${escapeHtml(item.product_name)}</td>
        <td>${item.quantity}</td>
        <td>${escapeHtml(item.unit || '')}</td>
        <td>${formatPrice(item.unit_price)}</td>
        <td>${formatPrice(lineTotal)}</td>
      </tr>
    `;
  }).join('');
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Facture ${invoiceNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #222; margin: 32px; }
    h1 { color: #0f3d32; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; }
    th, td { border-bottom: 1px solid #ddd; padding: 10px; text-align: left; }
    th { background: #f5f0e6; }
    .total { text-align: right; font-size: 1.2rem; font-weight: bold; margin-top: 24px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    small { color: #666; }
  </style>
</head>
<body>
  <h1>Facture ${invoiceNumber}</h1>
  <div class="grid">
    <section>
      <h2>HB Commerce</h2>
      <p>HB Groupe<br>France</p>
    </section>
    <section>
      <h2>Client</h2>
      <p>
        ${escapeHtml(profile.company || '')}<br>
        ${escapeHtml(profile.full_name || '')}<br>
        ${escapeHtml(profile.address || '')}<br>
        SIREN : ${escapeHtml(profile.siren || '—')}<br>
        TVA : ${escapeHtml(profile.vat_number || '—')}
      </p>
    </section>
  </div>
  <p><strong>Commande :</strong> #${order.id.slice(0, 8)}<br>
  <strong>Date :</strong> ${formatDate(order.created_at)}<br>
  <strong>Statut :</strong> ${ORDER_STATUS_LABELS[order.status] || order.status}</p>
  <table>
    <thead>
      <tr><th>Produit</th><th>Quantité</th><th>Unité</th><th>Prix unitaire</th><th>Total</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <p class="total">Total : ${formatPrice(order.total)}</p>
  <small>Document généré depuis l'espace client HB Commerce.</small>
</body>
</html>`;
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${invoiceNumber}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function chatStatusLabel(status) {
  if (status === 'pending') return 'En attente';
  if (status === 'rejected') return 'Rejeté';
  return 'Validé';
}

function chatAuthorLabel(msg, commercialAgent) {
  if (msg.author_role === 'client') return 'Votre société';
  if (msg.author_role === 'agent_commercial') return commercialAgentDisplayName(commercialAgent);
  if (msg.author_role === 'admin' || msg.author_role === 'super_root') return 'Administration HB Commerce';
  return 'HB Commerce';
}

function renderCompanyChat(messages, commercialAgent) {
  const host = document.getElementById('companyChatHistory');
  if (!host) return;

  if (!messages.length) {
    const agentName = commercialAgent ? commercialAgentDisplayName(commercialAgent) : 'HB Commerce';
    host.innerHTML = `<p class="empty-state">Aucun message pour le moment. Écrivez à ${escapeHtml(agentName)} ci-dessous.</p>`;
    return;
  }

  host.innerHTML = messages.map((msg) => `
    <article class="chat-message ${msg.author_role === 'client' ? 'from-client' : 'from-admin'}">
      <div class="chat-meta">
        <strong>${escapeHtml(chatAuthorLabel(msg, commercialAgent))}</strong>
        <span>${formatDate(msg.created_at)}</span>
        <span class="chat-status ${msg.status}">${chatStatusLabel(msg.status)}</span>
      </div>
      <p>${escapeHtml(msg.message)}</p>
    </article>
  `).join('');
  host.scrollTop = host.scrollHeight;
}

async function loadCompanyChat(session, commercialAgent) {
  if (typeof fetchChatMessages !== 'function') return;
  try {
    const messages = await fetchChatMessages(session.user.id);
    renderCompanyChat(messages, commercialAgent);
  } catch (err) {
    const host = document.getElementById('companyChatHistory');
    if (host) host.innerHTML = `<p class="empty-state">${escapeHtml(err.message)}</p>`;
    return;
  }

  document.getElementById('refreshChatBtn')?.addEventListener('click', async () => {
    try {
      renderCompanyChat(await fetchChatMessages(session.user.id), commercialAgent);
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
      renderCompanyChat(await fetchChatMessages(session.user.id), commercialAgent);
    } catch (err) {
      showAlert(note, err.message);
    }
  });
}

document.addEventListener('DOMContentLoaded', initDashboard);
