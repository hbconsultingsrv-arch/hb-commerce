-- FAYAFI — Catalogue complet (bouteilles, metallique, premium)
-- Executer dans Supabase SQL Editor

alter table public.products add column if not exists packaging_type text;
alter table public.products add column if not exists format_label text;
alter table public.products add column if not exists acidity text;
alter table public.products add column if not exists volume_ml int;

-- Remplacer l'ancien produit unique par le catalogue complet
insert into public.products (
  name, slug, description, origin, category, packaging_type, format_label,
  acidity, volume_ml, price, unit, min_quantity, image_url, tag, sort_order, active
) values
  (
    'FAYAFI Premium — Extra vierge 1L',
    'fayafi-premium-1l-bouteille',
    'Huile d''olive extra vierge premium. Premiere pression a froid. Acidite <= 0,5 %. Bouteille verre 1 litre.',
    'Tunisie', 'premium', 'bouteille', '1 L — Premium', '<= 0,5 %', 1000,
    5.90, 'bouteille', 12, 'assets/products/premium-1l.svg', 'Premium', 1, true
  ),
  (
    'FAYAFI — Marasca 250 ml',
    'fayafi-marasca-250ml',
    'Format Marasca 250 ml. Extra vierge, ideal restauration et cavistes.',
    'Tunisie', 'bouteille', 'bouteille', 'Marasca 250 ml', '<= 0,8 %', 250,
    2.95, 'bouteille', 24, 'assets/products/marasca-250.svg', 'Marasca', 2, true
  ),
  (
    'FAYAFI — Extra vierge 1L bouteille',
    'fayafi-extra-vierge-1l-bouteille',
    'Bouteille verre 1 litre. Extra vierge, premiere pression a froid.',
    'Tunisie', 'bouteille', 'bouteille', '1 L bouteille', '<= 0,8 %', 1000,
    5.20, 'bouteille', 12, 'assets/products/bouteille-1l.svg', 'Bouteille', 3, true
  ),
  (
    'FAYAFI — Metallique 1L',
    'fayafi-metallique-1l',
    'Bidon metallique 1 litre. Extra vierge — cuisine professionnelle.',
    'Tunisie', 'metallique', 'metallique', '1 L metallique', '<= 0,8 %', 1000,
    4.80, 'litre', 12, 'assets/products/metallique-1l.svg', 'Metallique', 4, true
  ),
  (
    'FAYAFI — Metallique 3L',
    'fayafi-metallique-3l',
    'Bidon metallique 3 litres. Format economique restauration et grossistes.',
    'Tunisie', 'metallique', 'metallique', '3 L metallique', '<= 0,8 %', 3000,
    4.40, 'litre', 4, 'assets/products/metallique-3l.svg', 'Metallique', 5, true
  ),
  (
    'FAYAFI — Metallique 5L',
    'fayafi-metallique-5l',
    'Bidon metallique 5 litres. Format gros le plus demande.',
    'Tunisie', 'metallique', 'metallique', '5 L metallique', '<= 0,8 %', 5000,
    4.20, 'litre', 4, 'assets/products/metallique-5l.svg', 'Best-seller', 6, true
  )
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  packaging_type = excluded.packaging_type,
  format_label = excluded.format_label,
  acidity = excluded.acidity,
  volume_ml = excluded.volume_ml,
  price = excluded.price,
  unit = excluded.unit,
  min_quantity = excluded.min_quantity,
  image_url = excluded.image_url,
  tag = excluded.tag,
  sort_order = excluded.sort_order,
  active = excluded.active;

-- Desactiver l'ancien slug si present
update public.products set active = false where slug = 'fayafi-huile-olive';
