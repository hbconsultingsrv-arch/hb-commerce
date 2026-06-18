const ORDER_STATUS_LABELS = {
  en_attente: 'En attente',
  validee: 'Validée',
  en_attente_paiement: 'En attente de paiement',
  payee: 'Payée',
  en_preparation: 'En préparation',
  expediee: 'Expédiée',
  livree: 'Livrée',
  annulee: 'Annulée'
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
        vat_number: vatNumber || ''
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

async function getDefaultDashboardUrl(session) {
  if (!session?.user?.id) return 'compte.html';
  const profile = await getProfile(session.user.id);
  if (isSuperRootProfile(profile)) return 'super-root.html';
  if (isAdminProfile(profile)) return 'admin.html';
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
  el.textContent = message;
  el.className = `form-note ${type === 'success' ? 'success' : 'error'}`;
}

async function updateNavAuth() {
  const loginLink = document.getElementById('navLogin');
  const accountLink = document.getElementById('navAccount');
  const adminLink = document.getElementById('navAdmin');
  const logoutBtn = document.getElementById('navLogout');
  const cartBadge = document.getElementById('cartBadge');

  const session = await getSession();
  await refreshPriceVisibility(session);

  if (session) {
    if (loginLink) loginLink.style.display = 'none';
    if (accountLink) accountLink.style.display = '';
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

document.addEventListener('DOMContentLoaded', () => {
  bindMobileNav();
  updateNavAuth();
});
