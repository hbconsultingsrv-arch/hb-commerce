const ORDER_STATUS_LABELS = {
  en_attente: 'En cours de validation',
  validee: 'Validée',
  en_attente_paiement: 'Validée — paiement à finaliser',
  payee: 'Payée',
  en_preparation: 'En préparation',
  expediee: 'Expédiée',
  livree: 'Livrée',
  annulee: 'Annulée'
};

const DELIVERY_STATUS_LABELS = {
  non_preparee: 'Non préparée',
  preparation: 'Préparation',
  prete: 'Prête à expédier',
  expediee: 'Expédiée',
  en_transit: 'En transit',
  livree: 'Livrée',
  incident: 'Incident livraison',
  retour: 'Retour'
};

async function getSession() {
  const sb = getSupabase();
  if (!sb) return null;
  const { data: { session } } = await sb.auth.getSession();
  return session;
}

async function requireAuth(redirectTo = 'login.html') {
  const session = await getSession();
  if (!session) {
    const page = window.location.pathname.split('/').pop() || 'compte.html';
    window.location.href = `${redirectTo}?redirect=${encodeURIComponent(page)}`;
    return null;
  }
  return session;
}

async function signIn(email, password) {
  const sb = getSupabase();
  if (!sb) throw new Error(configErrorMessage());
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

function getEmailConfirmRedirectUrl() {
  return new URL('login.html?confirmed=1', window.location.href).toString();
}

async function signUp({ email, password, fullName, phone, company, address, siren, vatNumber }) {
  const sb = getSupabase();
  if (!sb) throw new Error(configErrorMessage());
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getEmailConfirmRedirectUrl(),
      data: {
        full_name: fullName,
        phone,
        company: company || '',
        address: address || '',
        siren: siren || '',
        vat_number: vatNumber || '',
        role: 'pending_company'
      }
    }
  });
  if (error) throw error;
  return data;
}

async function signOut() {
  const sb = getSupabase();
  if (!sb) return;
  await sb.auth.signOut();
  window.location.href = 'index.html';
}

async function getProfile(userId) {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

function isAdminProfile(profile) {
  return profile?.role === 'admin' || profile?.role === 'super_root';
}

function isSuperRootProfile(profile) {
  return profile?.role === 'super_root';
}

function isCommercialAgentProfile(profile) {
  return profile?.role === 'agent_commercial';
}

function isCommercialAssignableProfile(profile) {
  return ['agent_commercial', 'admin', 'super_root'].includes(profile?.role);
}

function isSupplierProfile(profile) {
  return profile?.role === 'supplier';
}

function isBackofficeProfile(profile) {
  return isAdminProfile(profile) || isCommercialAgentProfile(profile);
}

async function getDefaultDashboardUrl(session) {
  if (!session?.user?.id) return 'compte.html';
  const profile = await getProfile(session.user.id);
  if (isSuperRootProfile(profile)) return 'super-root.html';
  if (isBackofficeProfile(profile)) return 'admin.html';
  if (isSupplierProfile(profile)) return 'supplier.html';
  return 'compte.html';
}

async function updateProfile(userId, fields) {
  const sb = getSupabase();
  if (!sb) throw new Error(configErrorMessage());
  const { data, error } = await sb
    .from('profiles')
    .update(fields)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatPrice(amount) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
}

const PRICE_MASK_TEXT = 'xx';
window.HB_CAN_VIEW_PRICES = false;

function canViewPrices() {
  return window.HB_CAN_VIEW_PRICES === true;
}

function formatDisplayPrice(amount) {
  return canViewPrices() ? formatPrice(amount) : PRICE_MASK_TEXT;
}

function formatDisplayUnitPrice(amount, unit) {
  return canViewPrices() ? `${formatPrice(amount)} / ${unit}` : PRICE_MASK_TEXT;
}

function applyPriceVisibility(root = document) {
  root.querySelectorAll('[data-private-price]').forEach((el) => {
    el.textContent = canViewPrices() ? el.dataset.privatePrice : PRICE_MASK_TEXT;
  });
}

async function refreshPriceVisibility(session = undefined) {
  const currentSession = session === undefined ? await getSession() : session;
  window.HB_CAN_VIEW_PRICES = !!currentSession;
  applyPriceVisibility();
  return canViewPrices();
}

function showAlert(el, message, type = 'error') {
  if (!el) return;
  let text = message;
  if (typeof text !== 'string') {
    text = typeof mapAuthError === 'function' ? mapAuthError(message) : (message?.message || 'Erreur inconnue.');
  }
  if (!text) {
    el.textContent = '';
    el.className = 'form-note';
    return;
  }
  el.textContent = text;
  el.className = `form-note ${type === 'success' ? 'success' : 'error'}`;
}

function activateSectionTabScope(scope, sectionId) {
  if (!scope || !sectionId) return;
  const tabBar = scope.querySelector('[data-section-tabs]');
  tabBar?.querySelectorAll('.section-tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.section === sectionId);
  });
  scope.querySelectorAll('[data-section-panel]').forEach((panel) => {
    panel.hidden = panel.dataset.sectionPanel !== sectionId;
  });
}

function activateSectionTab(scopeId, sectionId) {
  const scope = typeof scopeId === 'string' ? document.getElementById(scopeId) : scopeId;
  activateSectionTabScope(scope, sectionId);
}

function bindSectionTabs(root = document) {
  root.querySelectorAll('[data-section-tabs]').forEach((tabBar) => {
    if (tabBar.dataset.bound === '1') return;
    tabBar.dataset.bound = '1';
    const scope = tabBar.closest('[data-tab-scope]') || tabBar.parentElement;
    tabBar.querySelectorAll('.section-tab').forEach((tab) => {
      tab.addEventListener('click', () => activateSectionTabScope(scope, tab.dataset.section));
    });
  });
}

function bindDashboardTabs(tabSelector, panelPrefix = 'panel-') {
  document.querySelectorAll(tabSelector).forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll(tabSelector).forEach((t) => t.classList.remove('active'));
      document.querySelectorAll('.admin-panel').forEach((p) => { p.hidden = true; });
      tab.classList.add('active');
      const panel = document.getElementById(`${panelPrefix}${tab.dataset.tab}`);
      if (panel) panel.hidden = false;
    });
  });
}

function openAppModal(modalId) {
  const modal = typeof modalId === 'string' ? document.getElementById(modalId) : modalId;
  if (!modal) return;
  modal.hidden = false;
  document.body.classList.add('modal-open');
}

function closeAppModal(modalId) {
  const modal = typeof modalId === 'string' ? document.getElementById(modalId) : modalId;
  if (!modal) return;
  modal.hidden = true;
  if (!document.querySelector('.app-modal:not([hidden])')) {
    document.body.classList.remove('modal-open');
  }
}

function bindAppModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal || modal.dataset.bound === '1') return;
  modal.dataset.bound = '1';
  modal.querySelectorAll('[data-close-modal]').forEach((el) => {
    el.addEventListener('click', () => closeAppModal(modalId));
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.hidden) closeAppModal(modalId);
  });
}

async function updateNavAuth() {
  const loginLink = document.getElementById('navLogin');
  const accountLink = document.getElementById('navAccount');
  const trackingLink = document.getElementById('navTracking');
  const adminLink = document.getElementById('navAdmin');
  const logoutBtn = document.getElementById('navLogout');
  const cartBadge = document.getElementById('cartBadge');

  const session = await getSession();
  await refreshPriceVisibility(session);

  if (session) {
    if (loginLink) loginLink.style.display = 'none';
    if (accountLink) accountLink.style.display = '';
    if (trackingLink) trackingLink.style.display = '';
    if (logoutBtn) logoutBtn.style.display = '';
    if (adminLink) {
      let admin = false;
      if (typeof isAdmin === 'function') {
        admin = await isAdmin();
      }
      adminLink.style.display = admin ? '' : 'none';
    }
  } else {
    if (loginLink) loginLink.style.display = '';
    if (accountLink) accountLink.style.display = 'none';
    if (trackingLink) trackingLink.style.display = 'none';
    if (adminLink) adminLink.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'none';
  }

  if (cartBadge && typeof getCartCount === 'function') {
    const count = getCartCount();
    cartBadge.textContent = count;
    cartBadge.style.display = count > 0 ? '' : 'none';
  }

  logoutBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    signOut();
  }, { once: true });
}

function bindMobileNav() {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (!toggle || !links || toggle.dataset.bound === '1') return;

  toggle.dataset.bound = '1';
  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.classList.toggle('nav-open', open);
  });

  links.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      links.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('nav-open');
    });
  });
}

function bindPasswordToggles() {
  document.querySelectorAll('input[type="password"]').forEach((input) => {
    if (input.dataset.passwordToggleBound === '1') return;
    input.dataset.passwordToggleBound = '1';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'password-toggle';
    button.textContent = 'Afficher';
    button.setAttribute('aria-label', 'Afficher le mot de passe');

    button.addEventListener('click', () => {
      const visible = input.type === 'text';
      input.type = visible ? 'password' : 'text';
      button.textContent = visible ? 'Afficher' : 'Masquer';
      button.setAttribute('aria-label', visible ? 'Afficher le mot de passe' : 'Masquer le mot de passe');
    });

    input.insertAdjacentElement('afterend', button);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  bindMobileNav();
  bindPasswordToggles();
  updateNavAuth();
});
