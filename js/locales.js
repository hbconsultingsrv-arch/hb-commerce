/* HB Commerce — FR (France) + LU (Luxembourg FR/DE) */

const HB_DEFAULT_LANG = 'fr';

const HB_LANGS = {
  fr: { native: 'Français', dir: 'ltr', market: 'fr' },
  lu: { native: 'Luxembourg (FR/DE)', dir: 'ltr', market: 'lu' }
};

const HB_TRANSLATIONS = {
  fr: {
    'meta.title': 'HB Commerce | Vente en gros B2B',
    'meta.description': 'HB Commerce — Vente en gros alimentaire B2B. Catalogue FIAFI, TOUNSI et produits sélectionnés.',
    'nav.home': 'Accueil',
    'nav.products': 'Produits',
    'nav.services': 'Services',
    'nav.about': 'À propos',
    'nav.contact': 'Contact',
    'nav.brochure': 'Brochure',
    'nav.account': 'Mon compte',
    'nav.login': 'Connexion',
    'nav.logout': 'Déconnexion',
    'nav.cart': 'Panier',
    'nav.market': 'Marché',
    'hero.ribbon': 'Origine Tunisie',
    'hero.title': 'Vente en gros alimentaire professionnelle',
    'hero.lead': 'HB Commerce centralise le catalogue des marques distribuées — <strong>FIAFI</strong>, <strong>TOUNSI</strong> et autres références — avec commande en ligne, facturation et livraison pour les sociétés professionnelles.',
    'hero.pill1': 'Multi-marques',
    'hero.pill2': 'Commande en ligne',
    'hero.pill3': 'Vente en gros',
    'hero.cta.catalog': 'Voir le catalogue',
    'hero.cta.account': 'Compte professionnel',
    'section.services': 'Nos services professionnels',
    'section.services.sub': 'HB Commerce accompagne vos achats, de la commande à la livraison.',
    'service.sales.title': 'Vente en gros B2B',
    'service.sales.desc': 'Catalogue multi-marques, tarifs professionnels et quantités adaptées aux sociétés.',
    'service.order.title': 'Commande en ligne',
    'service.order.desc': 'Panier, validation et suivi des commandes depuis votre espace client sécurisé.',
    'service.invoice.title': 'Facturation',
    'service.invoice.desc': 'Devis, factures téléchargeables et prix personnalisés par société cliente.',
    'service.delivery.title': 'Livraison & suivi',
    'service.delivery.desc': 'Statuts de commande, transporteur, numéro de suivi et délais selon le stock.',
    'service.chat.title': 'Accompagnement commercial',
    'service.chat.desc': 'Chat avec votre agent HB Commerce pour négocier, valider et suivre vos besoins.',
    'service.brands.title': 'Multi-marques',
    'service.brands.desc': 'FIAFI, TOUNSI et autres références ajoutées au catalogue au fil des partenariats.',
    'section.products': 'Notre catalogue par marque',
    'section.products.sub': 'Les produits distribués par HB Commerce — chaque marque avec ses formats disponibles.',
    'section.products.all': 'Catalogue complet',
    'section.about': 'Pourquoi HB Commerce ?',
    'section.about.sub': 'Filiale HB Consulting & Services — distribution France',
    'about.import': 'Import direct',
    'about.import.desc': 'FIAFI sourcé en Tunisie, qualité extra vierge pour la restauration française.',
    'about.wholesale': 'Vente en gros',
    'about.wholesale.desc': 'Quantités adaptées : restaurants, hôtels, distributeurs et grossistes.',
    'about.online': 'Commande en ligne',
    'about.online.desc': 'Espace client, suivi des commandes et paiement sécurisé.',
    'section.contact': 'Contact France',
    'section.contact.sub': 'Commandes et informations professionnelles',
    'footer.brochure': 'Télécharger la brochure France',
    'brochure.title': 'Brochure FIAFI — France',
    'brochure.market': 'Marché : France'
  },
  lu: {
    'meta.title': 'HB Commerce | FIAFI — Olivenöl Grosshandel',
    'meta.description': 'FIAFI — Natives Olivenöl extra aus Tunesien. Grosshandel für Profis in Luxemburg.',
    'nav.home': 'Accueil / Home',
    'nav.products': 'Produits / Produkte',
    'nav.about': 'À propos / Über uns',
    'nav.contact': 'Contact / Kontakt',
    'nav.brochure': 'Brochure / Broschüre',
    'nav.account': 'Mon compte / Mein Konto',
    'nav.login': 'Connexion / Anmelden',
    'nav.logout': 'Déconnexion / Abmelden',
    'nav.cart': 'Panier / Warenkorb',
    'nav.market': 'Marché / Markt',
    'hero.ribbon': 'Origine Tunisie / Tunesien',
    'hero.title': 'Huile d\'olive extra vierge en gros / Natives Olivenöl extra im Grosshandel',
    'hero.lead': 'HB Commerce distribue <strong>FIAFI</strong> pour les professionnels au <strong>Luxembourg</strong> et dans la Grande Région — première pression à froid, Tunisie.',
    'hero.pill1': 'Extra vierge / Nativ extra',
    'hero.pill2': 'Tunisie / Tunesien',
    'hero.pill3': 'Grosshandel / Vente en gros',
    'hero.cta.order': 'Commander / Bestellen',
    'hero.cta.account': 'Compte pro / Geschäftskonto',
    'product.tag': 'Produit phare / Top-Produkt',
    'product.name': 'FIAFI — Huile d\'olive extra vierge',
    'product.sub': 'Première pression à froid · Tunisie / Kaltpressung · Tunesien',
    'product.price': 'xx',
    'product.cta': 'Ajouter au panier / In den Warenkorb',
    'section.products': 'Nos produits / Unsere Produkte',
    'section.products.sub': 'Grosshandel — Luxembourg & Grande Région',
    'section.about': 'Pourquoi HB Commerce ? / Warum HB Commerce?',
    'section.about.sub': 'HB Consulting & Services — Luxembourg',
    'about.import': 'Import direct / Direktimport',
    'about.import.desc': 'FIAFI aus Tunesien — natives Olivenöl extra für Gastronomie und Handel.',
    'about.wholesale': 'Vente en gros / Grosshandel',
    'about.wholesale.desc': 'Mengen für Restaurants, Hotels, Caterer und Grosshändler.',
    'about.online': 'Commande en ligne / Online-Bestellung',
    'about.online.desc': 'Kundenbereich, Auftragsverfolgung und sichere Zahlung.',
    'section.contact': 'Contact Luxembourg / Kontakt Luxemburg',
    'section.contact.sub': 'Professionelle Anfragen und Bestellungen',
    'footer.brochure': 'Brochure Luxembourg / Broschüre Luxemburg',
    'brochure.title': 'Brochure FIAFI — Luxembourg',
    'brochure.market': 'Marché : Luxembourg / Markt: Luxemburg'
  }
};

function t(key, vars = {}) {
  const lang = window.HB_CURRENT_LANG || HB_DEFAULT_LANG;
  let str = HB_TRANSLATIONS[lang]?.[key] || HB_TRANSLATIONS[HB_DEFAULT_LANG]?.[key] || key;
  Object.entries(vars).forEach(([k, v]) => {
    str = str.replace(`{${k}}`, v);
  });
  return str;
}

function applyTranslations(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  root.querySelectorAll('[data-i18n-html]').forEach((el) => {
    el.innerHTML = t(el.getAttribute('data-i18n-html'));
  });
  const titleEl = document.querySelector('title[data-i18n]');
  if (titleEl) document.title = t(titleEl.getAttribute('data-i18n'));
  const metaDesc = document.querySelector('meta[data-i18n-desc]');
  if (metaDesc) metaDesc.setAttribute('content', t(metaDesc.getAttribute('data-i18n-desc')));
}

function initI18n() {
  const market = typeof getMarket === 'function' ? getMarket() : null;
  window.HB_CURRENT_LANG = market?.lang === 'lu' ? 'lu' : 'fr';
  document.documentElement.lang = window.HB_CURRENT_LANG === 'lu' ? 'fr' : 'fr';
  applyTranslations();
}

document.addEventListener('DOMContentLoaded', initI18n);
