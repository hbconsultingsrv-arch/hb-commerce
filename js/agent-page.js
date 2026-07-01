/**
 * Espace commercial — page dédiée (agents externes + activité commerciale RH)
 */

function resolveCommercialNavSession() {
  if (typeof adminSession !== 'undefined' && adminSession) return adminSession;
  return null;
}

function resolveCommercialPageProfile() {
  if (typeof adminProfile !== 'undefined' && adminProfile) return adminProfile;
  const session = resolveCommercialNavSession();
  if (session && typeof buildSessionFallbackProfile === 'function') {
    return buildSessionFallbackProfile(session);
  }
  return null;
}

function isRhCommercialNavUser(profile, session) {
  if (isAdminProfile(profile, session)) return true;
  const role = resolveProfileRole(profile, session);
  return role === 'admin' || role === 'super_root';
}

function isExternalCommercialAgent(profile, session) {
  return isCommercialAgentProfile(profile, session) && !isRhCommercialNavUser(profile, session);
}

function showCommercialNavButton(el, visible) {
  if (!el) return;
  el.hidden = !visible;
  el.style.display = visible ? '' : 'none';
  el.setAttribute('aria-hidden', visible ? 'false' : 'true');
}

function configureCommercialStaffNav(profile, session) {
  const profileRef = profile || resolveCommercialPageProfile();
  const sessionRef = session || resolveCommercialNavSession();
  const adminBtn = document.getElementById('agentAdminBtn');
  const livraisonBtn = document.getElementById('agentLivraisonBtn');
  const banner = document.getElementById('commercialScopeBanner');
  const showStaffNav = !profileRef || !isExternalCommercialAgent(profileRef, sessionRef);

  if (adminBtn) {
    adminBtn.href = profileRef ? getAdminHomeUrl(profileRef, sessionRef) : 'admin.html';
    showCommercialNavButton(adminBtn, showStaffNav);
  }

  if (livraisonBtn) {
    livraisonBtn.href = 'livreur.html';
    showCommercialNavButton(livraisonBtn, showStaffNav);
  }

  if (banner && profileRef && isRhCommercialNavUser(profileRef, sessionRef)) {
    banner.hidden = false;
    banner.innerHTML = `
      <p>Vous consultez votre <strong>portefeuille commercial personnel</strong> uniquement.
      L'administration globale (RH, stock, équipe…) reste sur
      <a href="${getAdminHomeUrl(profileRef, sessionRef)}">Administration</a>.
      Utilisez les boutons <strong>Administration</strong> et <strong>Livraison</strong> en haut pour changer d'espace.</p>`;
  }
}

async function initCommercialSpacePage() {
  configureCommercialStaffNav(resolveCommercialPageProfile(), resolveCommercialNavSession());
}

window.configureCommercialStaffNav = configureCommercialStaffNav;
window.initCommercialSpacePage = initCommercialSpacePage;

document.addEventListener('DOMContentLoaded', () => {
  configureCommercialStaffNav(resolveCommercialPageProfile(), resolveCommercialNavSession());
});
