/**
 * Espace commercial — page dédiée (agents externes + activité commerciale RH)
 */

function setAgentNavItem(el, visible) {
  if (!el) return;
  const li = el.closest('li') || el;
  li.hidden = !visible;
}

function canShowMesActivites(profile) {
  return isAdminProfile(profile);
}

async function initCommercialSpacePage() {
  const profile = adminProfile;
  if (!profile) return;

  const banner = document.getElementById('commercialScopeBanner');
  const activitiesWrap = document.querySelector('.nav-activities-wrap');
  const livraisonItem = document.getElementById('agentActivitiesLivraisonItem');
  const backOfficeItem = document.getElementById('agentMenuBackOfficeItem');
  const backOfficeLink = document.getElementById('agentMenuBackOfficeLink');

  if (activitiesWrap) {
    activitiesWrap.hidden = !canShowMesActivites(profile);
  }

  setAgentNavItem(livraisonItem, canShowMesActivites(profile));

  if (backOfficeItem && backOfficeLink && isAdminProfile(profile)) {
    setAgentNavItem(backOfficeItem, true);
    if (isSuperRootProfile(profile)) {
      backOfficeLink.href = 'admin.html?tab=equipe';
      backOfficeLink.textContent = 'Équipe HB';
    } else {
      backOfficeLink.href = 'admin.html';
      backOfficeLink.textContent = 'Administration RH';
    }
  }

  if (banner && isAdminProfile(profile)) {
    banner.hidden = false;
    banner.innerHTML = `
      <p>Vous consultez votre <strong>portefeuille commercial personnel</strong> uniquement.
      L'administration globale (RH, stock, équipe…) reste sur
      <a href="${isSuperRootProfile(profile) ? 'admin.html?tab=equipe' : 'admin.html'}">${isSuperRootProfile(profile) ? 'Équipe HB' : 'admin.html'}</a>${isSuperRootProfile(profile) ? ' (super root · Équipe HB)' : ''}.</p>`;
  }
}

window.initCommercialSpacePage = initCommercialSpacePage;
