-- Exécuter APRÈS inscription sur le site (compte créé)
-- Remplacez l'e-mail si nécessaire

update public.profiles
set role = 'admin'
where email = 'salahmiz@gmail.com';
