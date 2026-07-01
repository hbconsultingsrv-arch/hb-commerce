/**
 * Espace commercial — page dédiée (agents externes + activité commerciale RH)
 */

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
  const adminBtn = document.getElementById('agentAdminBtn');
  const livraisonBtn = document.getElementById('agentLivraisonBtn');
  const isRhStaff = isAdminProfile(profile);
  const hasDeliveryRole = Boolean(profile?.driver_id);

  if (adminBtn) {
    adminBtn.href = getAdminHomeUrl(profile);
    setTopNavBlock(adminBtn, isRhStaff);
  }

  if (livraisonBtn) {
    livraisonBtn.href = 'livreur.html';
    setTopNavBlock(livraisonBtn, isRhStaff && hasDeliveryRole);
  }

  if (banner && isRhStaff) {
    banner.hidden = false;
    banner.innerHTML = `
      <p>Vous consultez votre <strong>portefeuille commercial personnel</strong> uniquement.
      L'administration globale (RH, stock, équipe…) reste sur
      <a href="${getAdminHomeUrl(profile)}">Administration</a>.
      Utilisez <strong>Administration</strong> ou <strong>Livraison</strong> en haut pour changer d'espace.</p>`;
  }
}

window.initCommercialSpacePage = initCommercialSpacePage;
