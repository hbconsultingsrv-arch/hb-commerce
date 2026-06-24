/**
 * Page négociations — liste, messagerie, dashboard commercial, règles
 */

let negState = {
  session: null,
  profile: null,
  isBackoffice: false,
  negotiations: [],
  selectedId: null,
  pollTimer: null
};

function bindNegTabs() {
  document.querySelectorAll('#negTabs .admin-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#negTabs .admin-tab').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.admin-panel').forEach((p) => { p.hidden = true; });
      const panel = document.getElementById(`panel-${btn.dataset.tab}`);
      if (panel) panel.hidden = false;
      if (btn.dataset.tab === 'dashboard') renderNegDashboard();
      if (btn.dataset.tab === 'regles') renderNegRules();
      if (btn.dataset.tab === 'messages') renderFullMessaging();
    });
  });
}

function renderNegTable() {
  const body = document.getElementById('negTableBody');
  const statusFilter = document.getElementById('negFilterStatus')?.value || '';
  if (!body) return;

  let items = [...negState.negotiations];
  if (!negState.isBackoffice) {
    items = items.filter((n) => n.client_id === negState.session.user.id);
  }
  if (statusFilter) items = items.filter((n) => n.status === statusFilter);

  if (!items.length) {
    body.innerHTML = '<tr><td colspan="9" class="empty-state">Aucune négociation.</td></tr>';
    return;
  }

  body.innerHTML = items.map((n) => {
    const clientLabel = n.client?.company || n.client?.full_name || '—';
    const proposed = n.commercial_proposed_price != null ? formatPrice(n.commercial_proposed_price) : '—';
    const requested = n.client_proposed_price != null ? formatPrice(n.client_proposed_price) : '—';
    const active = n.id === negState.selectedId ? ' style="background:rgba(201,162,39,0.08)"' : '';
    return `
      <tr data-neg-id="${n.id}" class="neg-row"${active}>
        <td><strong>${escapeHtml(n.ref)}</strong></td>
        <td class="col-client" ${negState.isBackoffice ? '' : 'hidden'}>${escapeHtml(clientLabel)}</td>
        <td>${escapeHtml(n.product_name)}</td>
        <td>${n.quantity} ${escapeHtml(n.unit)}</td>
        <td>${requested}</td>
        <td>${proposed}</td>
        <td><span class="neg-status ${n.status}">${NEGOTIATION_STATUS_LABELS[n.status]}</span></td>
        <td>${formatDate(n.created_at)}</td>
        <td>
          <button type="button" class="btn btn-sm btn-outline-dark" data-neg-open="${n.id}">Ouvrir</button>
          ${n.status === 'offre_envoyee' && n.client_id === negState.session.user.id ? `
            <button type="button" class="btn btn-sm btn-primary" data-neg-accept="${n.id}">Accepter</button>
            <button type="button" class="btn btn-sm btn-outline-dark" data-neg-refuse="${n.id}">Refuser</button>
          ` : ''}
          ${n.status === 'acceptee' && !n.order_id && n.client_id === negState.session.user.id ? `
            <button type="button" class="btn btn-sm btn-primary" data-neg-order="${n.id}">Commander</button>
            <button type="button" class="btn btn-sm btn-outline-dark" data-neg-quote="${n.id}">Devis PDF</button>
          ` : ''}
        </td>
      </tr>
    `;
  }).join('');

  if (negState.isBackoffice) {
    document.querySelectorAll('.col-client').forEach((el) => { el.hidden = false; });
  }

  body.querySelectorAll('[data-neg-open]').forEach((btn) => {
    btn.addEventListener('click', () => selectNegotiation(btn.dataset.negOpen));
  });
  body.querySelectorAll('[data-neg-accept]').forEach((btn) => {
    btn.addEventListener('click', () => handleAccept(btn.dataset.negAccept));
  });
  body.querySelectorAll('[data-neg-refuse]').forEach((btn) => {
    btn.addEventListener('click', () => handleRefuse(btn.dataset.negRefuse));
  });
  body.querySelectorAll('[data-neg-order]').forEach((btn) => {
    btn.addEventListener('click', () => handleConvertOrder(btn.dataset.negOrder));
  });
  body.querySelectorAll('[data-neg-quote]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const n = negState.negotiations.find((x) => x.id === btn.dataset.negQuote);
      if (n) downloadNegotiationQuote(n);
    });
  });
  body.querySelectorAll('.neg-row').forEach((row) => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      selectNegotiation(row.dataset.negId);
    });
  });
}

function renderMessageBubble(msg) {
  const roleClass = `from-${msg.author_role}`;
  const author = msg.author_role === 'client' ? 'Vous' : (msg.author_role === 'system' ? 'HB Commerce' : 'Commercial');
  let offerHtml = '';
  if (msg.offer_snapshot) {
    const o = msg.offer_snapshot;
    offerHtml = `<div class="neg-offer-card">
      Catalogue : ${formatPrice(o.catalog_price)} → <strong>${formatPrice(o.proposed_price)}</strong>
      ${o.discount_percent ? ` (−${o.discount_percent} %)` : ''}
    </div>`;
  }
  let attach = '';
  if (msg.attachment_name) {
    attach = `<p><a href="${escapeHtml(msg.attachment_url || '#')}" target="_blank">📎 ${escapeHtml(msg.attachment_name)}</a></p>`;
  }
  return `
    <div class="neg-message ${roleClass}">
      <div class="neg-message-meta">${author} · ${formatDateTime(msg.created_at)}</div>
      <p>${escapeHtml(msg.message)}</p>
      ${offerHtml}
      ${attach}
    </div>
  `;
}

async function selectNegotiation(id) {
  negState.selectedId = id;
  const neg = negState.negotiations.find((n) => n.id === id);
  if (!neg) return;

  document.getElementById('negSelectedTitle').textContent = `${neg.ref} — ${neg.product_name}`;
  document.getElementById('negSideCompose').hidden = false;

  const offerPanel = document.getElementById('negCommercialOffer');
  if (offerPanel) offerPanel.hidden = !negState.isBackoffice;

  const msgs = await fetchNegotiationMessages(id);
  const host = document.getElementById('negSideMessages');
  host.innerHTML = msgs.length
    ? msgs.map(renderMessageBubble).join('')
    : '<p class="empty-state">Aucun message.</p>';
  host.scrollTop = host.scrollHeight;

  renderNegTable();
}

async function handleSideSend() {
  const input = document.getElementById('negSideInput');
  const fileInput = document.getElementById('negSideFile');
  if (!negState.selectedId || !input?.value.trim()) return;

  let attachment_url = null;
  let attachment_name = null;
  if (fileInput?.files?.[0]) {
    attachment_name = fileInput.files[0].name;
    attachment_url = `#local-${attachment_name}`;
  }

  const role = negState.isBackoffice ? 'commercial' : 'client';
  await sendNegotiationMessage({
    negotiation_id: negState.selectedId,
    author_id: negState.session.user.id,
    author_role: role,
    message: input.value.trim(),
    attachment_url,
    attachment_name
  });

  input.value = '';
  if (fileInput) fileInput.value = '';
  await reloadNegotiations();
  selectNegotiation(negState.selectedId);
}

async function handleAccept(id) {
  try {
    await acceptNegotiationOffer(id, negState.session.user.id);
    await reloadNegotiations();
    alert('Offre acceptée. Vous pouvez télécharger le devis et passer commande.');
  } catch (err) {
    alert(err.message);
  }
}

async function handleRefuse(id) {
  const reason = prompt('Motif du refus (optionnel) :');
  try {
    await refuseNegotiationOffer(id, negState.session.user.id, reason || '');
    await reloadNegotiations();
  } catch (err) {
    alert(err.message);
  }
}

async function handleConvertOrder(id) {
  try {
    const order = await convertNegotiationToOrder(id, negState.session.user.id, negState.profile);
    await reloadNegotiations();
    if (confirm(`Commande #${order.id.slice(0, 8)} créée. Voir le suivi ?`)) {
      window.location.href = 'suivi-commande.html';
    }
  } catch (err) {
    alert(err.message);
  }
}

function renderNegDashboard() {
  const stats = computeNegotiationStats(negState.negotiations);
  const grid = document.getElementById('negKpiGrid');
  if (!grid) return;

  grid.innerHTML = `
    <div class="neg-kpi-card"><div class="neg-kpi-label">En cours</div><div class="neg-kpi-value">${stats.active}</div></div>
    <div class="neg-kpi-card neg-kpi-card--accent"><div class="neg-kpi-label">Taux d'acceptation</div><div class="neg-kpi-value">${stats.acceptanceRate}%</div></div>
    <div class="neg-kpi-card"><div class="neg-kpi-label">CA négocié</div><div class="neg-kpi-value">${formatPrice(stats.revenue)}</div></div>
    <div class="neg-kpi-card"><div class="neg-kpi-label">Remise moyenne</div><div class="neg-kpi-value">${formatPrice(stats.avgDiscount)}</div></div>
    <div class="neg-kpi-card"><div class="neg-kpi-label">Acceptées</div><div class="neg-kpi-value">${stats.accepted}</div></div>
    <div class="neg-kpi-card"><div class="neg-kpi-label">Refusées</div><div class="neg-kpi-value">${stats.refused}</div></div>
  `;

  const topHost = document.getElementById('negTopClients');
  if (topHost) {
    topHost.innerHTML = stats.topClients.map(([id, count]) => {
      const neg = negState.negotiations.find((n) => n.client_id === id);
      const label = neg?.client?.company || id.slice(0, 8);
      return `<div class="qa-bar-row"><span>${escapeHtml(label)}</span><div class="qa-bar-track"><div class="qa-bar-fill qa-bar-fill--cover" style="width:${count * 20}%"></div></div><strong>${count}</strong></div>`;
    }).join('') || '<p class="empty-state">Aucune donnée</p>';
  }
}

async function renderNegRules() {
  const rules = await fetchNegotiationRules();
  const body = document.getElementById('negRulesBody');
  if (!body) return;

  body.innerHTML = rules.map((r) => `
    <tr data-rule-id="${r.id}">
      <td><input type="text" value="${escapeHtml(r.label)}" data-field="label"></td>
      <td><input type="number" value="${r.min_quantity}" data-field="min_quantity" step="1"></td>
      <td><input type="number" value="${r.max_quantity ?? ''}" data-field="max_quantity" step="1" placeholder="∞"></td>
      <td><input type="number" value="${r.discount_percent}" data-field="discount_percent" step="0.1"></td>
      <td><input type="checkbox" data-field="requires_approval" ${r.requires_approval ? 'checked' : ''}></td>
      <td>
        <button type="button" class="btn btn-sm btn-primary" data-save-rule="${r.id}">OK</button>
        <button type="button" class="btn btn-sm btn-outline-dark" data-del-rule="${r.id}">Suppr.</button>
      </td>
    </tr>
  `).join('');

  body.querySelectorAll('[data-save-rule]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const row = btn.closest('tr');
      const payload = {};
      row.querySelectorAll('[data-field]').forEach((el) => {
        const f = el.dataset.field;
        payload[f] = el.type === 'checkbox' ? el.checked : (el.value === '' && f === 'max_quantity' ? null : el.value);
      });
      await upsertNegotiationRule(payload, btn.dataset.saveRule);
      await renderNegRules();
    });
  });

  body.querySelectorAll('[data-del-rule]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Supprimer cette règle ?')) return;
      await deleteNegotiationRule(btn.dataset.delRule);
      await renderNegRules();
    });
  });
}

async function renderFullMessaging() {
  const host = document.getElementById('negFullMessaging');
  if (!host) return;
  const allMsgs = [];
  for (const n of negState.negotiations.slice(0, 20)) {
    const msgs = await fetchNegotiationMessages(n.id);
    msgs.forEach((m) => allMsgs.push({ ...m, negRef: n.ref }));
  }
  allMsgs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  host.innerHTML = allMsgs.length
    ? allMsgs.map((m) => `<div><small><strong>${escapeHtml(m.negRef)}</strong></small>${renderMessageBubble(m)}</div>`).join('')
    : '<p class="empty-state">Aucun message.</p>';
  host.scrollTop = host.scrollHeight;
}

async function reloadNegotiations() {
  negState.negotiations = await fetchNegotiations(
    negState.isBackoffice ? {} : { clientId: negState.session.user.id }
  );
  renderNegTable();
}

function populateStatusFilter() {
  const sel = document.getElementById('negFilterStatus');
  if (!sel || sel.options.length > 1) return;
  Object.entries(NEGOTIATION_STATUS_LABELS).forEach(([k, v]) => {
    sel.innerHTML += `<option value="${k}">${v}</option>`;
  });
  sel.addEventListener('change', renderNegTable);
}

async function initNegotiationPage() {
  const session = await requireAuth();
  if (!session) return;

  negState.session = session;
  negState.profile = await getProfile(session.user.id);
  negState.isBackoffice = await isAdmin() || negState.profile?.role === 'agent_commercial';

  if (negState.isBackoffice) {
    document.querySelectorAll('.admin-only-tab').forEach((el) => { el.hidden = false; });
    const adminLink = document.getElementById('negAdminLink');
    if (adminLink) adminLink.style.display = '';
    document.querySelector('#negTabs .admin-tab').textContent = 'Toutes les négociations';
  }

  bindNegTabs();
  populateStatusFilter();
  document.getElementById('logoutBtn')?.addEventListener('click', signOut);
  document.getElementById('negSideSend')?.addEventListener('click', handleSideSend);
  document.getElementById('addRuleBtn')?.addEventListener('click', async () => {
    await upsertNegotiationRule({
      label: 'Nouvelle règle',
      min_quantity: 0,
      max_quantity: null,
      discount_percent: 0,
      requires_approval: false,
      sort_order: 99
    });
    await renderNegRules();
  });

  document.getElementById('offerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!negState.selectedId) return;
    const fd = new FormData(e.target);
    try {
      await sendCommercialOffer(negState.selectedId, {
        offer_type: fd.get('offer_type'),
        commercial_proposed_price: fd.get('commercial_proposed_price') || null,
        discount_percent: fd.get('discount_percent') || null,
        message: fd.get('message')
      }, negState.session.user.id);
      await reloadNegotiations();
      selectNegotiation(negState.selectedId);
      e.target.reset();
    } catch (err) {
      alert(err.message);
    }
  });

  await reloadNegotiations();

  negState.pollTimer = setInterval(async () => {
    if (negState.selectedId) {
      await reloadNegotiations();
      selectNegotiation(negState.selectedId);
    }
  }, 20000);
}

document.addEventListener('DOMContentLoaded', initNegotiationPage);
