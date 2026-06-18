-- HB Commerce — Jeu de données de demonstration
-- =============================================================
-- PREREQUIS : executer d'abord supabase/schema.sql (+ migrations si base existante)
--
-- MOT DE PASSE pour TOUS les comptes demo : Test1234!
--
-- Comptes crees :
--   super@hbcommerce.demo          → super_root
--   admin@hbcommerce.demo          → admin
--   agent.martin@hbcommerce.demo   → agent_commercial (Jean Martin)
--   agent.dubois@hbcommerce.demo   → agent_commercial (Sophie Dubois)
--   contact@restaurant-paris.demo  → client (Le Jasmin) — agent Martin
--   achats@traiteur-lyon.demo      → client (Traiteur Lyon) — agent Martin
--   commandes@epicerie-bdx.demo    → client (Epicerie Bordeaux) — agent Dubois
--   direction@hotel-nice.demo      → client (Hotel Riviera) — agent Dubois
--   inscription@nouvelle-societe.demo → pending_company
--   stock@fiafi-tunisie.demo       → supplier (FIAFI Tunisie)
-- =============================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- UUID fixes (reproductibles)
-- ---------------------------------------------------------------------------
-- Utilisateurs internes HB Commerce
-- super_root, admin, agent1, agent2
-- Clients, pending, supplier user
-- Entite fournisseur, commandes demo

do $$
declare
  v_super   uuid := 'a0000001-0001-4001-8001-000000000001';
  v_admin   uuid := 'a0000001-0001-4001-8001-000000000002';
  v_agent1  uuid := 'a0000001-0001-4001-8001-000000000003';
  v_agent2  uuid := 'a0000001-0001-4001-8001-000000000004';
  v_client1 uuid := 'a0000001-0001-4001-8001-000000000011';
  v_client2 uuid := 'a0000001-0001-4001-8001-000000000012';
  v_client3 uuid := 'a0000001-0001-4001-8001-000000000013';
  v_client4 uuid := 'a0000001-0001-4001-8001-000000000014';
  v_pending uuid := 'a0000001-0001-4001-8001-000000000015';
  v_supusr  uuid := 'a0000001-0001-4001-8001-000000000021';
  v_supplier uuid := 'b0000001-0001-4001-8001-000000000001';
  v_order1  uuid := 'c0000001-0001-4001-8001-000000000001';
  v_order2  uuid := 'c0000001-0001-4001-8001-000000000002';
  v_order3  uuid := 'c0000001-0001-4001-8001-000000000003';
  v_order4  uuid := 'c0000001-0001-4001-8001-000000000004';
  v_order5  uuid := 'c0000001-0001-4001-8001-000000000005';
  v_order6  uuid := 'c0000001-0001-4001-8001-000000000006';
  v_pwd text := crypt('Test1234!', gen_salt('bf'));
begin
  -- Nettoyage des donnees demo precedentes (re-execution safe)
  delete from public.chat_messages where company_id in (
    v_client1, v_client2, v_client3, v_client4
  );
  delete from public.order_items where order_id in (v_order1, v_order2, v_order3, v_order4, v_order5, v_order6);
  delete from public.orders where id in (v_order1, v_order2, v_order3, v_order4, v_order5, v_order6);
  delete from public.customer_prices where profile_id in (v_client1, v_client2, v_client3, v_client4);
  delete from public.supplier_orders where supplier_id = v_supplier;
  delete from public.product_stocks where supplier_id = v_supplier;
  delete from public.profiles where id in (
    v_super, v_admin, v_agent1, v_agent2,
    v_client1, v_client2, v_client3, v_client4, v_pending, v_supusr
  );
  delete from auth.identities where user_id in (
    v_super, v_admin, v_agent1, v_agent2,
    v_client1, v_client2, v_client3, v_client4, v_pending, v_supusr
  );
  delete from auth.users where id in (
    v_super, v_admin, v_agent1, v_agent2,
    v_client1, v_client2, v_client3, v_client4, v_pending, v_supusr
  );
  delete from public.suppliers where id = v_supplier;

  -- -------------------------------------------------------------------------
  -- Fournisseur FIAFI Tunisie
  -- -------------------------------------------------------------------------
  insert into public.suppliers (
    id, name, contact_name, email, phone, address, siren, vat_number, country, notes, active
  ) values (
    v_supplier,
    'FIAFI Tunisie — Mornag',
    'Karim Ben Salah',
    'stock@fiafi-tunisie.demo',
    '+216 71 000 000',
    'Zone industrielle Mornag, Ben Arous, Tunisie',
    '000123456',
    'TN000123456',
    'Tunisie',
    'Fournisseur principal huile FIAFI',
    true
  );

  -- -------------------------------------------------------------------------
  -- Utilisateurs auth (mot de passe : Test1234!)
  -- -------------------------------------------------------------------------
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, is_super_admin, is_sso_user
  ) values
    ('00000000-0000-0000-0000-000000000000', v_super,   'authenticated', 'authenticated', 'super@hbcommerce.demo',          v_pwd, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Super Root HB","company":"HB Commerce"}', now(), now(), '', false, false),
    ('00000000-0000-0000-0000-000000000000', v_admin,   'authenticated', 'authenticated', 'admin@hbcommerce.demo',          v_pwd, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Admin HB Commerce","company":"HB Commerce"}', now(), now(), '', false, false),
    ('00000000-0000-0000-0000-000000000000', v_agent1,  'authenticated', 'authenticated', 'agent.martin@hbcommerce.demo',   v_pwd, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Jean Martin","company":"HB Commerce"}', now(), now(), '', false, false),
    ('00000000-0000-0000-0000-000000000000', v_agent2,  'authenticated', 'authenticated', 'agent.dubois@hbcommerce.demo',   v_pwd, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Sophie Dubois","company":"HB Commerce"}', now(), now(), '', false, false),
    ('00000000-0000-0000-0000-000000000000', v_client1, 'authenticated', 'authenticated', 'contact@restaurant-paris.demo',    v_pwd, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Ahmed Benali","company":"Restaurant Le Jasmin"}', now(), now(), '', false, false),
    ('00000000-0000-0000-0000-000000000000', v_client2, 'authenticated', 'authenticated', 'achats@traiteur-lyon.demo',        v_pwd, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Marie Leroy","company":"Traiteur Lyon Gourmet"}', now(), now(), '', false, false),
    ('00000000-0000-0000-0000-000000000000', v_client3, 'authenticated', 'authenticated', 'commandes@epicerie-bdx.demo',      v_pwd, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Pierre Durand","company":"Epicerie Bordeaux Sud"}', now(), now(), '', false, false),
    ('00000000-0000-0000-0000-000000000000', v_client4, 'authenticated', 'authenticated', 'direction@hotel-nice.demo',        v_pwd, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Isabelle Moreau","company":"Hotel Riviera Nice"}', now(), now(), '', false, false),
    ('00000000-0000-0000-0000-000000000000', v_pending, 'authenticated', 'authenticated', 'inscription@nouvelle-societe.demo', v_pwd, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Nouveau Contact","company":"Societe En Attente SAS"}', now(), now(), '', false, false),
    ('00000000-0000-0000-0000-000000000000', v_supusr,  'authenticated', 'authenticated', 'stock@fiafi-tunisie.demo',         v_pwd, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Karim Ben Salah","company":"FIAFI Tunisie"}', now(), now(), '', false, false);

  insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  select gen_random_uuid(), u.id,
    jsonb_build_object('sub', u.id::text, 'email', u.email),
    'email', u.id::text, now(), now(), now()
  from auth.users u
  where u.id in (v_super, v_admin, v_agent1, v_agent2, v_client1, v_client2, v_client3, v_client4, v_pending, v_supusr);

  -- Profils (le trigger handle_new_user a deja cree des profils basiques — on les met a jour)
  insert into public.profiles (
    id, email, full_name, phone, address, company, siren, vat_number, role, commercial_agent_id, supplier_id
  ) values
    (v_super,   'super@hbcommerce.demo',           'Super Root HB',      '+33 1 00 00 01', '10 rue du Commerce, Paris',       'HB Commerce',              null,       null,          'super_root',       null,     null),
    (v_admin,   'admin@hbcommerce.demo',           'Admin HB Commerce',  '+33 1 00 00 02', '10 rue du Commerce, Paris',       'HB Commerce',              null,       null,          'admin',            null,     null),
    (v_agent1,  'agent.martin@hbcommerce.demo',    'Jean Martin',        '+33 6 11 11 11 11', '10 rue du Commerce, Paris',    'HB Commerce',              null,       null,          'agent_commercial', null,     null),
    (v_agent2,  'agent.dubois@hbcommerce.demo',    'Sophie Dubois',      '+33 6 22 22 22 22', '10 rue du Commerce, Paris',    'HB Commerce',              null,       null,          'agent_commercial', null,     null),
    (v_client1, 'contact@restaurant-paris.demo',   'Ahmed Benali',       '+33 1 44 00 00 01', '12 avenue de la Republique, 75011 Paris', 'Restaurant Le Jasmin', '832123456', 'FR45832123456', 'client', v_agent1, null),
    (v_client2, 'achats@traiteur-lyon.demo',       'Marie Leroy',        '+33 4 78 00 00 02', '45 rue Merciere, 69002 Lyon',     'Traiteur Lyon Gourmet',    '801234567', 'FR80801234567', 'client', v_agent1, null),
    (v_client3, 'commandes@epicerie-bdx.demo',     'Pierre Durand',      '+33 5 56 00 00 03', '8 cours Victor Hugo, 33000 Bordeaux', 'Epicerie Bordeaux Sud', '902345678', 'FR90902345678', 'client', v_agent2, null),
    (v_client4, 'direction@hotel-nice.demo',       'Isabelle Moreau',    '+33 4 93 00 00 04', '15 promenade des Anglais, 06000 Nice', 'Hotel Riviera Nice',  '753456789', 'FR75753456789', 'client', v_agent2, null),
    (v_pending, 'inscription@nouvelle-societe.demo','Nouveau Contact',    '+33 1 99 99 99 99', '1 rue Test, 75001 Paris',         'Societe En Attente SAS',   '999888777', 'FR99988877766', 'pending_company', null, null),
    (v_supusr,  'stock@fiafi-tunisie.demo',        'Karim Ben Salah',    '+216 71 000 000',   'Zone industrielle Mornag, Tunisie', 'FIAFI Tunisie',        '000123456', 'TN000123456',   'supplier', null, v_supplier)
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    phone = excluded.phone,
    address = excluded.address,
    company = excluded.company,
    siren = excluded.siren,
    vat_number = excluded.vat_number,
    role = excluded.role,
    commercial_agent_id = excluded.commercial_agent_id,
    supplier_id = excluded.supplier_id;

  -- -------------------------------------------------------------------------
  -- Produits FIAFI (catalogue + lien fournisseur)
  -- -------------------------------------------------------------------------
  insert into public.products (
    name, slug, description, origin, category, price, unit, min_quantity, image_url, tag, sort_order, active, supplier_id
  ) values
    ('FIAFI Premium — Extra vierge 1L', 'fiafi-premium-1l-bouteille',
     'Huile premium premiere pression a froid.', 'Tunisie', 'premium', 5.90, 'bouteille', 12,
     'https://drive.google.com/thumbnail?id=1SshjBp8ibdt14PwxdtdNscuBQM5iLRkp&sz=w1200', 'Premium', 1, true, v_supplier),
    ('FIAFI — Marasca 250 ml', 'fiafi-marasca-250ml',
     'Format Marasca 250 ml restauration.', 'Tunisie', 'bouteille', 2.95, 'bouteille', 24,
     'https://drive.google.com/thumbnail?id=1SshjBp8ibdt14PwxdtdNscuBQM5iLRkp&sz=w1200', 'Marasca', 2, true, v_supplier),
    ('FIAFI — Extra vierge 1L bouteille', 'fiafi-extra-vierge-1l-bouteille',
     'Bouteille verre 1 litre extra vierge.', 'Tunisie', 'bouteille', 5.20, 'bouteille', 12,
     'https://drive.google.com/thumbnail?id=1SshjBp8ibdt14PwxdtdNscuBQM5iLRkp&sz=w1200', 'Bouteille', 3, true, v_supplier),
    ('FIAFI — Metallique 1L', 'fiafi-metallique-1l',
     'Bidon metallique 1 litre cuisine pro.', 'Tunisie', 'metallique', 4.80, 'litre', 12,
     'https://drive.google.com/thumbnail?id=1SshjBp8ibdt14PwxdtdNscuBQM5iLRkp&sz=w1200', 'Metallique', 4, true, v_supplier),
    ('FIAFI — Metallique 3L', 'fiafi-metallique-3l',
     'Bidon metallique 3 litres grossistes.', 'Tunisie', 'metallique', 4.40, 'litre', 4,
     'https://drive.google.com/thumbnail?id=1SshjBp8ibdt14PwxdtdNscuBQM5iLRkp&sz=w1200', 'Metallique', 5, true, v_supplier),
    ('FIAFI — Metallique 5L', 'fiafi-metallique-5l',
     'Bidon metallique 5 litres best-seller.', 'Tunisie', 'metallique', 4.20, 'litre', 4,
     'https://drive.google.com/thumbnail?id=1SshjBp8ibdt14PwxdtdNscuBQM5iLRkp&sz=w1200', 'Best-seller', 6, true, v_supplier)
  on conflict (slug) do update set
    name = excluded.name,
    price = excluded.price,
    supplier_id = excluded.supplier_id,
    active = true;

  -- -------------------------------------------------------------------------
  -- Stock fournisseur
  -- -------------------------------------------------------------------------
  insert into public.product_stocks (supplier_id, product_slug, quantity, reserved_quantity, lead_time_days) values
    (v_supplier, 'fiafi-premium-1l-bouteille',     480,  24,  5),
    (v_supplier, 'fiafi-marasca-250ml',            1200, 48,  3),
    (v_supplier, 'fiafi-extra-vierge-1l-bouteille', 720,  36,  5),
    (v_supplier, 'fiafi-metallique-1l',            960,  60,  4),
    (v_supplier, 'fiafi-metallique-3l',            320,  16,  7),
    (v_supplier, 'fiafi-metallique-5l',            180,  20, 10);

  -- -------------------------------------------------------------------------
  -- Commandes d'approvisionnement HB → fournisseur
  -- -------------------------------------------------------------------------
  insert into public.supplier_orders (
    supplier_id, product_slug, quantity, status, expected_arrival_date, tracking_number, notes
  ) values
    (v_supplier, 'fiafi-metallique-5l', 200, 'shipped',     current_date + 5,  'TN-EXP-2026-001', 'Reappro urgent metallique 5L'),
    (v_supplier, 'fiafi-marasca-250ml', 500, 'accepted',    current_date + 10, null,              'Commande reguliere Marasca'),
    (v_supplier, 'fiafi-premium-1l-bouteille', 150, 'requested', current_date + 14, null,         'Selection premium Q2');

  -- -------------------------------------------------------------------------
  -- Prix personnalises par client
  -- -------------------------------------------------------------------------
  insert into public.customer_prices (profile_id, product_slug, price) values
    (v_client1, 'fiafi-metallique-5l',          3.95),
    (v_client1, 'fiafi-metallique-3l',          4.10),
    (v_client2, 'fiafi-marasca-250ml',          2.70),
    (v_client2, 'fiafi-extra-vierge-1l-bouteille', 4.85),
    (v_client3, 'fiafi-metallique-1l',          4.50),
    (v_client4, 'fiafi-premium-1l-bouteille',   5.40);

  -- -------------------------------------------------------------------------
  -- Commandes clients (statuts varies + suivi livraison)
  -- -------------------------------------------------------------------------
  insert into public.orders (
    id, user_id, total, status, payment_method, shipping_address,
    delivery_status, carrier, tracking_number, tracking_url,
    estimated_delivery_date, delivered_at, delivery_notes, notes, created_at
  ) values
    (v_order1, v_client1, 153.60,  'livree',              'virement', '12 avenue de la Republique, 75011 Paris',
     'livree', 'DHL Freight', 'DHL-FR-778899', 'https://www.dhl.com/fr-fr/home/tracking.html',
     current_date - 10, now() - interval '8 days', 'Livraison entrepot arriere', 'Commande mensuelle restaurant', now() - interval '20 days'),
    (v_order2, v_client1, 94.80,   'en_preparation',      'virement', '12 avenue de la Republique, 75011 Paris',
     'preparation', null, null, null, current_date + 4, null, null, 'Reassort metallique 5L', now() - interval '3 days'),
    (v_order3, v_client2, 246.00,  'payee',               'stripe',   '45 rue Merciere, 69002 Lyon',
     'expediee', 'Chronopost Pro', 'CP-55667788', 'https://www.chronopost.fr/tracking-no-cms/suivi-page',
     current_date + 2, null, 'Palette filmee', 'Commande traiteur evenementiel', now() - interval '7 days'),
    (v_order4, v_client3, 270.00,  'validee',             'cheque',   '8 cours Victor Hugo, 33000 Bordeaux',
     'non_preparee', null, null, null, current_date + 6, null, null, 'En attente cheque', now() - interval '2 days'),
    (v_order5, v_client4, 129.60,  'en_attente_paiement', 'virement', '15 promenade des Anglais, 06000 Nice',
     'non_preparee', null, null, null, current_date + 8, null, null, 'Devis premium hotel', now() - interval '1 day'),
    (v_order6, v_client3, 176.00,  'annulee',             'virement', '8 cours Victor Hugo, 33000 Bordeaux',
     'retour', null, null, null, null, null, 'Annulee par le client', 'Test commande annulee', now() - interval '15 days');

  insert into public.order_items (order_id, product_id, product_name, quantity, unit_price, unit) values
    (v_order1, 'fiafi-metallique-5l', 'FIAFI — Metallique 5L', 24, 4.20, 'litre'),
    (v_order1, 'fiafi-metallique-3l', 'FIAFI — Metallique 3L', 12, 4.40, 'litre'),
    (v_order2, 'fiafi-metallique-5l', 'FIAFI — Metallique 5L', 24, 3.95, 'litre'),
    (v_order3, 'fiafi-marasca-250ml', 'FIAFI — Marasca 250 ml', 48, 2.70, 'bouteille'),
    (v_order3, 'fiafi-extra-vierge-1l-bouteille', 'FIAFI — Extra vierge 1L bouteille', 24, 4.85, 'bouteille'),
    (v_order4, 'fiafi-metallique-1l', 'FIAFI — Metallique 1L', 60, 4.50, 'litre'),
    (v_order5, 'fiafi-premium-1l-bouteille', 'FIAFI Premium — Extra vierge 1L', 24, 5.40, 'bouteille'),
    (v_order6, 'fiafi-metallique-1l', 'FIAFI — Metallique 1L', 40, 4.40, 'litre');

  -- -------------------------------------------------------------------------
  -- Chat societes (messages clients + reponses agents/admin, moderation)
  -- -------------------------------------------------------------------------
  insert into public.chat_messages (company_id, author_id, author_role, message, status, moderated_by, moderated_at, created_at) values
    -- Restaurant Le Jasmin (agent Martin)
    (v_client1, v_client1, 'client',            'Bonjour, nous souhaitons un tarif preferentiel sur le metallique 5L pour 24 bidons/mois.', 'approved', v_agent1, now() - interval '5 days', now() - interval '5 days'),
    (v_client1, v_agent1, 'agent_commercial',  'Bonjour Ahmed, je vous propose 3,95 EUR/L sur le 5L avec engagement mensuel.', 'approved', null, null, now() - interval '5 days' + interval '2 hours'),
    (v_client1, v_client1, 'client',            'Parfait, pouvez-vous valider ma commande en cours ?', 'approved', v_agent1, now() - interval '2 days', now() - interval '2 days'),
    (v_client1, v_client1, 'client',            'Message test en attente de moderation.', 'pending', null, null, now() - interval '1 hour'),

    -- Traiteur Lyon (agent Martin)
    (v_client2, v_client2, 'client',            'Nous avons un mariage samedi prochain, delai Marasca 250 ml ?', 'approved', v_agent1, now() - interval '6 days', now() - interval '6 days'),
    (v_client2, v_agent1, 'agent_commercial',  'Stock disponible, expedition sous 48h si commande validee aujourd''hui.', 'approved', null, null, now() - interval '6 days' + interval '1 hour'),
    (v_client2, v_client2, 'client',            'Publicite interne — message refuse.', 'rejected', v_admin, now() - interval '4 days', now() - interval '4 days'),

    -- Epicerie Bordeaux (agent Dubois)
    (v_client3, v_client3, 'client',            'Bonjour, devis pour 60 bidons metallique 1L.', 'approved', v_agent2, now() - interval '3 days', now() - interval '3 days'),
    (v_client3, v_agent2, 'agent_commercial',  'Bonjour Pierre, prix client 4,50 EUR/L valide sur votre compte.', 'approved', null, null, now() - interval '3 days' + interval '3 hours'),
    (v_client3, v_client3, 'client',            'Le cheque part demain, merci de preparer la commande.', 'pending', null, null, now() - interval '30 minutes'),

    -- Hotel Riviera (agent Dubois)
    (v_client4, v_client4, 'client',            'Nous voulons la gamme premium pour notre buffet petit-dejeuner.', 'approved', v_agent2, now() - interval '2 days', now() - interval '2 days'),
    (v_client4, v_agent2, 'agent_commercial',  'Tarif hotel negocie : 5,40 EUR/bouteille premium 1L.', 'approved', null, null, now() - interval '2 days' + interval '1 hour'),
    (v_client4, v_admin, 'admin',              'Validation admin : conditions de paiement 30 jours acceptees.', 'approved', null, null, now() - interval '1 day');

end $$;

-- ---------------------------------------------------------------------------
-- Verification rapide
-- ---------------------------------------------------------------------------
select role, count(*) as nb from public.profiles group by role order by role;
select status, count(*) as nb from public.orders group by status order by status;
select status, count(*) as nb from public.chat_messages group by status order by status;
select product_slug, quantity, reserved_quantity, lead_time_days from public.product_stocks order by product_slug;
