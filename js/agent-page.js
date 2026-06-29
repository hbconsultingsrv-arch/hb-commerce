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
  el.style.display = visible ? '' : 'none';
}

function canShowMesActivites(profile) {
  return isAdminProfile(profile);
}

async function initCommercialSpacePage() {
  const profile = adminProfile;
  if (!profile) return;

  const banner = document.getElementById('commercialScopeBanner');
  const staffAccueil = document.getElementById('agentStaffAccueil');
  const activitiesWrap = document.getElementById('agentActivitiesWrap');
  const adminAccueilLink = document.getElementById('agentAdminAccueilLink');
  const voirSiteLink = document.getElementById('agentVoirSiteLink');
  const livraisonItem = document.getElementById('agentActivitiesLivraisonItem');
  const isStaff = !canShowMesActivites(profile);

  setTopNavBlock(staffAccueil, isStaff);
  setTopNavBlock(activitiesWrap, !isStaff);
  setTopNavBlock(adminAccueilLink, !isStaff);
  setTopNavBlock(voirSiteLink, !isStaff);
  setAgentNavItem(livraisonItem, !isStaff);

  if (adminAccueilLink && !isStaff) {
    adminAccueilLink.href = isSuperRootProfile(profile) ? 'admin.html?tab=equipe' : 'admin.html';
    adminAccueilLink.textContent = isSuperRootProfile(profile) ? 'Accueil Équipe HB' : 'Accueil RH';
  }

  if (banner && !isStaff) {
    banner.hidden = false;
    banner.innerHTML = `
      <p>Vous consultez votre <strong>portefeuille commercial personnel</strong> uniquement.
      L'administration globale (RH, stock, équipe…) reste sur
      <a href="${isSuperRootProfile(profile) ? 'admin.html?tab=equipe' : 'admin.html'}">${isSuperRootProfile(profile) ? 'Équipe HB' : 'admin.html'}</a>${isSuperRootProfile(profile) ? ' (super root · Équipe HB)' : ''}.</p>`;
  }
}

window.initCommercialSpacePage = initCommercialSpacePage;
