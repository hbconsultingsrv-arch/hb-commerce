/**
 * Marchés HB Commerce — France & Luxembourg
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
      product: 'images/prenium.PNG',
      hero: 'images/image1.PNG',
      brochureCover: 'images/image1.PNG',
      welcome: 'images/image2.PNG',
      premium: 'images/prenium.PNG',
      marasca: 'images/marasca.PNG',
      metallic: 'images/metallic.PNG',
      acidity: 'images/acidity.PNG',
      technology: 'images/technology.PNG',
      contact: 'images/contact.PNG'
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
      product: 'images/prenium.PNG',
      hero: 'images/image1.PNG',
      brochureCover: 'images/image1.PNG',
      welcome: 'images/image2.PNG',
      premium: 'images/prenium.PNG',
      marasca: 'images/marasca.PNG',
      metallic: 'images/metallic.PNG',
      acidity: 'images/acidity.PNG',
      technology: 'images/technology.PNG',
      contact: 'images/contact.PNG'
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
  return m.images?.[type] || m.images?.product || '';
}

function resolveMarketImage(market, type = 'product', width = 1200) {
  const m = market || getMarket();
  const local = m.images?.[type] || m.images?.product;
  return { primary: local, fallback: local, driveAlt: local };
}

window.HB_MARKETS = HB_MARKETS;
window.getMarketId = getMarketId;
window.getMarket = getMarket;
window.setMarket = setMarket;
window.marketImageUrl = marketImageUrl;
window.resolveMarketImage = resolveMarketImage;
