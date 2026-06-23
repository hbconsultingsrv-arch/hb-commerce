/**
 * UI B2B — FAQ accordion, icônes trust, footer dynamique
 */
(function initB2bUi() {
  function initFaq() {
    document.querySelectorAll('.faq-question').forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.faq-item');
        const wasOpen = item?.classList.contains('is-open');
        document.querySelectorAll('.faq-item.is-open').forEach((el) => el.classList.remove('is-open'));
        if (!wasOpen) item?.classList.add('is-open');
        btn.setAttribute('aria-expanded', String(!wasOpen));
      });
    });
  }

  function bindFooterMarket() {
    const m = typeof getMarket === 'function' ? getMarket() : null;
    if (!m) return;

    const phone = document.getElementById('footerPhone');
    const email = document.getElementById('footerEmail');
    const address = document.getElementById('footerAddress');
    const brochure = document.getElementById('footerBrochureLink');

    if (phone && m.contact?.phone) {
      phone.textContent = m.contact.phone;
      phone.href = `tel:${m.contact.phone.replace(/\s/g, '')}`;
    }
    if (email && m.contact?.email) {
      email.textContent = m.contact.email;
      email.href = `mailto:${m.contact.email}`;
    }
    if (address && m.contact?.address) {
      address.textContent = m.contact.address;
    }
    if (brochure && m.brochurePage) {
      brochure.href = m.brochurePage;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    initFaq();
    bindFooterMarket();
  });
})();
