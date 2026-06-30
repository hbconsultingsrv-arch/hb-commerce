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

/** Session utilisable pour l'UI : vérifie le JWT (évite token localStorage expiré après déconnexion). */
async function resolveNavSession() {
  const sb = getSupabase();
  if (!sb) return null;

  const { data: { session }, error: sessionError } = await sb.auth.getSession();
  if (sessionError || !session) return null;

  const { data: { user }, error: userError } = await sb.auth.getUser();
  if (userError || !user) {
    console.warn('resolveNavSession: getUser indisponible, session locale conservee', userError?.message || userError);
    return session;
  }

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
  clearSessionUserDisplay();
  try {
    const sb = getSupabase();
    if (sb?.auth) {
      try {
        await sb.auth.signOut({ scope: 'global' });
      } catch (_) {
        try {
          await sb.auth.signOut({ scope: 'local' });
        } catch (_) { /* ignore */ }
      }
    }
  } catch (err) {
    console.warn('signOut:', err.message);
  } finally {
    window.location.replace('index.html');
  }
}

function bindLogoutButton(button) {
  if (!button || button.dataset.logoutBound === '1') return;
  button.dataset.logoutBound = '1';
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    void signOut();
  });
}

function isDedicatedBackOfficeShell() {
  return document.body.classList.contains('admin-v2')
    || document.body.classList.contains('livreur-page')
    || document.body.classList.contains('commercial-space')
    || document.body.classList.contains('supplier-space');
}

function isMissingProfileColumnError(error) {
  const msg = String(error?.message || error || '').toLowerCase();
  return msg.includes('column') && (
    msg.includes('schema cache')
    || msg.includes('could not find')
    || msg.includes('does not exist')
  );
}

async function getProfile(userId) {
  const sb = getSupabase();
  if (!sb) return null;
  const baseSelect = 'id,email,full_name,phone,address,company,siren,vat_number,role,driver_id,commercial_agent_id,supplier_id,created_at,updated_at';
  let { data, error } = await sb
    .from('profiles')
    .select(`${baseSelect},avatar_url`)
    .eq('id', userId)
    .maybeSingle();
  if (error && isAvatarUrlColumnMissingError(error)) {
    ({ data, error } = await sb
      .from('profiles')
      .select(baseSelect)
      .eq('id', userId)
      .maybeSingle());
  }
  if (error && isMissingProfileColumnError(error)) {
    ({ data, error } = await sb
      .from('profiles')
      .select('id,email,full_name,phone,company,role,driver_id,commercial_agent_id,supplier_id')
      .eq('id', userId)
      .maybeSingle());
  }
  if (error) throw error;
  return data;
}

function buildSessionFallbackProfile(session) {
  return {
    id: session?.user?.id,
    email: session?.user?.email,
    full_name: session?.user?.user_metadata?.full_name
      || session?.user?.email?.split('@')[0]
      || 'Utilisateur',
  };
}

async function getProfileSafe(userId, timeoutMs = 8000) {
  if (!userId) return null;
  try {
    return await Promise.race([
      getProfile(userId),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Profil — délai dépassé')), timeoutMs);
      }),
    ]);
  } catch (err) {
    console.warn('getProfileSafe:', err.message);
    return null;
  }
}

function isAdminProfile(profile, session = null) {
  const role = resolveProfileRole(profile, session);
  return role === 'admin' || role === 'super_root';
}

function isSuperRootProfile(profile, session = null) {
  return resolveProfileRole(profile, session) === 'super_root';
}

function isCommercialAgentProfile(profile, session = null) {
  return resolveProfileRole(profile, session) === 'agent_commercial';
}

function isCommercialAssignableProfile(profile, session = null) {
  return ['agent_commercial', 'admin', 'super_root'].includes(resolveProfileRole(profile, session));
}

function isSupplierProfile(profile, session = null) {
  return resolveProfileRole(profile, session) === 'supplier';
}

function isDriverProfile(profile, session = null) {
  return resolveProfileRole(profile, session) === 'livreur';
}

function isBackofficeProfile(profile) {
  return isAdminProfile(profile) || isCommercialAgentProfile(profile);
}

const DEMO_ROLE_BY_EMAIL = {
  'super@hbcommerce.demo': 'super_root',
  'admin@hbcommerce.demo': 'admin',
  'agent.martin@hbcommerce.demo': 'agent_commercial',
  'agent.dubois@hbcommerce.demo': 'agent_commercial',
  'stock@fiafi-tunisie.demo': 'supplier',
  'livreur@hbcommerce.demo': 'livreur',
};

function resolveProfileRole(profile, session) {
  const email = (profile?.email || session?.user?.email || '').trim().toLowerCase();
  if (Object.prototype.hasOwnProperty.call(DEMO_ROLE_BY_EMAIL, email)) {
    return DEMO_ROLE_BY_EMAIL[email];
  }
  const role = profile?.role
    || session?.user?.app_metadata?.role
    || session?.user?.user_metadata?.role;
  return role || null;
}

function isClientDashboardRole(profile, session) {
  const role = resolveProfileRole(profile, session);
  return !role || role === 'client' || role === 'pending_company';
}

function getProfilePageUrl(profile = null, session = null) {
  const role = resolveProfileRole(profile, session);
  if (role === 'super_root') return 'admin.html?tab=equipe';
  if (role === 'admin') return 'admin.html';
  if (role === 'agent_commercial') return 'agent.html';
  if (role === 'supplier') return 'supplier.html';
  if (role === 'livreur') return 'compte.html?tab=profil';
  return 'compte.html?tab=profil';
}

const HB_REDIRECT_LOOP_KEY = 'hb_redirect_loop_guard';

function redirectToRoleHome(url) {
  if (!url) return;
  const targetPage = url.split('?')[0].split('/').pop();
  const currentPage = window.location.pathname.split('/').pop() || '';
  if (currentPage === targetPage) return;

  const bounceKey = `${currentPage}->${targetPage}`;
  try {
    const raw = sessionStorage.getItem(HB_REDIRECT_LOOP_KEY);
    const guard = raw ? JSON.parse(raw) : {};
    const now = Date.now();
    if (guard[bounceKey] && now - guard[bounceKey] < 4000) {
      console.warn('redirectToRoleHome: boucle bloquée', bounceKey);
      return;
    }
    guard[bounceKey] = now;
    sessionStorage.setItem(HB_REDIRECT_LOOP_KEY, JSON.stringify(guard));
  } catch {
    /* ignore */
  }

  window.location.replace(url);
}

async function getDefaultDashboardUrl(session, profile = undefined) {
  if (!session?.user?.id) return 'compte.html';
  let userProfile = profile;
  if (!userProfile) {
    try {
      userProfile = await getProfile(session.user.id);
    } catch (err) {
      console.warn('getDefaultDashboardUrl:', err.message);
    }
  }
  const role = resolveProfileRole(userProfile, session);
  if (role === 'super_root') return 'admin.html?tab=equipe';
  if (role === 'admin') return 'admin.html';
  if (role === 'agent_commercial') return 'agent.html';
  if (role === 'supplier') return 'supplier.html';
  if (role === 'livreur') return 'livreur.html';
  return 'compte.html';
}

function isAvatarUrlColumnMissingError(error) {
  const msg = String(error?.message || error || '').toLowerCase();
  return msg.includes('avatar_url') && (
    msg.includes('schema cache')
    || msg.includes('could not find')
    || msg.includes('column')
  );
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
  if (!error) return data;

  if (isAvatarUrlColumnMissingError(error) && Object.prototype.hasOwnProperty.call(fields, 'avatar_url')) {
    const { avatar_url: _ignored, ...rest } = fields;
    const retry = await sb
      .from('profiles')
      .update(rest)
      .eq('id', userId)
      .select()
      .single();
    if (retry.error) throw retry.error;
    retry.data._avatarColumnMissing = true;
    return retry.data;
  }

  throw error;
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

function getStaffChipSubtitle(profile, session) {
  const role = resolveProfileRole(profile, session);
  const labels = {
    agent_commercial: 'Agent commercial',
    livreur: 'Livreur',
    supplier: 'Fournisseur',
    admin: 'Administration RH',
    super_root: 'Équipe HB',
  };
  return labels[role] || '';
}

function getSessionChipSubtitle(profile, session) {
  if (
    document.body.classList.contains('livreur-page')
    || document.body.classList.contains('commercial-space')
    || document.body.classList.contains('admin-v2')
    || document.body.classList.contains('supplier-space')
  ) {
    const staffSub = getStaffChipSubtitle(profile, session);
    if (staffSub) return staffSub;
  }
  const name = profileDisplayName(profile, session);
  if (profile?.company && profile.company !== name) return profile.company;
  return profile?.email || session?.user?.email || '';
}

function renderSessionUserChip(profile, session, options = {}) {
  const host = document.getElementById('sessionUserChip');
  if (!host) return;

  const profileUrl = options.profileUrl || getProfilePageUrl(profile, session);
  const avatarHtml = buildUserAvatarHtml(profile, session, 'user-avatar--sm');
  const profileLabel = typeof t === 'function' ? t('nav.profile') : 'Mon profil';

  if (host.classList.contains('session-user-chip-host--avatar-only')) {
    host.hidden = false;
    host.removeAttribute('hidden');
    host.innerHTML = `
      <a href="${escapeHtml(profileUrl)}" class="session-user-chip session-user-chip--avatar-only" aria-label="${escapeHtml(profileLabel)}" title="${escapeHtml(profileLabel)}">
        ${avatarHtml}
      </a>`;
    bindUserAvatarFallbacks(host);
    return;
  }

  // Sur la vitrine sans mode avatar, l'espace compte est dans #navAccount.
  if (document.getElementById('navAccount') && document.getElementById('navLogin')) {
    host.hidden = true;
    host.innerHTML = '';
    return;
  }

  const name = profileDisplayName(profile, session);
  const subtitle = options.subtitle || '';
  const showSubtitle = subtitle && subtitle !== name;
  const textHtml = `
      <span class="session-user-chip-text">
        <strong class="session-user-chip-name">${escapeHtml(name)}</strong>
        ${showSubtitle ? `<span class="session-user-chip-meta">${escapeHtml(subtitle)}</span>` : ''}
      </span>`;

  if (host.classList.contains('session-user-chip-host--menu')) {
    host.hidden = false;
    host.removeAttribute('hidden');
    host.innerHTML = `
      <div class="nav-dropdown-wrap nav-profile-wrap">
        <button type="button" class="session-user-chip nav-dropdown-trigger" aria-haspopup="menu" aria-expanded="false">
          ${avatarHtml}
          ${textHtml}
          <span class="nav-dropdown-caret" aria-hidden="true">▾</span>
        </button>
        <ul class="nav-dropdown-menu nav-profile-menu" role="menu">
          <li role="none"><a href="${escapeHtml(profileUrl)}" role="menuitem">Mon profil</a></li>
        </ul>
      </div>`;
    bindUserAvatarFallbacks(host);
    bindNavDropdowns();
    return;
  }

  const tag = profileUrl
    ? `<a href="${escapeHtml(profileUrl)}" class="session-user-chip">`
    : '<div class="session-user-chip session-user-chip--static">';
  const tagClose = profileUrl ? '</a>' : '</div>';

  host.hidden = false;
  host.removeAttribute('hidden');
  host.innerHTML = `
    ${tag}
      ${avatarHtml}
      ${textHtml}
    ${tagClose}
  `;
  bindUserAvatarFallbacks(host);
}

function applyWelcomeUserHeader(profile, session) {
  const welcomeName = document.getElementById('welcomeName');
  if (welcomeName) welcomeName.textContent = profileDisplayName(profile, session);

  const supplierName = document.getElementById('supplierName');
  if (supplierName) supplierName.textContent = profileDisplayName(profile, session);

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

  if (dashboardUrl) linkEl.href = dashboardUrl;
  linkEl.classList.remove('nav-account-link--with-avatar');
  const i18nKey = linkEl.getAttribute('data-i18n') || accountHost.getAttribute('data-i18n') || 'nav.account';
  const label = typeof t === 'function' ? t(i18nKey) : 'Mon compte';
  linkEl.innerHTML = `<span class="nav-account-label">${escapeHtml(label)}</span>`;
}

async function applySessionUserDisplay(profile, session) {
  if (!session) return;

  let userProfile = profile || buildSessionFallbackProfile(session);
  let subtitle = getSessionChipSubtitle(userProfile, session);
  applyWelcomeUserHeader(userProfile, session);
  renderSessionUserChip(userProfile, session, { subtitle, profileUrl: getProfilePageUrl(userProfile, session) });

  if (!profile && session.user?.id) {
    const fetched = await getProfileSafe(session.user.id);
    if (fetched) userProfile = fetched;
  }

  const dashboardUrl = await getDefaultDashboardUrl(session, userProfile);
  subtitle = getSessionChipSubtitle(userProfile, session);
  renderSessionUserChip(userProfile, session, { subtitle, profileUrl: getProfilePageUrl(userProfile, session) });
  applyWelcomeUserHeader(userProfile, session);
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

function syncNavLoginFallbacks(hasSession) {
  const menuItem = document.getElementById('navLoginMenuItem');
  if (menuItem) menuItem.hidden = !!hasSession;
}

let navAuthUpdateSeq = 0;
let navAuthReady = false;

async function updateNavAuth() {
  const seq = ++navAuthUpdateSeq;
  const loginLink = document.getElementById('navLogin');
  const accountLink = document.getElementById('navAccount');
  const adminLink = document.getElementById('navAdmin');
  const logoutBtn = document.getElementById('navLogout');
  const cartBadge = document.getElementById('cartBadge');

  const session = await resolveNavSession();
  if (seq !== navAuthUpdateSeq) return;

  await refreshPriceVisibility(session);
  if (seq !== navAuthUpdateSeq) return;

  if (session) {
    let profile = await getProfileSafe(session.user.id);
    if (seq !== navAuthUpdateSeq) return;

    const dashboardUrl = await getDefaultDashboardUrl(session, profile);
    if (seq !== navAuthUpdateSeq) return;

    if (loginLink) loginLink.style.display = 'none';
    if (accountLink) {
      accountLink.style.display = '';
      accountLink.href = dashboardUrl;
      if (isCommercialAgentProfile(profile, session)) {
        accountLink.setAttribute('data-i18n', 'nav.agentSpace');
      } else if (isDriverProfile(profile, session)) {
        accountLink.setAttribute('data-i18n', 'nav.driverSpace');
      } else if (isSupplierProfile(profile, session)) {
        accountLink.setAttribute('data-i18n', 'nav.supplierSpace');
      } else if (isAdminProfile(profile, session)) {
        accountLink.setAttribute('data-i18n', 'nav.adminSpace');
      } else {
        accountLink.setAttribute('data-i18n', 'nav.account');
      }
      if (typeof t === 'function' && !accountLink.classList.contains('nav-account-link--with-avatar')) {
        accountLink.textContent = t(accountLink.getAttribute('data-i18n'));
      }
    }
    try {
      await applySessionUserDisplay(profile, session);
    } catch (err) {
      console.warn('updateNavAuth: affichage session', err.message);
    }
    if (seq !== navAuthUpdateSeq) return;

    syncNavLoginFallbacks(true);

    if (logoutBtn) logoutBtn.style.display = '';
    if (adminLink) {
      let admin = false;
      if (typeof isAdmin === 'function') {
        admin = await isAdmin();
      }
      adminLink.style.display = admin ? '' : 'none';
    }
  } else {
    if (seq !== navAuthUpdateSeq) return;
    if (navAuthReady && !isDedicatedBackOfficeShell()) {
      clearSessionUserDisplay();
    }
    if (loginLink) {
      loginLink.hidden = false;
      loginLink.style.display = '';
    }
    if (accountLink) accountLink.style.display = 'none';
    if (adminLink) adminLink.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'none';
    syncNavLoginFallbacks(false);
  }

  if (seq !== navAuthUpdateSeq) return;

  if (navAuthReady || session) {
    document.documentElement.classList.remove('nav-auth-pending');
    document.documentElement.classList.add(session ? 'nav-auth-session' : 'nav-auth-guest');
  }

  if (cartBadge && typeof getCartCount === 'function') {
    const count = getCartCount();
    cartBadge.textContent = count;
    cartBadge.style.display = count > 0 ? '' : 'none';
  }

  logoutBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    void signOut();
  }, { once: true });
}

function bindNavDropdowns() {
  const wraps = document.querySelectorAll('.nav-dropdown-wrap, .nav-more-wrap');
  if (!wraps.length) return;

  const closeAll = () => {
    wraps.forEach((wrap) => {
      wrap.classList.remove('is-open');
      wrap.querySelector('.nav-dropdown-trigger, .nav-more-trigger')?.setAttribute('aria-expanded', 'false');
    });
  };

  wraps.forEach((wrap) => {
    if (wrap.dataset.bound === '1') return;
    wrap.dataset.bound = '1';
    const trigger = wrap.querySelector('.nav-dropdown-trigger, .nav-more-trigger');
    const menu = wrap.querySelector('.nav-dropdown-menu, .nav-more-menu');
    if (!trigger || !menu) return;

    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const willOpen = !wrap.classList.contains('is-open');
      closeAll();
      if (willOpen) {
        wrap.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
      }
    });

    menu.querySelectorAll('a, button[data-admin-tab], button.nav-dropdown-action').forEach((el) => {
      el.addEventListener('click', () => {
        closeAll();
        const links = document.querySelector('.nav-links');
        links?.classList.remove('is-open', 'open');
        document.querySelector('.nav-toggle')?.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('nav-open');
      });
    });
  });

  if (document.documentElement.dataset.navDropdownBound === '1') return;
  document.documentElement.dataset.navDropdownBound = '1';
  document.addEventListener('click', closeAll);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeAll();
  });
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
  document.documentElement.classList.add('nav-auth-pending');
  bindMobileNav();
  bindPasswordToggles();
  bindNavDropdowns();
  bindLogoutButton(document.getElementById('logoutBtn'));

  window.addEventListener('pageshow', () => {
    if (navAuthReady) updateNavAuth();
  });

  const sb = getSupabase();
  if (sb?.auth?.onAuthStateChange) {
    sb.auth.onAuthStateChange((event) => {
      if (event === 'INITIAL_SESSION') navAuthReady = true;
      if (event === 'SIGNED_OUT' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
        updateNavAuth();
      }
    });
  } else {
    navAuthReady = true;
    updateNavAuth();
  }
});
