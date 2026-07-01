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
  const siteHomeBtn = document.getElementById('agentStaffAccueil');
  const livraisonBtn = document.getElementById('agentLivraisonBtn');
  const isRhStaff = isAdminProfile(profile);
  const hasDeliveryRole = Boolean(profile?.driver_id);

  if (siteHomeBtn) {
    if (isRhStaff) {
      siteHomeBtn.href = 'index.html#accueil';
      siteHomeBtn.textContent = 'Accueil';
    } else {
      siteHomeBtn.href = 'agent.html';
      siteHomeBtn.textContent = 'Accueil';
    }
    setTopNavBlock(siteHomeBtn, true);
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
      <a href="${isSuperRootProfile(profile) ? 'admin.html?tab=equipe' : 'admin.html'}">${isSuperRootProfile(profile) ? 'Équipe HB' : 'admin.html'}</a>${isSuperRootProfile(profile) ? ' (super root · Équipe HB)' : ''}.
      Utilisez <strong>Livraison</strong> ou <strong>Accueil</strong> en haut pour changer d'espace.</p>`;
  }
}

window.initCommercialSpacePage = initCommercialSpacePage;
