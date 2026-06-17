/**
 * Marchés HB Commerce — France & Luxembourg
 * (Remplace la brochure Arabie saoudite AR/EN)
 */
const HB_MARKETS = {
  fr: {
    id: 'fr',
    label: 'France',
    flag: 'FR',
    lang: 'fr',
    currency: 'EUR',
    brochurePage: 'brochure-france.html',
    contact: {
      phone: '07 52 56 51 23',
      email: 'contact@hbconsulting.fr',
      address: 'France — distribution nationale'
    },
    images: {
      product: 'assets/markets/france/product.svg',
      hero: 'assets/markets/france/hero.svg',
      brochureCover: 'assets/markets/france/brochure-cover.svg',
      driveId: '1SshjBp8ibdt14PwxdtdNscuBQM5iLRkp'
    }
  },
  lu: {
    id: 'lu',
    label: 'Luxembourg',
    flag: 'LU',
    lang: 'lu',
    currency: 'EUR',
    brochurePage: 'brochure-luxembourg.html',
    contact: {
      phone: '07 52 56 51 23',
      email: 'contact@hbconsulting.fr',
      address: 'Luxembourg & Grande Région'
    },
    images: {
      product: 'assets/markets/luxembourg/product.svg',
      hero: 'assets/markets/luxembourg/hero.svg',
      brochureCover: 'assets/markets/luxembourg/brochure-cover.svg',
      driveId: '1SshjBp8ibdt14PwxdtdNscuBQM5iLRkp'
    }
  }
};

const HB_DEFAULT_MARKET = 'fr';

function getMarketId() {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('market');
  if (fromUrl && HB_MARKETS[fromUrl]) return fromUrl;
  const stored = localStorage.getItem('hb_market');
  if (stored && HB_MARKETS[stored]) return stored;
  return HB_DEFAULT_MARKET;
}

function getMarket() {
  return HB_MARKETS[getMarketId()] || HB_MARKETS[HB_DEFAULT_MARKET];
}

function setMarket(id) {
  if (!HB_MARKETS[id]) return;
  localStorage.setItem('hb_market', id);
  const url = new URL(window.location.href);
  url.searchParams.set('market', id);
  window.location.href = url.toString();
}

function marketImageUrl(market, type = 'product', width = 1200) {
  const m = market || getMarket();
  const driveId = m.images?.driveId;
  if (driveId) {
    return `https://drive.google.com/thumbnail?id=${driveId}&sz=w${width}`;
  }
  return m.images?.[type] || '';
}

function resolveMarketImage(market, type = 'product', width = 1200) {
  const m = market || getMarket();
  const local = m.images?.[type] || m.images?.product;
  const drive = m.images?.driveId
    ? `https://drive.google.com/thumbnail?id=${m.images.driveId}&sz=w${width}`
    : null;
  // Local en priorite : Drive renvoie souvent du HTML (image cassee) si fichier prive
  return {
    primary: local,
    fallback: drive,
    driveAlt: drive
      ? `https://drive.google.com/uc?export=view&id=${m.images.driveId}`
      : local
  };
}

window.HB_MARKETS = HB_MARKETS;
window.getMarketId = getMarketId;
window.getMarket = getMarket;
window.setMarket = setMarket;
window.marketImageUrl = marketImageUrl;
window.resolveMarketImage = resolveMarketImage;
