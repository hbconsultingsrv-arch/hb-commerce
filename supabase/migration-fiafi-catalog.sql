-- FIAFI — Catalogue complet (bouteilles, metallique, premium)
-- Executer dans Supabase SQL Editor

alter table public.products add column if not exists packaging_type text;
alter table public.products add column if not exists format_label text;
alter table public.products add column if not exists acidity text;
alter table public.products add column if not exists volume_ml int;

-- Eviter les doublons si l'ancien catalogue existe deja en base.
update public.products
set active = false
where slug like ('fa' || 'yafi%');

-- Remplacer l'ancien produit unique par le catalogue complet
insert into public.products (
  name, slug, description, origin, category, packaging_type, format_label,
  acidity, volume_ml, price, unit, min_quantity, image_url, tag, sort_order, active
) values
  (
    'FIAFI Premium — Extra vierge 1L',
    'fiafi-premium-1l-bouteille',
    'Huile d''olive extra vierge premium. Premiere pression a froid. Acidite <= 0,5 %. Bouteille verre 1 litre.',
    'Tunisie', 'premium', 'bouteille', '1 L — Premium', '<= 0,5 %', 1000,
    5.90, 'bouteille', 12, 'images/prenium.PNG', 'Premium', 1, true
  ),
  (
    'FIAFI — Marasca 250 ml',
    'fiafi-marasca-250ml',
    'Format Marasca 250 ml. Extra vierge, ideal restauration et cavistes.',
    'Tunisie', 'bouteille', 'bouteille', 'Marasca 250 ml', '<= 0,8 %', 250,
    2.95, 'bouteille', 24, 'images/marasca.PNG', 'Marasca', 2, true
  ),
  (
    'FIAFI — Extra vierge 1L bouteille',
    'fiafi-extra-vierge-1l-bouteille',
    'Bouteille verre 1 litre. Extra vierge, premiere pression a froid.',
    'Tunisie', 'bouteille', 'bouteille', '1 L bouteille', '<= 0,8 %', 1000,
    5.20, 'bouteille', 12, 'images/marasca.PNG', 'Bouteille', 3, true
  ),
  (
    'FIAFI — Metallique 1L',
    'fiafi-metallique-1l',
    'Bidon metallique 1 litre. Extra vierge — cuisine professionnelle.',
    'Tunisie', 'metallique', 'metallique', '1 L metallique', '<= 0,8 %', 1000,
    4.80, 'litre', 12, 'images/metallic.PNG', 'Metallique', 4, true
  ),
  (
    'FIAFI — Metallique 3L',
    'fiafi-metallique-3l',
    'Bidon metallique 3 litres. Format economique restauration et grossistes.',
    'Tunisie', 'metallique', 'metallique', '3 L metallique', '<= 0,8 %', 3000,
    4.40, 'litre', 4, 'images/metallic.PNG', 'Metallique', 5, true
  ),
  (
    'FIAFI — Metallique 5L',
    'fiafi-metallique-5l',
    'Bidon metallique 5 litres. Format gros le plus demande.',
    'Tunisie', 'metallique', 'metallique', '5 L metallique', '<= 0,8 %', 5000,
    4.20, 'litre', 4, 'images/metallic.PNG', 'Best-seller', 6, true
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
update public.products
set active = false
where slug in ('fiafi-huile-olive', 'fa' || 'yafi-huile-olive');
