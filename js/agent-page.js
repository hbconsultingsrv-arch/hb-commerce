/**
 * Espace commercial — page dédiée (agents externes + activité commerciale RH)
 */

function setAgentNavItem(el, visible) {
  if (!el) return;
  const li = el.closest('li') || el;
  li.hidden = !visible;
}

function setTopNavBlock(el, visible) {
  if (!el) return;
  el.hidden = !visible;
  el.classList.toggle('is-visible', visible);
  el.style.display = visible ? '' : 'none';
}

async function initCommercialSpacePage() {
  const profile = adminProfile;
  if (!profile) return;

  const banner = document.getElementById('commercialScopeBanner');
  const staffAccueil = document.getElementById('agentStaffAccueil');
  const activitiesWrap = document.getElementById('agentActivitiesWrap');
  const livraisonItem = document.getElementById('agentActivitiesLivraisonItem');
  const isRhStaff = isAdminProfile(profile);
  const hasDeliveryRole = Boolean(profile?.driver_id);

  if (staffAccueil) {
    staffAccueil.href = isRhStaff ? 'index.html#accueil' : 'agent.html';
  }

  setTopNavBlock(staffAccueil, !isRhStaff);
  setTopNavBlock(activitiesWrap, isRhStaff);
  setAgentNavItem(livraisonItem, hasDeliveryRole);

  if (typeof bindNavDropdowns === 'function') bindNavDropdowns();

  if (banner && isRhStaff) {
    banner.hidden = false;
    banner.innerHTML = `
      <p>Vous consultez votre <strong>portefeuille commercial personnel</strong> uniquement.
      L'administration globale (RH, stock, équipe…) reste sur
      <a href="${isSuperRootProfile(profile) ? 'admin.html?tab=equipe' : 'admin.html'}">${isSuperRootProfile(profile) ? 'Équipe HB' : 'admin.html'}</a>${isSuperRootProfile(profile) ? ' (super root · Équipe HB)' : ''}.
      Utilisez <strong>Mes activités</strong> pour basculer vers Livraison ou Mon profil.</p>`;
  }
}

window.initCommercialSpacePage = initCommercialSpacePage;
