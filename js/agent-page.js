/**
 * Espace commercial — page dédiée (agents externes + activité commerciale RH)
 */
async function initCommercialSpacePage() {
  const profile = adminProfile;
  if (!profile) return;

  const rhAdmin = document.getElementById('agentRhAdminLink');
  const rhSuper = document.getElementById('agentRhSuperLink');
  const livreurLink = document.getElementById('agentLivreurLink');
  const banner = document.getElementById('commercialScopeBanner');

  if (isAdminProfile(profile) && rhAdmin) rhAdmin.hidden = false;
  if (isSuperRootProfile(profile) && rhSuper) rhSuper.hidden = false;
  if (profile.driver_id && livreurLink) livreurLink.hidden = false;

  if (banner && isAdminProfile(profile)) {
    banner.hidden = false;
    banner.innerHTML = `
      <p>Vous consultez votre <strong>portefeuille commercial personnel</strong> uniquement.
      L'administration globale (RH, stock, équipe…) reste sur
      <a href="admin.html">admin.html</a>${isSuperRootProfile(profile) ? ' ou <a href="super-root.html">super-root.html</a>' : ''}.</p>`;
  }
}

window.initCommercialSpacePage = initCommercialSpacePage;
