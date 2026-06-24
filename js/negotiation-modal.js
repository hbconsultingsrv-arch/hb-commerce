/**
 * Modal de négociation — fiches produit
 */
(function initNegotiationModal() {
  const MODAL_ID = 'negotiationModal';

  function ensureModal() {
    if (document.getElementById(MODAL_ID)) return;

    const wrap = document.createElement('div');
    wrap.id = MODAL_ID;
    wrap.className = 'app-modal negotiation-modal';
    wrap.hidden = true;
    wrap.innerHTML = `
      <div class="app-modal-backdrop" data-close-neg-modal></div>
      <div class="app-modal-dialog negotiation-modal-dialog" role="dialog" aria-labelledby="negModalTitle" aria-modal="true">
        <div class="app-modal-header">
          <div>
            <span class="section-tag">Négociation B2B</span>
            <h2 id="negModalTitle">Demander un meilleur prix</h2>
          </div>
          <button type="button" class="app-modal-close" data-close-neg-modal aria-label="Fermer">&times;</button>
        </div>
        <div class="app-modal-body">
          <div class="neg-product-summary" id="negProductSummary"></div>
          <form id="negotiationForm" class="auth-form negotiation-form">
            <input type="hidden" name="product_id">
            <input type="hidden" name="product_slug">
            <input type="hidden" name="product_name">
            <input type="hidden" name="catalog_price">
            <input type="hidden" name="unit">
            <label>
              Quantité souhaitée
              <input type="number" name="quantity" required min="1" step="1">
            </label>
            <div class="neg-price-compare">
              <div class="neg-price-box">
                <span class="neg-price-label">Prix catalogue</span>
                <span class="neg-price-value" id="negCatalogDisplay">—</span>
              </div>
              <div class="neg-price-box neg-price-box--proposed">
                <span class="neg-price-label">Votre prix proposé</span>
                <input type="number" name="client_proposed_price" step="0.01" min="0" placeholder="Ex. 4,05">
              </div>
            </div>
            <div class="neg-auto-hint" id="negAutoHint" hidden></div>
            <label>
              Message personnalisé
              <textarea name="message" rows="4" placeholder="Ex. Je souhaite commander 2 000 litres par mois. Pouvez-vous proposer un meilleur tarif ?"></textarea>
            </label>
            <div class="negotiation-form-actions">
              <button type="submit" class="btn btn-primary btn-full">Envoyer la demande</button>
              <button type="button" class="btn btn-outline-dark btn-full" data-open-quote-from-neg>Obtenir un devis classique</button>
            </div>
            <p class="form-note" id="negotiationFormNote"></p>
          </form>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);

    wrap.querySelectorAll('[data-close-neg-modal]').forEach((el) => {
      el.addEventListener('click', () => closeNegotiationModal());
    });

    document.getElementById('negotiationForm')?.addEventListener('submit', onSubmit);
    document.querySelector('[data-open-quote-from-neg]')?.addEventListener('click', () => {
      const fd = new FormData(document.getElementById('negotiationForm'));
      closeNegotiationModal();
      if (typeof openQuoteModal === 'function') {
        openQuoteModal({
          product: fd.get('product_name'),
          quantity: `${fd.get('quantity')} ${fd.get('unit')}`
        });
      }
    });

    const qtyInput = wrap.querySelector('[name="quantity"]');
    qtyInput?.addEventListener('input', updateAutoHint);
  }

  async function updateAutoHint() {
    const form = document.getElementById('negotiationForm');
    if (!form || typeof evaluateAutoRules !== 'function') return;
    const qty = form.quantity.value;
    const price = form.catalog_price.value;
    const hint = document.getElementById('negAutoHint');
    if (!qty || !price || !hint) return;
    const rules = await fetchNegotiationRules();
    const auto = evaluateAutoRules(qty, price, rules);
    if (auto.rule && auto.discountPercent > 0) {
      hint.hidden = false;
      hint.innerHTML = auto.requiresApproval
        ? `⚡ Volume élevé : remise jusqu'à <strong>${auto.discountPercent} %</strong> possible — validation commerciale requise.`
        : `⚡ Remise automatique possible : <strong>${auto.discountPercent} %</strong> → environ <strong>${formatPrice(auto.proposedPrice)}</strong> / ${escapeHtml(form.unit.value)}`;
    } else {
      hint.hidden = true;
    }
  }

  function closeNegotiationModal() {
    const modal = document.getElementById(MODAL_ID);
    if (modal) modal.hidden = true;
    document.body.classList.remove('modal-open');
  }

  window.openNegotiationModal = async function openNegotiationModal(product = {}) {
    const session = await getSession();
    if (!session) {
      window.location.href = `login.html?redirect=${encodeURIComponent(window.location.pathname.split('/').pop() || 'produits.html')}`;
      return;
    }

    ensureModal();
    const form = document.getElementById('negotiationForm');
    const summary = document.getElementById('negProductSummary');
    const catalogDisplay = document.getElementById('negCatalogDisplay');

    form.reset();
    form.product_id.value = product.id || '';
    form.product_slug.value = product.slug || '';
    form.product_name.value = product.name || '';
    form.catalog_price.value = product.price || 0;
    form.unit.value = product.unit || 'unité';
    form.quantity.value = product.min_quantity || product.minQty || 1;
    form.quantity.min = product.min_quantity || product.minQty || 1;

    const priceLabel = typeof formatDisplayPrice === 'function'
      ? formatDisplayPrice(product.price)
      : formatPrice(product.price);

    summary.innerHTML = `
      <div class="neg-product-summary-inner">
        ${product.image_url ? `<img src="${escapeHtml(product.image_url)}" alt="" class="neg-product-thumb">` : ''}
        <div>
          <h3>${escapeHtml(product.name || 'Produit')}</h3>
          <p class="auth-sub">Réf. ${escapeHtml(product.slug || product.id || '—')} · Conditionnement : ${escapeHtml(product.unit || '—')}</p>
        </div>
      </div>
    `;
    if (catalogDisplay) catalogDisplay.textContent = `${priceLabel} / ${product.unit || 'unité'}`;

    document.getElementById('negModalTitle').textContent = product.mode === 'offer'
      ? 'Faire une offre'
      : (product.mode === 'quote' ? 'Obtenir un devis négocié' : 'Demander un meilleur prix');

    const modal = document.getElementById(MODAL_ID);
    modal.hidden = false;
    document.body.classList.add('modal-open');
    updateAutoHint();
  };

  async function onSubmit(e) {
    e.preventDefault();
    const note = document.getElementById('negotiationFormNote');
    const fd = new FormData(e.target);
    const session = await getSession();
    if (!session) return;

    try {
      const neg = await createNegotiation({
        client_id: session.user.id,
        product_id: fd.get('product_id') || null,
        product_name: fd.get('product_name'),
        product_slug: fd.get('product_slug'),
        catalog_price: fd.get('catalog_price'),
        quantity: fd.get('quantity'),
        unit: fd.get('unit'),
        client_proposed_price: fd.get('client_proposed_price') || null,
        message: fd.get('message')
      });

      showAlert(note, `Demande ${neg.ref} envoyée. Consultez vos négociations.`, 'success');
      setTimeout(() => {
        closeNegotiationModal();
        if (confirm('Ouvrir le centre de négociations ?')) {
          window.location.href = 'negociations.html';
        }
      }, 1200);
    } catch (err) {
      showAlert(note, err.message);
    }
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-open-negotiation]');
    if (!btn) return;
    e.preventDefault();
    openNegotiationModal({
      id: btn.dataset.productId,
      slug: btn.dataset.productSlug,
      name: btn.dataset.productName,
      price: parseFloat(btn.dataset.productPrice) || 0,
      unit: btn.dataset.productUnit,
      min_quantity: parseInt(btn.dataset.productMin, 10) || 1,
      image_url: btn.dataset.productImage,
      mode: btn.dataset.negMode || 'price'
    });
  });
})();
