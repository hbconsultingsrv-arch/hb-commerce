/**
 * Demande de devis — modal réutilisable (accueil, catalogue, fiches produit)
 */
(function initQuoteRequest() {
  const MODAL_ID = 'quoteModal';

  const ICONS = {
    quote: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>'
  };

  function ensureModal() {
    if (document.getElementById(MODAL_ID)) return;

    const wrap = document.createElement('div');
    wrap.id = MODAL_ID;
    wrap.className = 'app-modal quote-modal';
    wrap.hidden = true;
    wrap.innerHTML = `
      <div class="app-modal-backdrop" data-close-modal></div>
      <div class="app-modal-dialog" role="dialog" aria-labelledby="quoteModalTitle" aria-modal="true">
        <div class="app-modal-header">
          <h2 id="quoteModalTitle" data-i18n="quote.title">Demander un devis</h2>
          <button type="button" class="app-modal-close" data-close-modal aria-label="Fermer">&times;</button>
        </div>
        <div class="app-modal-body">
          <p class="quote-modal-intro" data-i18n="quote.intro">Recevez une proposition tarifaire adaptée à votre activité professionnelle sous 24 à 48 h ouvrées.</p>
          <form id="quoteForm" class="quote-form auth-form">
            <label><span data-i18n="quote.company">Société</span><input type="text" name="company" required autocomplete="organization"></label>
            <div class="form-row">
              <label><span data-i18n="quote.name">Nom & prénom</span><input type="text" name="name" required autocomplete="name"></label>
              <label><span data-i18n="quote.phone">Téléphone</span><input type="tel" name="phone" autocomplete="tel"></label>
            </div>
            <label><span data-i18n="quote.email">E-mail professionnel</span><input type="email" name="email" required autocomplete="email"></label>
            <label><span data-i18n="quote.products">Produits recherchés</span><input type="text" name="products" id="quoteProductsField" placeholder="Ex. FIAFI Premium 5L, TOUNSI 1L…"></label>
            <label><span data-i18n="quote.quantities">Quantités estimées</span><textarea name="quantities" id="quoteQuantitiesField" rows="2" placeholder="Ex. 50 bidons 5L, 120 bouteilles 1L…"></textarea></label>
            <label><span data-i18n="quote.message">Message complémentaire</span><textarea name="message" rows="2"></textarea></label>
            <button type="submit" class="btn btn-primary btn-quote" style="width:100%;margin-top:0.5rem">
              ${ICONS.quote.replace('svg', 'svg width="18" height="18"')}
              <span data-i18n="quote.submit">Envoyer ma demande de devis</span>
            </button>
            <p class="form-note" id="quoteFormNote"></p>
          </form>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);

    if (typeof bindAppModal === 'function') {
      bindAppModal(MODAL_ID);
    }

    document.getElementById('quoteForm')?.addEventListener('submit', onSubmit);
  }

  function openQuoteModal(prefill = {}) {
    ensureModal();
    const modal = document.getElementById(MODAL_ID);
    const productsField = document.getElementById('quoteProductsField');
    const qtyField = document.getElementById('quoteQuantitiesField');
    const form = document.getElementById('quoteForm');

    if (form) form.reset();
    if (productsField && prefill.product) {
      productsField.value = prefill.product;
    }
    if (qtyField && prefill.quantity) {
      qtyField.value = prefill.quantity;
    }
    if (prefill.ref && productsField && !prefill.product) {
      productsField.value = `Réf. ${prefill.ref}`;
    }

    if (typeof openAppModal === 'function') {
      openAppModal(MODAL_ID);
    } else if (modal) {
      modal.hidden = false;
      document.body.classList.add('modal-open');
    }

    if (typeof initI18n === 'function') initI18n();
  }

  function onSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const note = document.getElementById('quoteFormNote');
    const fd = new FormData(form);
    const market = typeof getMarket === 'function' ? getMarket() : null;
    const email = market?.contact?.email || 'contact@hbconsulting.fr';
    const subject = encodeURIComponent('[HB Commerce] Demande de devis professionnel');
    const body = encodeURIComponent(
      `DEMANDE DE DEVIS B2B\n\n`
      + `Société: ${fd.get('company')}\n`
      + `Nom: ${fd.get('name')}\n`
      + `Téléphone: ${fd.get('phone') || '—'}\n`
      + `E-mail: ${fd.get('email')}\n\n`
      + `Produits: ${fd.get('products') || '—'}\n`
      + `Quantités: ${fd.get('quantities') || '—'}\n\n`
      + `Message:\n${fd.get('message') || '—'}\n\n`
      + `— Envoyé depuis hb-commerce.com`
    );

    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;

    if (note) {
      const msg = typeof t === 'function' ? t('quote.sent') : 'Votre client mail va s\'ouvrir pour envoyer la demande.';
      if (typeof showAlert === 'function') {
        showAlert(note, msg, 'success');
      } else {
        note.textContent = msg;
        note.className = 'form-note success';
      }
    }
  }

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-open-quote]');
    if (!trigger) return;
    e.preventDefault();
    openQuoteModal({
      product: trigger.dataset.productName || '',
      ref: trigger.dataset.productRef || '',
      quantity: trigger.dataset.productQty || ''
    });
  });

  window.openQuoteModal = openQuoteModal;
  window.HBQuoteRequest = { open: openQuoteModal };
})();
