/**
 * Images produit FAYAFI — Google Drive
 * Fichier : https://drive.google.com/file/d/1SshjBp8ibdt14PwxdtdNscuBQM5iLRkp/view
 * Partage requis : « Tous les utilisateurs disposant du lien » → Lecteur
 */
const FAYAFI_DRIVE_ID = '1SshjBp8ibdt14PwxdtdNscuBQM5iLRkp';

function googleDriveImage(id, width = 1200) {
  return `https://drive.google.com/thumbnail?id=${id}&sz=w${width}`;
}

window.HB_BRANDING = {
  fayafiDriveId: FAYAFI_DRIVE_ID,
  images: {
    product: googleDriveImage(FAYAFI_DRIVE_ID, 1200),
    hero: googleDriveImage(FAYAFI_DRIVE_ID, 2000),
    thumb: googleDriveImage(FAYAFI_DRIVE_ID, 600),
    /** URL alternative si thumbnail bloquée */
    productAlt: `https://drive.google.com/uc?export=view&id=${FAYAFI_DRIVE_ID}`
  },
  productName: 'FAYAFI',
  productFullName: 'FAYAFI — Huile d\'olive extra vierge',
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

function getFayafiImageUrl(size = 1200) {
  return window.HB_BRANDING?.images?.product || googleDriveImage(FAYAFI_DRIVE_ID, size);
}

function applyFayafiImageFallback(img) {
  if (!img || img.dataset.fallbackApplied) return;
  img.addEventListener('error', () => {
    if (!img.dataset.fallbackApplied) {
      img.dataset.fallbackApplied = '1';
      img.src = window.HB_BRANDING.images.productAlt;
    }
  }, { once: true });
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('img[data-fayafi]').forEach(applyFayafiImageFallback);
});
