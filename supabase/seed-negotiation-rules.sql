insert into public.negotiation_discount_rules (label, min_quantity, max_quantity, discount_percent, requires_approval, sort_order) values
  ('Volume standard', 0, 499.99, 0, false, 1),
  ('À partir de 500 L', 500, 999.99, 3, false, 2),
  ('À partir de 1 000 L', 1000, 4999.99, 5, false, 3),
  ('Gros volume 5 000 L+', 5000, null, 8, true, 4)
on conflict do nothing;
