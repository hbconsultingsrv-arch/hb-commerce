-- HB Commerce — Corriger la récursion infinie RLS sur profiles
-- Symptôme : connexion affiche « infinite recursion detected in policy for relation profiles »
-- Cause : politiques livreurs qui relisent profiles dans le USING (sans SECURITY DEFINER)
-- Exécuter dans Supabase SQL Editor après migration-livreurs-setup-complete.sql

CREATE OR REPLACE FUNCTION public.auth_driver_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT driver_id
  FROM public.profiles
  WHERE id = auth.uid() AND role = 'livreur'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_livreur()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND role = 'livreur'
  );
$$;

-- delivery_drivers
DROP POLICY IF EXISTS "Admins manage drivers" ON public.delivery_drivers;
CREATE POLICY "Admins manage drivers"
  ON public.delivery_drivers FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Commercial agents read drivers" ON public.delivery_drivers;
CREATE POLICY "Commercial agents read drivers"
  ON public.delivery_drivers FOR SELECT
  USING (public.is_commercial_agent());

DROP POLICY IF EXISTS "Drivers read own row" ON public.delivery_drivers;
CREATE POLICY "Drivers read own row"
  ON public.delivery_drivers FOR SELECT
  USING (id = public.auth_driver_id() AND public.auth_driver_id() IS NOT NULL);

-- orders (livreur)
DROP POLICY IF EXISTS "Driver reads assigned orders" ON public.orders;
CREATE POLICY "Driver reads assigned orders"
  ON public.orders FOR SELECT
  USING (
    public.auth_driver_id() IS NOT NULL
    AND assigned_driver_id = public.auth_driver_id()
  );

DROP POLICY IF EXISTS "Driver updates delivery fields" ON public.orders;
CREATE POLICY "Driver updates delivery fields"
  ON public.orders FOR UPDATE
  USING (
    public.auth_driver_id() IS NOT NULL
    AND assigned_driver_id = public.auth_driver_id()
  )
  WITH CHECK (
    public.auth_driver_id() IS NOT NULL
    AND assigned_driver_id = public.auth_driver_id()
  );

-- profiles (clients visibles par le livreur sur ses courses)
DROP POLICY IF EXISTS "Driver reads delivery customer profiles" ON public.profiles;
CREATE POLICY "Driver reads delivery customer profiles"
  ON public.profiles FOR SELECT
  USING (
    public.auth_driver_id() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.user_id = profiles.id
        AND o.assigned_driver_id = public.auth_driver_id()
    )
  );

COMMENT ON FUNCTION public.auth_driver_id() IS 'ID livreur lié au profil connecté (SECURITY DEFINER, évite récursion RLS)';
COMMENT ON FUNCTION public.is_livreur() IS 'True si l utilisateur connecté est livreur (SECURITY DEFINER)';
