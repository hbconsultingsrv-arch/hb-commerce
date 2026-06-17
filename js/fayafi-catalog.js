/**
 * Catalogue FAYAFI — aligne site et brochure (bouteilles, metallique, qualite)
 */
const FAYAFI_CATEGORIES = {
  bouteille: {
    id: 'bouteille',
    label: 'Bouteilles',
    icon: '??',
    description: 'Verre Marasca et formats premium pour restauration et cavistes.',
    image: FAYAFI_IMAGES?.marasca || 'images/marasca.PNG'
  },
  metallique: {
    id: 'metallique',
    label: 'Métallique',
    icon: '??',
    description: 'Bidons métalliques 1L, 3L et 5L — idéal grossistes et cuisine pro.',
    image: FAYAFI_IMAGES?.metallic || 'images/metallic.PNG'
  },
  premium: {
    id: 'premium',
    label: 'Premium extra vierge',
    icon: '?',
    description: 'Sélection premium, première pression à froid, acidité contrôlée.',
    image: FAYAFI_IMAGES?.premium || 'images/prenium.PNG'
  }
};

const FAYAFI_QUALITY = {
  title: 'Qualité & acidité',
  intro: 'Huile d\'olive extra vierge FAYAFI — olives Koroneiki et Arbosana, pression à froid en Tunisie du Nord.',
  specs: [
    { label: 'Catégorie', value: 'Huile d\'olive extra vierge' },
    { label: 'Acidité libre', value: '? 0,8 % (extra vierge)' },
    { label: 'Premium FAYAFI', value: '? 0,5 % — sélection haute qualité' },
    { label: 'Sélection premium', value: '0,2 % à 0,4 % (Koroneiki & Arbosana)' },
    { label: 'Pression', value: 'Première pression à froid' },
    { label: 'Origine', value: 'Tunisie — Mornag, Ben Arous' },
    { label: 'Indice de peroxyde', value: '? 20 meq O?/kg' },
    { label: 'Humidité', value: '? 0,2 %' }
  ],
  image: FAYAFI_IMAGES?.acidity || 'images/acidity.PNG'
};

function catalogImage(packaging, format) {
  const img = FAYAFI_IMAGES || {};
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

function buildFayafiCatalog() {
  return [
    {
      id: 'fayafi-premium-1l',
      name: 'FAYAFI Premium — Extra vierge 1L',
      slug: 'fayafi-premium-1l-bouteille',
      description: 'Huile d\'olive extra vierge premium. Première pression à froid. Acidité ? 0,5 %. Bouteille verre 1 litre.',
      origin: 'Tunisie',
      category: 'premium',
      packaging_type: 'bouteille',
      format_label: '1 L — Premium',
      acidity: '? 0,5 %',
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
      id: 'fayafi-marasca-250',
      name: 'FAYAFI — Marasca 250 ml',
      slug: 'fayafi-marasca-250ml',
      description: 'Format Marasca 250 ml. Extra vierge, idéal restauration, échantillons et cavistes.',
      origin: 'Tunisie',
      category: 'bouteille',
      packaging_type: 'bouteille',
      format_label: 'Marasca 250 ml',
      acidity: '? 0,8 %',
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
      id: 'fayafi-bouteille-1l',
      name: 'FAYAFI — Extra vierge 1L bouteille',
      slug: 'fayafi-extra-vierge-1l-bouteille',
      description: 'Bouteille verre 1 litre. Extra vierge, première pression à froid.',
      origin: 'Tunisie',
      category: 'bouteille',
      packaging_type: 'bouteille',
      format_label: '1 L bouteille',
      acidity: '? 0,8 %',
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
      id: 'fayafi-metallique-1l',
      name: 'FAYAFI — Métallique 1L',
      slug: 'fayafi-metallique-1l',
      description: 'Bidon métallique 1 litre. Extra vierge — pratique pour la cuisine professionnelle.',
      origin: 'Tunisie',
      category: 'metallique',
      packaging_type: 'metallique',
      format_label: '1 L métallique',
      acidity: '? 0,8 %',
      volume_ml: 1000,
      price: 4.80,
      unit: 'litre',
      min_quantity: 12,
      image_url: catalogImage('metallique', '1l'),
      tag: 'Métallique',
      active: true,
      sort_order: 4
    },
    {
      id: 'fayafi-metallique-3l',
      name: 'FAYAFI — Métallique 3L',
      slug: 'fayafi-metallique-3l',
      description: 'Bidon métallique 3 litres. Format économique pour restauration et grossistes.',
      origin: 'Tunisie',
      category: 'metallique',
      packaging_type: 'metallique',
      format_label: '3 L métallique',
      acidity: '? 0,8 %',
      volume_ml: 3000,
      price: 4.40,
      unit: 'litre',
      min_quantity: 4,
      image_url: catalogImage('metallique', '3l'),
      tag: 'Métallique',
      active: true,
      sort_order: 5
    },
    {
      id: 'fayafi-metallique-5l',
      name: 'FAYAFI — Métallique 5L',
      slug: 'fayafi-metallique-5l',
      description: 'Bidon métallique 5 litres. Le format le plus demandé en commerce de gros.',
      origin: 'Tunisie',
      category: 'metallique',
      packaging_type: 'metallique',
      format_label: '5 L métallique',
      acidity: '? 0,8 %',
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

window.FAYAFI_CATEGORIES = FAYAFI_CATEGORIES;
window.FAYAFI_QUALITY = FAYAFI_QUALITY;
window.buildFayafiCatalog = buildFayafiCatalog;
