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
  if (sb) await sb.auth.signOut();
  clearSessionUserDisplay();
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

function isDriverProfile(profile) {
  return profile?.role === 'livreur';
}

function isBackofficeProfile(profile) {
  return isAdminProfile(profile) || isCommercialAgentProfile(profile);
}

async function getDefaultDashboardUrl(session) {
  if (!session?.user?.id) return 'compte.html';
  const profile = await getProfile(session.user.id);
  if (isSuperRootProfile(profile)) return 'super-root.html';
  if (isAdminProfile(profile)) return 'admin.html';
  if (isCommercialAgentProfile(profile)) return 'agent.html';
  if (isSupplierProfile(profile)) return 'supplier.html';
  if (isDriverProfile(profile)) return 'livreur.html';
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

function profileDisplayName(profile, session) {
  return (profile?.full_name || profile?.company || session?.user?.email || 'Utilisateur').trim();
}

function profileInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function resolveProfileAvatarUrl(profile, session) {
  const url = (profile?.avatar_url || session?.user?.user_metadata?.avatar_url || '').trim();
  return url || null;
}

function buildUserAvatarHtml(profile, session, sizeClass = '') {
  const name = profileDisplayName(profile, session);
  const avatarUrl = resolveProfileAvatarUrl(profile, session);
  const initials = profileInitials(name);
  const classes = ['user-avatar', sizeClass].filter(Boolean).join(' ');
  if (avatarUrl) {
    return `<span class="${classes}" data-user-avatar><img src="${escapeHtml(avatarUrl)}" alt="" loading="lazy"></span>`;
  }
  return `<span class="${classes} user-avatar--initials" aria-hidden="true">${escapeHtml(initials)}</span>`;
}

function bindUserAvatarFallbacks(root = document) {
  root.querySelectorAll('[data-user-avatar] img').forEach((img) => {
    if (img.dataset.fallbackBound === '1') return;
    img.dataset.fallbackBound = '1';
    img.addEventListener('error', () => {
      const avatar = img.closest('.user-avatar');
      if (!avatar) return;
      const name = avatar.closest('.session-user-chip')?.querySelector('.session-user-chip-name')?.textContent
        || document.getElementById('welcomeName')?.textContent
        || '?';
      avatar.classList.add('user-avatar--initials');
      avatar.removeAttribute('data-user-avatar');
      avatar.innerHTML = escapeHtml(profileInitials(name));
    }, { once: true });
  });
}

function renderSessionUserChip(profile, session, options = {}) {
  const host = document.getElementById('sessionUserChip');
  if (!host) return;

  // Sur la vitrine, l'utilisateur connecté est déjà affiché dans #navAccount.
  if (document.getElementById('navAccount') && document.getElementById('navLogin')) {
    host.hidden = true;
    host.innerHTML = '';
    return;
  }

  const name = profileDisplayName(profile, session);
  const subtitle = options.subtitle || '';
  const dashboardUrl = options.dashboardUrl || '';
  const tag = dashboardUrl
    ? `<a href="${escapeHtml(dashboardUrl)}" class="session-user-chip">`
    : '<div class="session-user-chip session-user-chip--static">';
  const tagClose = dashboardUrl ? '</a>' : '</div>';

  host.hidden = false;
  host.innerHTML = `
    ${tag}
      ${buildUserAvatarHtml(profile, session, 'user-avatar--sm')}
      <span class="session-user-chip-text">
        <strong class="session-user-chip-name">${escapeHtml(name)}</strong>
        ${subtitle ? `<span class="session-user-chip-meta">${escapeHtml(subtitle)}</span>` : ''}
      </span>
    ${tagClose}
  `;
  bindUserAvatarFallbacks(host);
}

function applyWelcomeUserHeader(profile, session) {
  const welcomeName = document.getElementById('welcomeName');
  if (welcomeName) welcomeName.textContent = profileDisplayName(profile, session);

  const welcomeAvatar = document.getElementById('welcomeAvatar');
  if (welcomeAvatar) {
    welcomeAvatar.innerHTML = buildUserAvatarHtml(profile, session, 'user-avatar--lg');
    bindUserAvatarFallbacks(welcomeAvatar);
  }
}

function enhanceNavAccountLink(profile, session, dashboardUrl) {
  const accountHost = document.getElementById('navAccount');
  if (!accountHost || accountHost.style.display === 'none') return;

  const linkEl = accountHost.matches('a') ? accountHost : accountHost.querySelector('a');
  if (!linkEl) return;

  const name = profileDisplayName(profile, session);
  const firstName = name.split(/\s+/)[0] || name;
  if (dashboardUrl) linkEl.href = dashboardUrl;
  linkEl.classList.add('nav-account-link--with-avatar');
  linkEl.innerHTML = `${buildUserAvatarHtml(profile, session, 'user-avatar--xs')}<span>${escapeHtml(firstName)}</span>`;
  bindUserAvatarFallbacks(linkEl);
}

async function applySessionUserDisplay(profile, session) {
  if (!session) return;
  let userProfile = profile;
  if (!userProfile && session.user?.id) {
    try {
      userProfile = await getProfile(session.user.id);
    } catch (err) {
      console.warn('applySessionUserDisplay:', err.message);
    }
  }

  const dashboardUrl = await getDefaultDashboardUrl(session);
  const subtitle = userProfile?.company && userProfile.company !== profileDisplayName(userProfile, session)
    ? userProfile.company
    : (userProfile?.email || session.user?.email || '');

  applyWelcomeUserHeader(userProfile, session);
  renderSessionUserChip(userProfile, session, { subtitle, dashboardUrl });
  enhanceNavAccountLink(userProfile, session, dashboardUrl);
}

function resetNavAccountLink() {
  const accountHost = document.getElementById('navAccount');
  if (!accountHost) return;

  accountHost.classList.remove('nav-account-link--with-avatar');
  const linkEl = accountHost.matches('a') ? accountHost : accountHost.querySelector('a');
  if (!linkEl) return;

  const i18nKey = linkEl.getAttribute('data-i18n') || accountHost.getAttribute('data-i18n') || 'nav.account';
  const label = typeof t === 'function' ? t(i18nKey) : 'Mon compte';
  linkEl.innerHTML = `<span class="nav-account-label">${escapeHtml(label)}</span>`;
}

function resetNavLoginLink() {
  const loginLink = document.getElementById('navLogin');
  if (!loginLink) return;

  loginLink.hidden = false;
  loginLink.style.display = '';
  loginLink.classList.remove('nav-account-link--with-avatar');
  const label = typeof t === 'function' ? t(loginLink.getAttribute('data-i18n') || 'nav.login') : 'Connexion';
  loginLink.innerHTML = `<span class="nav-account-label">${escapeHtml(label)}</span>`;
  if (typeof window.enhanceNavIcons === 'function') window.enhanceNavIcons();
}

function clearSessionUserDisplay() {
  const host = document.getElementById('sessionUserChip');
  if (host) {
    host.hidden = true;
    host.innerHTML = '';
  }
  resetNavAccountLink();
  resetNavLoginLink();
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
  const adminLink = document.getElementById('navAdmin');
  const logoutBtn = document.getElementById('navLogout');
  const cartBadge = document.getElementById('cartBadge');

  const session = await getSession();
  await refreshPriceVisibility(session);

  if (session) {
    if (loginLink) loginLink.style.display = 'none';
    const profile = await getProfile(session.user.id);
    if (accountLink) {
      accountLink.style.display = '';
      accountLink.href = await getDefaultDashboardUrl(session);
      if (isCommercialAgentProfile(profile)) {
        accountLink.setAttribute('data-i18n', 'nav.agentSpace');
      } else if (isDriverProfile(profile)) {
        accountLink.setAttribute('data-i18n', 'nav.driverSpace');
      } else if (isSupplierProfile(profile)) {
        accountLink.setAttribute('data-i18n', 'nav.supplierSpace');
      } else if (isAdminProfile(profile)) {
        accountLink.setAttribute('data-i18n', 'nav.adminSpace');
      } else {
        accountLink.setAttribute('data-i18n', 'nav.account');
      }
      if (typeof t === 'function' && !accountLink.classList.contains('nav-account-link--with-avatar')) {
        accountLink.textContent = t(accountLink.getAttribute('data-i18n'));
      }
    }
    await applySessionUserDisplay(profile, session);
    if (logoutBtn) logoutBtn.style.display = '';
    if (adminLink) {
      let admin = false;
      if (typeof isAdmin === 'function') {
        admin = await isAdmin();
      }
      adminLink.style.display = admin ? '' : 'none';
    }
  } else {
    clearSessionUserDisplay();
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

  window.addEventListener('pageshow', (event) => {
    if (event.persisted) updateNavAuth();
  });

  const sb = getSupabase();
  if (sb?.auth?.onAuthStateChange) {
    sb.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        updateNavAuth();
      }
    });
  }
});
