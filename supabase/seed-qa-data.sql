-- Données initiales module QA HB Commerce
-- Idempotent : ON CONFLICT DO NOTHING sur req_id / test_id

insert into public.qa_requirements (req_id, name, description, priority, category, dev_status, owner) values
  ('REQ-001', 'Connexion client', 'Authentification e-mail / mot de passe via Supabase Auth', 'Critique', 'Authentification', 'developpe', 'HB Commerce'),
  ('REQ-002', 'Inscription professionnelle', 'Wizard multi-étapes avec validation SIREN/TVA', 'Critique', 'Authentification', 'developpe', 'HB Commerce'),
  ('REQ-003', 'Catalogue produits B2B', 'Affichage catalogue, prix masqués si non connecté', 'Critique', 'Catalogue', 'developpe', 'HB Commerce'),
  ('REQ-004', 'Panier et checkout', 'Panier localStorage, validation stock, création commande', 'Critique', 'Commandes', 'developpe', 'HB Commerce'),
  ('REQ-005', 'Suivi de commande', 'Timeline 7 étapes, historique événements, temps réel', 'Haute', 'Commandes', 'developpe', 'HB Commerce'),
  ('REQ-006', 'Espace client', 'Profil, historique commandes, factures, chat', 'Haute', 'Espace client', 'developpe', 'HB Commerce'),
  ('REQ-007', 'Administration commandes', 'Gestion statuts, suivi livraison, transporteur', 'Haute', 'Administration', 'developpe', 'HB Commerce'),
  ('REQ-008', 'Gestion stock', 'Réapprovisionnement, alertes rupture, déduction à la commande', 'Haute', 'Stock', 'developpe', 'HB Commerce'),
  ('REQ-009', 'Multi-marchés FR/LU', 'Sélecteur marché, brochures, devises', 'Moyenne', 'International', 'developpe', 'HB Commerce'),
  ('REQ-010', 'Paiement Stripe / virement', 'Choix mode paiement au checkout', 'Haute', 'Paiement', 'en_cours', 'HB Commerce'),
  ('REQ-011', 'Responsive mobile', 'Navigation, catalogue et dashboards adaptés mobile', 'Haute', 'UX', 'developpe', 'HB Commerce'),
  ('REQ-012', 'Module QA', 'Exigences, tests, traçabilité, rapports', 'Haute', 'Qualité', 'en_cours', 'HB Commerce')
on conflict (req_id) do nothing;

insert into public.qa_test_cases (test_id, req_ref, title, description, preconditions, steps, expected_result, test_type, priority, status, playwright_file) values
  ('TEST-001', 'REQ-001', 'Connexion valide', 'Connexion avec identifiants corrects', 'Compte client actif', '1. Ouvrir login.html\n2. Saisir e-mail et mot de passe\n3. Soumettre', 'Redirection vers compte ou dashboard', 'automatique', 'Critique', 'non_execute', 'auth.spec.ts'),
  ('TEST-002', 'REQ-001', 'Connexion invalide', 'Message erreur si identifiants incorrects', 'Page login accessible', '1. Saisir e-mail valide\n2. Mauvais mot de passe\n3. Soumettre', 'Message d''erreur affiché, pas de redirection', 'automatique', 'Critique', 'non_execute', 'auth.spec.ts'),
  ('TEST-003', 'REQ-001', 'Déconnexion', 'Déconnexion depuis espace client', 'Utilisateur connecté', '1. Cliquer Déconnexion', 'Redirection accueil, session terminée', 'automatique', 'Haute', 'non_execute', 'auth.spec.ts'),
  ('TEST-004', 'REQ-002', 'Page inscription accessible', 'Formulaire inscription charge', 'Aucune', '1. Ouvrir register.html', 'Formulaire visible', 'automatique', 'Haute', 'non_execute', 'registration.spec.ts'),
  ('TEST-005', 'REQ-002', 'Validation champs obligatoires', 'Champs requis bloquent soumission', 'Page inscription', '1. Soumettre formulaire vide', 'Validation HTML ou message erreur', 'automatique', 'Haute', 'non_execute', 'registration.spec.ts'),
  ('TEST-006', 'REQ-003', 'Catalogue charge', 'Produits affichés sur produits.html', 'Site accessible', '1. Ouvrir produits.html', 'Grille produits ou état vide', 'automatique', 'Haute', 'non_execute', 'catalog.spec.ts'),
  ('TEST-007', 'REQ-004', 'Page panier accessible', 'Panier charge sans erreur', 'Aucune', '1. Ouvrir panier.html', 'Page panier affichée', 'automatique', 'Haute', 'non_execute', 'orders.spec.ts'),
  ('TEST-008', 'REQ-005', 'Suivi commande protégé', 'Redirection login si non connecté', 'Déconnecté', '1. Ouvrir suivi-commande.html', 'Redirection login.html', 'automatique', 'Critique', 'non_execute', 'orders.spec.ts'),
  ('TEST-009', 'REQ-005', 'Page suivi structure', 'Éléments UI suivi présents', 'Connecté (mock si besoin)', '1. Charger suivi-commande.html', 'Timeline et liste visibles', 'automatique', 'Haute', 'non_execute', 'orders.spec.ts'),
  ('TEST-010', 'REQ-006', 'Espace compte protégé', 'requireAuth sur compte.html', 'Déconnecté', '1. Ouvrir compte.html', 'Redirection login', 'automatique', 'Critique', 'non_execute', 'dashboard.spec.ts'),
  ('TEST-011', 'REQ-006', 'Navigation onglets compte', 'Onglets commandes/profil/chat', 'Connecté', '1. Ouvrir compte\n2. Cliquer onglets', 'Panneaux alternent', 'automatique', 'Moyenne', 'non_execute', 'dashboard.spec.ts'),
  ('TEST-012', 'REQ-011', 'Responsive mobile accueil', 'Nav mobile sur index', 'Viewport 375px', '1. Réduire viewport\n2. Ouvrir menu', 'Menu mobile fonctionnel', 'automatique', 'Haute', 'non_execute', 'responsive.spec.ts'),
  ('TEST-013', 'REQ-012', 'Module QA accessible admin', 'Page qa.html garde admin', 'Admin connecté', '1. Ouvrir qa.html', 'Dashboard QA visible', 'automatique', 'Haute', 'non_execute', 'qa-module.spec.ts'),
  ('TEST-014', 'REQ-008', 'Page stock admin', 'stock.html accessible backoffice', 'Admin', '1. Ouvrir stock.html', 'Interface stock chargée', 'manuel', 'Moyenne', 'non_execute', null)
on conflict (test_id) do nothing;

-- Lier requirement_id depuis req_ref
update public.qa_test_cases tc
set requirement_id = r.id
from public.qa_requirements r
where tc.req_ref = r.req_id
  and tc.requirement_id is null;
