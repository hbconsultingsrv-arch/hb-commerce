-- HB Commerce — Agent commercial : lecture livreurs + assignation sur ses commandes
-- PREREQUIS : exécuter d'abord migration-delivery-drivers.sql
-- OU utiliser migration-livreurs-setup-complete.sql (tout-en-un)

DROP POLICY IF EXISTS "Admins manage drivers" ON public.delivery_drivers;
CREATE POLICY "Admins manage drivers"
  ON public.delivery_drivers FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Commercial agents read drivers" ON public.delivery_drivers;
CREATE POLICY "Commercial agents read drivers"
  ON public.delivery_drivers FOR SELECT
  USING (public.is_commercial_agent());

COMMENT ON POLICY "Commercial agents read drivers" ON public.delivery_drivers IS
  'Lecture seule — assignation livreur sur commandes clients assignés';
