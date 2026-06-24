/**
 * API Négociation commerciale B2B — Supabase + localStorage
 */

const NEG_LOCAL_KEY = 'hb_negotiations';
const NEG_MSG_KEY = 'hb_negotiation_messages';
const NEG_RULES_KEY = 'hb_negotiation_rules';

const NEGOTIATION_STATUS_LABELS = {
  en_attente: 'En attente',
  en_discussion: 'En discussion',
  offre_envoyee: 'Offre envoyée',
  acceptee: 'Acceptée',
  refusee: 'Refusée',
  expiree: 'Expirée'
};

const NEGOTIATION_OFFER_LABELS = {
  standard: 'Prix standard',
  negotiated: 'Prix négocié',
  percent: 'Remise en %',
  fixed: 'Remise fixe',
  special: 'Offre spéciale'
};

function negRead(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}

function negWrite(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function negNow() { return new Date().toISOString(); }

function formatNegotiationRef(createdAt, index) {
  const d = new Date(createdAt);
  const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
  return `NEG-${ym}-${String(index).padStart(5, '0')}`;
}

function seedDefaultRules() {
  if (negRead(NEG_RULES_KEY).length) return;
  negWrite(NEG_RULES_KEY, [
    { id: crypto.randomUUID(), label: 'Volume standard', min_quantity: 0, max_quantity: 499.99, discount_percent: 0, requires_approval: false, active: true, sort_order: 1 },
    { id: crypto.randomUUID(), label: 'À partir de 500 L', min_quantity: 500, max_quantity: 999.99, discount_percent: 3, requires_approval: false, active: true, sort_order: 2 },
    { id: crypto.randomUUID(), label: 'À partir de 1 000 L', min_quantity: 1000, max_quantity: 4999.99, discount_percent: 5, requires_approval: false, active: true, sort_order: 3 },
    { id: crypto.randomUUID(), label: 'Gros volume 5 000 L+', min_quantity: 5000, max_quantity: null, discount_percent: 8, requires_approval: true, active: true, sort_order: 4 }
  ]);
}

async function fetchNegotiationRules() {
  seedDefaultRules();
  const sb = getSupabase();
  if (!sb) return negRead(NEG_RULES_KEY).filter((r) => r.active !== false);
  const { data, error } = await sb.from('negotiation_discount_rules').select('*').eq('active', true).order('sort_order');
  if (error || !data?.length) return negRead(NEG_RULES_KEY).filter((r) => r.active !== false);
  negWrite(NEG_RULES_KEY, data);
  return data;
}

async function upsertNegotiationRule(payload, id = null) {
  const sb = getSupabase();
  if (!sb) {
    const rules = negRead(NEG_RULES_KEY);
    if (id) {
      const i = rules.findIndex((r) => r.id === id);
      if (i >= 0) rules[i] = { ...rules[i], ...payload, updated_at: negNow() };
    } else {
      rules.push({ id: crypto.randomUUID(), ...payload, active: true, created_at: negNow(), updated_at: negNow() });
    }
    negWrite(NEG_RULES_KEY, rules);
    return;
  }
  if (id) {
    const { data, error } = await sb.from('negotiation_discount_rules').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await sb.from('negotiation_discount_rules').insert(payload).select().single();
  if (error) throw error;
  return data;
}

async function deleteNegotiationRule(id) {
  const sb = getSupabase();
  if (!sb) {
    negWrite(NEG_RULES_KEY, negRead(NEG_RULES_KEY).filter((r) => r.id !== id));
    return;
  }
  const { error } = await sb.from('negotiation_discount_rules').delete().eq('id', id);
  if (error) throw error;
}

function evaluateAutoRules(quantity, catalogPrice, rules) {
  const qty = Number(quantity) || 0;
  const price = Number(catalogPrice) || 0;
  const sorted = [...rules].sort((a, b) => (b.min_quantity || 0) - (a.min_quantity || 0));
  const match = sorted.find((r) => {
    if (r.active === false) return false;
    const min = Number(r.min_quantity) || 0;
    const max = r.max_quantity != null ? Number(r.max_quantity) : Infinity;
    return qty >= min && qty <= max;
  });
  if (!match || !match.discount_percent) {
    return { rule: null, discountPercent: 0, proposedPrice: price, requiresApproval: false, savings: 0 };
  }
  const pct = Number(match.discount_percent);
  const proposed = Math.round(price * (1 - pct / 100) * 100) / 100;
  return {
    rule: match,
    discountPercent: pct,
    proposedPrice: proposed,
    requiresApproval: !!match.requires_approval,
    savings: Math.round((price - proposed) * 100) / 100
  };
}

async function fetchNegotiations({ clientId = null, status = null } = {}) {
  const sb = getSupabase();
  if (!sb) {
    let items = negRead(NEG_LOCAL_KEY);
    if (clientId) items = items.filter((n) => n.client_id === clientId);
    if (status) items = items.filter((n) => n.status === status);
    return items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
  let q = sb.from('negotiations').select('*, client:profiles!negotiations_client_id_fkey(company, full_name, email)').order('created_at', { ascending: false });
  if (clientId) q = q.eq('client_id', clientId);
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) {
    console.warn(error.message);
    return negRead(NEG_LOCAL_KEY);
  }
  if (data?.length) negWrite(NEG_LOCAL_KEY, data);
  return data || [];
}

async function createNegotiation(payload) {
  const rules = await fetchNegotiationRules();
  const auto = evaluateAutoRules(payload.quantity, payload.catalog_price, rules);
  const sb = getSupabase();
  const now = negNow();
  const all = negRead(NEG_LOCAL_KEY);
  const ref = formatNegotiationRef(now, all.length + 1);

  const base = {
    ref,
    client_id: payload.client_id,
    product_id: payload.product_id || null,
    product_name: payload.product_name,
    product_slug: payload.product_slug || null,
    catalog_price: Number(payload.catalog_price),
    quantity: Number(payload.quantity),
    unit: payload.unit || 'unité',
    client_proposed_price: payload.client_proposed_price != null ? Number(payload.client_proposed_price) : null,
    commercial_proposed_price: null,
    discount_percent: null,
    discount_fixed: null,
    offer_type: 'standard',
    status: 'en_attente',
    message: payload.message || '',
    created_at: now,
    updated_at: now
  };

  if (auto.rule && auto.discountPercent > 0) {
    if (auto.requiresApproval) {
      base.status = 'en_attente';
      base.message = (base.message ? base.message + '\n\n' : '') + `[Système] Volume élevé — validation commerciale requise (règle : ${auto.rule.label}).`;
    } else {
      base.commercial_proposed_price = auto.proposedPrice;
      base.discount_percent = auto.discountPercent;
      base.offer_type = 'percent';
      base.status = 'offre_envoyee';
      base.expires_at = new Date(Date.now() + 14 * 86400000).toISOString();
    }
  } else {
    base.status = 'en_discussion';
  }

  if (!sb) {
    const row = { id: crypto.randomUUID(), ...base };
    all.unshift(row);
    negWrite(NEG_LOCAL_KEY, all);
    await sendNegotiationMessage({
      negotiation_id: row.id,
      author_id: payload.client_id,
      author_role: 'client',
      message: payload.message || `Demande de négociation pour ${payload.quantity} ${payload.unit} de ${payload.product_name}.`
    });
    if (base.status === 'offre_envoyee') {
      await sendNegotiationMessage({
        negotiation_id: row.id,
        author_id: null,
        author_role: 'system',
        message: `Offre automatique : remise de ${auto.discountPercent} % — prix proposé ${formatPrice(auto.proposedPrice)}/${payload.unit} (économie ${formatPrice(auto.savings)}).`,
        offer_snapshot: { catalog_price: base.catalog_price, proposed_price: auto.proposedPrice, discount_percent: auto.discountPercent }
      });
    }
    return row;
  }

  const { data, error } = await sb.from('negotiations').insert(base).select().single();
  if (error) throw error;
  await sendNegotiationMessage({
    negotiation_id: data.id,
    author_id: payload.client_id,
    author_role: 'client',
    message: payload.message || `Demande pour ${payload.quantity} ${payload.unit}.`
  });
  if (base.status === 'offre_envoyee') {
    await sendNegotiationMessage({
      negotiation_id: data.id,
      author_id: null,
      author_role: 'system',
      message: `Remise automatique ${auto.discountPercent} % — ${formatPrice(auto.proposedPrice)}/${payload.unit}.`,
      offer_snapshot: { catalog_price: base.catalog_price, proposed_price: auto.proposedPrice, discount_percent: auto.discountPercent }
    });
  }
  return data;
}

async function updateNegotiation(id, fields) {
  const sb = getSupabase();
  if (!sb) {
    const items = negRead(NEG_LOCAL_KEY);
    const i = items.findIndex((n) => n.id === id);
    if (i >= 0) items[i] = { ...items[i], ...fields, updated_at: negNow() };
    negWrite(NEG_LOCAL_KEY, items);
    return items[i];
  }
  const { data, error } = await sb.from('negotiations').update(fields).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

async function sendCommercialOffer(negotiationId, offer, authorId) {
  const { offer_type, commercial_proposed_price, discount_percent, discount_fixed, message } = offer;
  const neg = (await fetchNegotiations()).find((n) => n.id === negotiationId);
  if (!neg) throw new Error('Négociation introuvable');

  let proposed = commercial_proposed_price;
  if (offer_type === 'percent' && discount_percent) {
    proposed = Math.round(neg.catalog_price * (1 - discount_percent / 100) * 100) / 100;
  } else if (offer_type === 'fixed' && discount_fixed) {
    proposed = Math.max(0, neg.catalog_price - discount_fixed);
  }

  const updated = await updateNegotiation(negotiationId, {
    offer_type: offer_type || 'negotiated',
    commercial_proposed_price: proposed,
    discount_percent: discount_percent || null,
    discount_fixed: discount_fixed || null,
    status: 'offre_envoyee',
    expires_at: new Date(Date.now() + 14 * 86400000).toISOString()
  });

  const savings = neg.catalog_price - proposed;
  const pct = neg.catalog_price ? Math.round((savings / neg.catalog_price) * 1000) / 10 : 0;

  await sendNegotiationMessage({
    negotiation_id: negotiationId,
    author_id: authorId,
    author_role: 'commercial',
    message: message || `Offre commerciale : ${formatPrice(proposed)}/${neg.unit} (catalogue ${formatPrice(neg.catalog_price)} — économie ${pct} %).`,
    offer_snapshot: {
      catalog_price: neg.catalog_price,
      proposed_price: proposed,
      discount_percent: pct,
      offer_type
    }
  });

  return updated;
}

async function acceptNegotiationOffer(negotiationId, clientId) {
  const negotiations = await fetchNegotiations();
  const neg = negotiations.find((n) => n.id === negotiationId);
  if (!neg) throw new Error('Négociation introuvable');
  if (neg.client_id !== clientId) throw new Error('Non autorisé');
  if (!['offre_envoyee', 'en_discussion'].includes(neg.status)) {
    throw new Error('Aucune offre à accepter');
  }

  const price = neg.commercial_proposed_price || neg.client_proposed_price || neg.catalog_price;
  const quoteHtml = generateNegotiationQuoteHtml(neg, price);

  const updated = await updateNegotiation(negotiationId, {
    status: 'acceptee',
    accepted_at: negNow(),
    commercial_proposed_price: price,
    quote_html: quoteHtml
  });

  await sendNegotiationMessage({
    negotiation_id: negotiationId,
    author_id: clientId,
    author_role: 'client',
    message: 'Offre acceptée. Merci de convertir en commande.'
  });

  return updated;
}

async function refuseNegotiationOffer(negotiationId, clientId, reason = '') {
  await updateNegotiation(negotiationId, { status: 'refusee' });
  await sendNegotiationMessage({
    negotiation_id: negotiationId,
    author_id: clientId,
    author_role: 'client',
    message: reason || 'Offre refusée.'
  });
}

async function convertNegotiationToOrder(negotiationId, clientId, profile) {
  const negotiations = await fetchNegotiations();
  const neg = negotiations.find((n) => n.id === negotiationId);
  if (!neg || neg.status !== 'acceptee') throw new Error('La négociation doit être acceptée');
  if (neg.order_id) return neg;

  const unitPrice = neg.commercial_proposed_price || neg.catalog_price;
  const total = Math.round(unitPrice * neg.quantity * 100) / 100;

  if (typeof createOrder !== 'function') {
    throw new Error('Création de commande indisponible');
  }

  const order = await createOrder({
    userId: clientId,
    items: [{
      id: neg.product_id,
      name: neg.product_name,
      quantity: neg.quantity,
      price: unitPrice,
      unit: neg.unit
    }],
    total,
    paymentMethod: 'virement',
    notes: `Commande issue négociation ${neg.ref}`,
    shippingAddress: profile?.address || '',
    estimatedDeliveryDate: null
  });

  await updateNegotiation(negotiationId, { order_id: order.id });
  await sendNegotiationMessage({
    negotiation_id: negotiationId,
    author_id: clientId,
    author_role: 'system',
    message: `Commande #${order.id.slice(0, 8)} créée avec le prix négocié ${formatPrice(unitPrice)}/${neg.unit}.`
  });

  return order;
}

function generateNegotiationQuoteHtml(neg, negotiatedPrice) {
  const savings = neg.catalog_price - negotiatedPrice;
  const pct = neg.catalog_price ? Math.round((savings / neg.catalog_price) * 1000) / 10 : 0;
  const total = negotiatedPrice * neg.quantity;
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Devis ${neg.ref}</title>
<style>body{font-family:Georgia,serif;padding:32px;color:#1e3320}h1{color:#3d5c3a}.grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}.price-old{text-decoration:line-through;color:#888}.price-new{font-size:1.4rem;color:#c9a227;font-weight:bold}</style></head>
<body><h1>HB Commerce — Devis négocié</h1><p><strong>${neg.ref}</strong> · ${formatDate(negNow())}</p>
<div class="grid"><div><h2>Produit</h2><p>${escapeHtml(neg.product_name)}<br>Quantité : ${neg.quantity} ${escapeHtml(neg.unit)}</p></div>
<div><h2>Tarification</h2><p>Catalogue : <span class="price-old">${formatPrice(neg.catalog_price)}</span> / ${escapeHtml(neg.unit)}<br>
Négocié : <span class="price-new">${formatPrice(negotiatedPrice)}</span> / ${escapeHtml(neg.unit)}<br>Économie : ${pct} %<br><strong>Total : ${formatPrice(total)}</strong></p></div></div>
<small>Devis généré par HB Commerce — valable 14 jours.</small></body></html>`;
}

function downloadNegotiationQuote(neg) {
  const price = neg.commercial_proposed_price || neg.catalog_price;
  const html = neg.quote_html || generateNegotiationQuoteHtml(neg, price);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `devis-${neg.ref}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function fetchNegotiationMessages(negotiationId) {
  const sb = getSupabase();
  if (!sb) {
    return negRead(NEG_MSG_KEY)
      .filter((m) => m.negotiation_id === negotiationId)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }
  const { data, error } = await sb
    .from('negotiation_messages')
    .select('*')
    .eq('negotiation_id', negotiationId)
    .order('created_at', { ascending: true });
  if (error) return negRead(NEG_MSG_KEY).filter((m) => m.negotiation_id === negotiationId);
  return data || [];
}

async function sendNegotiationMessage({ negotiation_id, author_id, author_role, message, attachment_url, attachment_name, offer_snapshot }) {
  const row = {
    id: crypto.randomUUID(),
    negotiation_id,
    author_id,
    author_role,
    message,
    attachment_url: attachment_url || null,
    attachment_name: attachment_name || null,
    offer_snapshot: offer_snapshot || null,
    created_at: negNow()
  };
  const sb = getSupabase();
  if (!sb) {
    const msgs = negRead(NEG_MSG_KEY);
    msgs.push(row);
    negWrite(NEG_MSG_KEY, msgs);
    const negs = negRead(NEG_LOCAL_KEY);
    const i = negs.findIndex((n) => n.id === negotiation_id);
    if (i >= 0 && author_role === 'client') negs[i].status = 'en_discussion';
    negWrite(NEG_LOCAL_KEY, negs);
    return row;
  }
  const { data, error } = await sb.from('negotiation_messages').insert({
    negotiation_id, author_id, author_role, message,
    attachment_url, attachment_name, offer_snapshot
  }).select().single();
  if (error) throw error;
  if (author_role === 'client') {
    await updateNegotiation(negotiation_id, { status: 'en_discussion' });
  }
  return data;
}

function computeNegotiationStats(negotiations) {
  const total = negotiations.length;
  const active = negotiations.filter((n) => ['en_attente', 'en_discussion', 'offre_envoyee'].includes(n.status)).length;
  const accepted = negotiations.filter((n) => n.status === 'acceptee');
  const refused = negotiations.filter((n) => n.status === 'refusee');
  const withOffer = negotiations.filter((n) => n.commercial_proposed_price != null);
  const acceptanceRate = withOffer.length
    ? Math.round((accepted.length / withOffer.length) * 100)
    : 0;

  let revenue = 0;
  let totalDiscount = 0;
  accepted.forEach((n) => {
    const price = n.commercial_proposed_price || n.catalog_price;
    revenue += price * n.quantity;
    totalDiscount += (n.catalog_price - price) * n.quantity;
  });

  const avgDiscount = accepted.length
    ? Math.round((totalDiscount / accepted.length) * 100) / 100
    : 0;

  const byClient = {};
  negotiations.forEach((n) => {
    const key = n.client_id;
    byClient[key] = (byClient[key] || 0) + 1;
  });
  const topClients = Object.entries(byClient)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return { total, active, accepted: accepted.length, refused: refused.length, acceptanceRate, revenue, avgDiscount, topClients };
}

window.NEGOTIATION_STATUS_LABELS = NEGOTIATION_STATUS_LABELS;
window.NEGOTIATION_OFFER_LABELS = NEGOTIATION_OFFER_LABELS;
window.fetchNegotiationRules = fetchNegotiationRules;
window.upsertNegotiationRule = upsertNegotiationRule;
window.deleteNegotiationRule = deleteNegotiationRule;
window.evaluateAutoRules = evaluateAutoRules;
window.fetchNegotiations = fetchNegotiations;
window.createNegotiation = createNegotiation;
window.updateNegotiation = updateNegotiation;
window.sendCommercialOffer = sendCommercialOffer;
window.acceptNegotiationOffer = acceptNegotiationOffer;
window.refuseNegotiationOffer = refuseNegotiationOffer;
window.convertNegotiationToOrder = convertNegotiationToOrder;
window.generateNegotiationQuoteHtml = generateNegotiationQuoteHtml;
window.downloadNegotiationQuote = downloadNegotiationQuote;
window.fetchNegotiationMessages = fetchNegotiationMessages;
window.sendNegotiationMessage = sendNegotiationMessage;
window.computeNegotiationStats = computeNegotiationStats;
