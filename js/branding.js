/**
 * Images produit FIAFI — Google Drive
 * Fichier : https://drive.google.com/file/d/1SshjBp8ibdt14PwxdtdNscuBQM5iLRkp/view
 * Partage requis : « Tous les utilisateurs disposant du lien » → Lecteur
 */
const FIAFI_DRIVE_ID = '1SshjBp8ibdt14PwxdtdNscuBQM5iLRkp';

function googleDriveImage(id, width = 1200) {
  return `https://drive.google.com/thumbnail?id=${id}&sz=w${width}`;
}

window.HB_BRANDING = {
  siteName: 'HB Commerce',
  siteTagline: 'HB Consulting & Services · B2B',
  fiafiDriveId: FIAFI_DRIVE_ID,
  images: {
    product: googleDriveImage(FIAFI_DRIVE_ID, 1200),
    hero: googleDriveImage(FIAFI_DRIVE_ID, 2000),
    thumb: googleDriveImage(FIAFI_DRIVE_ID, 600),
    /** URL alternative si thumbnail bloquée */
    productAlt: `https://drive.google.com/uc?export=view&id=${FIAFI_DRIVE_ID}`
  },
  productName: 'FIAFI',
  productFullName: 'FIAFI — Huile d\'olive extra vierge',
  origin: 'Tunisie',
  colors: {
    olive: '#3d5c3a',
    oliveDark: '#2a4228',
    oliveLight: '#5a7d52',
    gold: '#c9a227',
    goldLight: '#e8c547',
    cream: '#f5f0e6',
    bottle: '#faf8f4'
  }
};

function getFiafiImageUrl(size = 1200) {
  if (typeof resolveMarketImage === 'function') {
    return resolveMarketImage(getMarket(), 'product', size).primary;
  }
  return window.HB_BRANDING?.images?.product || googleDriveImage(FIAFI_DRIVE_ID, size);
}

function applyFiafiImageFallback(img) {
  if (!img || img.dataset.fallbackApplied) return;
  img.addEventListener('error', () => {
    if (!img.dataset.fallbackApplied) {
      img.dataset.fallbackApplied = '1';
      img.src = window.HB_BRANDING.images.productAlt;
    }
  }, { once: true });
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('img[data-fiafi]').forEach(applyFiafiImageFallback);
});
