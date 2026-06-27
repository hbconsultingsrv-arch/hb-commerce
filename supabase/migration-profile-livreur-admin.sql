-- HB Commerce — Admin : gestion profils livreur + agents
-- Exécuter après migration-delivery-drivers.sql

DROP POLICY IF EXISTS "Admin manage client profiles" ON public.profiles;
CREATE POLICY "Admin manage client profiles" ON public.profiles FOR ALL
  USING (
    public.is_admin()
    AND role IN ('pending_company', 'client', 'supplier', 'agent_commercial', 'livreur')
  )
  WITH CHECK (
    public.is_admin()
    AND role IN ('pending_company', 'client', 'supplier', 'agent_commercial', 'livreur')
  );

CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF old.role IS DISTINCT FROM new.role
    AND NOT public.is_super_root()
    AND NOT (
      public.is_admin()
      AND old.role IN ('pending_company', 'client', 'supplier', 'agent_commercial', 'livreur')
      AND new.role IN ('pending_company', 'client', 'supplier', 'agent_commercial', 'livreur')
    )
    AND session_user NOT IN ('postgres', 'supabase_admin')
  THEN
    RAISE EXCEPTION 'Seul le super root peut modifier les roles internes (admin, super_root).';
  END IF;
  IF new.role IN ('agent_commercial', 'admin', 'super_root', 'livreur') THEN
    new.company := COALESCE(NULLIF(new.company, ''), 'HB Commerce');
  END IF;
  RETURN new;
END;
$$;
