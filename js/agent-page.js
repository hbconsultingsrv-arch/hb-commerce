/**
 * Espace commercial — page dédiée (agents externes + activité commerciale RH)
 */
function setAgentFooterLink(el, visible) {
  if (!el) return;
  el.hidden = !visible;
  el.style.display = visible ? '' : 'none';
}

async function initCommercialSpacePage() {
  const profile = adminProfile;
  if (!profile) return;

  const rhAdmin = document.getElementById('agentRhAdminLink');
  const rhSuper = document.getElementById('agentRhSuperLink');
  const livreurLink = document.getElementById('agentLivreurLink');
  const banner = document.getElementById('commercialScopeBanner');

  setAgentFooterLink(rhAdmin, isAdminProfile(profile));
  setAgentFooterLink(rhSuper, isSuperRootProfile(profile));
  setAgentFooterLink(livreurLink, Boolean(profile.driver_id));

  if (banner && isAdminProfile(profile)) {
    banner.hidden = false;
    banner.innerHTML = `
      <p>Vous consultez votre <strong>portefeuille commercial personnel</strong> uniquement.
      L'administration globale (RH, stock, équipe…) reste sur
      <a href="admin.html">admin.html</a>${isSuperRootProfile(profile) ? ' ou <a href="super-root.html">super-root.html</a>' : ''}.</p>`;
  }
}

window.initCommercialSpacePage = initCommercialSpacePage;
