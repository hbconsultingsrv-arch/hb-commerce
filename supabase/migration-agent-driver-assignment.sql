-- HB Commerce — Agent commercial : lecture livreurs + assignation sur ses commandes
-- PREREQUIS : exécuter d'abord migration-delivery-drivers.sql
-- OU utiliser migration-livreurs-setup-complete.sql (tout-en-un)

DROP POLICY IF EXISTS "Admins manage drivers" ON public.delivery_drivers;
CREATE POLICY "Admins manage drivers"
  ON public.delivery_drivers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_root')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_root')
    )
  );

DROP POLICY IF EXISTS "Commercial agents read drivers" ON public.delivery_drivers;
CREATE POLICY "Commercial agents read drivers"
  ON public.delivery_drivers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'agent_commercial'
    )
  );

COMMENT ON POLICY "Commercial agents read drivers" ON public.delivery_drivers IS
  'Lecture seule — assignation livreur sur commandes clients assignés';
