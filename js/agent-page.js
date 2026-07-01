/**
 * Espace commercial — page dédiée (agents externes + activité commerciale RH)
 */

function setTopNavBlock(el, visible) {
  if (!el) return;
  el.hidden = !visible;
  el.classList.toggle('is-visible', visible);
  el.style.display = visible ? '' : 'none';
}

function resolveCommercialPageProfile() {
  if (adminProfile) return adminProfile;
  if (typeof adminSession !== 'undefined' && adminSession && typeof buildSessionFallbackProfile === 'function') {
    return buildSessionFallbackProfile(adminSession);
  }
  return null;
}

function configureCommercialStaffNav(profile) {
  if (!profile) return;

  const banner = document.getElementById('commercialScopeBanner');
  const adminBtn = document.getElementById('agentAdminBtn');
  const livraisonBtn = document.getElementById('agentLivraisonBtn');
  const isRhStaff = isAdminProfile(profile);

  if (adminBtn) {
    adminBtn.href = getAdminHomeUrl(profile);
    setTopNavBlock(adminBtn, isRhStaff);
  }

  if (livraisonBtn) {
    livraisonBtn.href = 'livreur.html';
    setTopNavBlock(livraisonBtn, isRhStaff);
  }

  if (banner && isRhStaff) {
    banner.hidden = false;
    banner.innerHTML = `
      <p>Vous consultez votre <strong>portefeuille commercial personnel</strong> uniquement.
      L'administration globale (RH, stock, équipe…) reste sur
      <a href="${getAdminHomeUrl(profile)}">Administration</a>.
      Utilisez les boutons <strong>Administration</strong> et <strong>Livraison</strong> en haut pour changer d'espace.</p>`;
  }
}

async function initCommercialSpacePage() {
  configureCommercialStaffNav(resolveCommercialPageProfile());
}

window.configureCommercialStaffNav = configureCommercialStaffNav;
window.initCommercialSpacePage = initCommercialSpacePage;

document.addEventListener('DOMContentLoaded', () => {
  configureCommercialStaffNav(resolveCommercialPageProfile());
});
