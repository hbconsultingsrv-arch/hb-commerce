/**
 * Catalogue FIAFI - aligne site et brochure
 * Texte ASCII + formatAcidity() (<= affiche en symbole inferieur ou egal)
 */
const LE = '\u2264';
const FIAFI_PREFIX = 'fiafi';
const LEGACY_FIAFI_PREFIX = ['fa', 'yafi'].join('');

function formatAcidity(value) {
  if (!value) return '';
  return String(value)
    .replace(/^<=\s*/, LE + ' ')
    .replace(/^\?\s*/, LE + ' ');
}

function normalizeFiafiSlug(slug) {
  if (!slug) return slug;
  const value = String(slug);
  return value.toLowerCase().startsWith(LEGACY_FIAFI_PREFIX)
    ? FIAFI_PREFIX + value.slice(LEGACY_FIAFI_PREFIX.length)
    : value;
}

function normalizeFiafiText(value) {
  if (!value) return value;
  return String(value).replace(new RegExp(LEGACY_FIAFI_PREFIX, 'gi'), (match) => {
    if (match === match.toUpperCase()) return 'FIAFI';
    if (match[0] === match[0].toUpperCase()) return 'Fiafi';
    return FIAFI_PREFIX;
  });
}

function normalizeFiafiProduct(product) {
  if (!product) return product;
  return {
    ...product,
    id: normalizeFiafiSlug(product.id),
    slug: normalizeFiafiSlug(product.slug),
    name: normalizeFiafiText(product.name)
  };
}

const FIAFI_CATEGORIES = {
  bouteille: {
    id: 'bouteille',
    label: 'Bouteilles',
    icon: '',
    description: 'Verre Marasca et formats premium pour restauration et cavistes.',
    image: FIAFI_IMAGES?.marasca || 'images/marasca.PNG'
  },
  metallique: {
    id: 'metallique',
    label: 'Metallique',
    icon: '',
    description: 'Bidons metalliques 1L, 3L et 5L - ideal grossistes et cuisine pro.',
    image: FIAFI_IMAGES?.metallic || 'images/metallic.PNG'
  },
  premium: {
    id: 'premium',
    label: 'Premium extra vierge',
    icon: '',
    description: 'Selection premium, premiere pression a froid, acidite controlee.',
    image: FIAFI_IMAGES?.premium || 'images/prenium.PNG'
  }
};

const FIAFI_QUALITY = {
  title: 'Qualite & acidite',
  intro: 'Huile d\'olive extra vierge FIAFI - olives Koroneiki et Arbosana, pression a froid en Tunisie du Nord.',
  specs: [
    { label: 'Cat&eacute;gorie', value: 'Huile d\'olive extra vierge' },
    { label: 'Acidit&eacute; libre', value: LE + ' 0,8 % (extra vierge)' },
    { label: 'Premium FIAFI', value: LE + ' 0,5 % - selection haute qualite' },
    { label: 'Selection premium', value: '0,2 % a 0,4 % (Koroneiki & Arbosana)' },
    { label: 'Pression', value: 'Premiere pression a froid' },
    { label: 'Origine', value: 'Tunisie - Mornag, Ben Arous' },
    { label: 'Indice de peroxyde', value: LE + ' 20 meq O2/kg' },
    { label: 'Humidit&eacute;', value: LE + ' 0,2 %' }
  ],
  image: FIAFI_IMAGES?.acidity || 'images/acidity.PNG'
};

function catalogImage(packaging, format) {
  const img = FIAFI_IMAGES || {};
  const map = {
    'bouteille-marasca': img.marasca || 'images/marasca.PNG',
    'bouteille-1l': img.marasca || 'images/marasca.PNG',
    'bouteille-premium': img.premium || 'images/prenium.PNG',
    'metallique-1l': img.metallic || 'images/metallic.PNG',
    'metallique-3l': img.metallic || 'images/metallic.PNG',
    'metallique-5l': img.metallic || 'images/metallic.PNG'
  };
  const key = `${packaging}-${format}`;
  return map[key] || img.product || 'images/prenium.PNG';
}

function buildFiafiCatalog() {
  return [
    {
      id: 'fiafi-premium-1l',
      name: 'FIAFI Premium - Extra vierge 1L',
      slug: 'fiafi-premium-1l-bouteille',
      description: 'Huile d\'olive extra vierge premium. Premiere pression a froid. Acidite <= 0,5 %. Bouteille verre 1 litre.',
      origin: 'Tunisie',
      category: 'premium',
      packaging_type: 'bouteille',
      format_label: '1 L - Premium',
      acidity: '<= 0,5 %',
      volume_ml: 1000,
      price: 5.90,
      unit: 'bouteille',
      min_quantity: 12,
      image_url: catalogImage('bouteille', 'premium'),
      tag: 'Premium',
      active: true,
      sort_order: 1
    },
    {
      id: 'fiafi-marasca-250',
      name: 'FIAFI - Marasca 250 ml',
      slug: 'fiafi-marasca-250ml',
      description: 'Format Marasca 250 ml. Extra vierge, ideal restauration, echantillons et cavistes.',
      origin: 'Tunisie',
      category: 'bouteille',
      packaging_type: 'bouteille',
      format_label: 'Marasca 250 ml',
      acidity: '<= 0,8 %',
      volume_ml: 250,
      price: 2.95,
      unit: 'bouteille',
      min_quantity: 24,
      image_url: catalogImage('bouteille', 'marasca'),
      tag: 'Marasca',
      active: true,
      sort_order: 2
    },
    {
      id: 'fiafi-bouteille-1l',
      name: 'FIAFI - Extra vierge 1L bouteille',
      slug: 'fiafi-extra-vierge-1l-bouteille',
      description: 'Bouteille verre 1 litre. Extra vierge, premiere pression a froid.',
      origin: 'Tunisie',
      category: 'bouteille',
      packaging_type: 'bouteille',
      format_label: '1 L bouteille',
      acidity: '<= 0,8 %',
      volume_ml: 1000,
      price: 5.20,
      unit: 'bouteille',
      min_quantity: 12,
      image_url: catalogImage('bouteille', '1l'),
      tag: 'Bouteille',
      active: true,
      sort_order: 3
    },
    {
      id: 'fiafi-metallique-1l',
      name: 'FIAFI - Metallique 1L',
      slug: 'fiafi-metallique-1l',
      description: 'Bidon metallique 1 litre. Extra vierge - pratique pour la cuisine professionnelle.',
      origin: 'Tunisie',
      category: 'metallique',
      packaging_type: 'metallique',
      format_label: '1 L metallique',
      acidity: '<= 0,8 %',
      volume_ml: 1000,
      price: 4.80,
      unit: 'litre',
      min_quantity: 12,
      image_url: catalogImage('metallique', '1l'),
      tag: 'Metallique',
      active: true,
      sort_order: 4
    },
    {
      id: 'fiafi-metallique-3l',
      name: 'FIAFI - Metallique 3L',
      slug: 'fiafi-metallique-3l',
      description: 'Bidon metallique 3 litres. Format economique pour restauration et grossistes.',
      origin: 'Tunisie',
      category: 'metallique',
      packaging_type: 'metallique',
      format_label: '3 L metallique',
      acidity: '<= 0,8 %',
      volume_ml: 3000,
      price: 4.40,
      unit: 'litre',
      min_quantity: 4,
      image_url: catalogImage('metallique', '3l'),
      tag: 'Metallique',
      active: true,
      sort_order: 5
    },
    {
      id: 'fiafi-metallique-5l',
      name: 'FIAFI - Metallique 5L',
      slug: 'fiafi-metallique-5l',
      description: 'Bidon metallique 5 litres. Le format le plus demande en commerce de gros.',
      origin: 'Tunisie',
      category: 'metallique',
      packaging_type: 'metallique',
      format_label: '5 L metallique',
      acidity: '<= 0,8 %',
      volume_ml: 5000,
      price: 4.20,
      unit: 'litre',
      min_quantity: 4,
      image_url: catalogImage('metallique', '5l'),
      tag: 'Best-seller',
      active: true,
      sort_order: 6
    }
  ];
}

function buildBrochureGallery() {
  const img = FIAFI_IMAGES || {};
  return [
    { image: img.premium || 'images/prenium.PNG', label: 'Premium 1 L' },
    { image: img.marasca || 'images/marasca.PNG', label: 'Marasca 250 ml - 1 L' },
    { image: img.metallic || 'images/metallic.PNG', label: 'Metallique 1 L - 3 L - 5 L' }
  ];
}

const FIAFI_BROCHURE_LABELS = {
  premium: 'Premium extra vierge',
  bouteille: 'Bouteilles',
  metallique: 'M&eacute;tallique'
};

function mergeProductsWithCatalog(dbList) {
  const fiafiCatalog = buildFiafiCatalog();
  const demoCatalog = typeof buildHbDemoCatalog === 'function' ? buildHbDemoCatalog() : [];
  const bySlug = new Map();

  dbList.forEach((p) => {
    const product = normalizeFiafiProduct(p);
    const slug = (product.slug || '').toLowerCase();
    const name = (product.name || '').toLowerCase();
    const isFiafi = slug.includes('fiafi') || name.includes('fiafi');
    const enriched = isFiafi ? enrichFiafiFromCatalog(product) : product;
    bySlug.set(product.slug, enriched);
  });

  [...fiafiCatalog, ...demoCatalog].forEach((catItem) => {
    if (!catItem.active) return;
    if (!bySlug.has(catItem.slug)) {
      bySlug.set(catItem.slug, { ...catItem, id: catItem.id || catItem.slug });
    }
  });

  return Array.from(bySlug.values()).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
}

const FIAFI_SLUG_IMAGES = (() => {
  const map = {};
  buildFiafiCatalog().forEach((p) => { map[p.slug] = p.image_url; });
  return map;
})();

function getFiafiProductImage(product) {
  const slug = normalizeFiafiSlug(product?.slug) || '';
  if (FIAFI_SLUG_IMAGES[slug]) return FIAFI_SLUG_IMAGES[slug];
  const img = FIAFI_IMAGES || {};
  const cat = product?.category || '';
  if (cat === 'premium') return img.premium || 'images/prenium.PNG';
  if (cat === 'metallique') return img.metallic || 'images/metallic.PNG';
  if (cat === 'bouteille') return img.marasca || 'images/marasca.PNG';
  return img.product || 'images/prenium.PNG';
}

function enrichFiafiFromCatalog(dbProduct) {
  const catalog = buildFiafiCatalog();
  const match = catalog.find((p) => p.slug === dbProduct.slug);
  const imageUrl = getFiafiProductImage({
    slug: dbProduct.slug,
    category: dbProduct.category || match?.category
  });

  if (!match) {
    return { ...dbProduct, image_url: imageUrl };
  }

  return {
    ...match,
    ...dbProduct,
    id: dbProduct.id || match.id || match.slug,
    format_label: dbProduct.format_label || match.format_label,
    acidity: dbProduct.acidity || match.acidity,
    category: dbProduct.category || match.category,
    packaging_type: dbProduct.packaging_type || match.packaging_type,
    image_url: imageUrl
  };
}

window.FIAFI_CATEGORIES = FIAFI_CATEGORIES;
window.FIAFI_QUALITY = FIAFI_QUALITY;
window.FIAFI_BROCHURE_LABELS = FIAFI_BROCHURE_LABELS;
window.buildFiafiCatalog = buildFiafiCatalog;
window.buildBrochureGallery = buildBrochureGallery;
window.formatAcidity = formatAcidity;
window.getFiafiProductImage = getFiafiProductImage;
window.mergeProductsWithCatalog = mergeProductsWithCatalog;
window.normalizeFiafiProduct = normalizeFiafiProduct;
