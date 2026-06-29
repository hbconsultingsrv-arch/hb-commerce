-- HB Commerce — Bootstrap super root demo + accès équipe HB
-- Symptôme : super-root.html affiche « Équipe HB Commerce » vide
-- Cause : profil sans role super_root → RLS bloque la lecture des profils internes
-- Exécuter dans Supabase SQL Editor (demo uniquement)

CREATE OR REPLACE FUNCTION public.bootstrap_demo_super_root()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_role text;
BEGIN
  SELECT lower(u.email) INTO v_email
  FROM auth.users u
  WHERE u.id = auth.uid();

  IF v_email IS DISTINCT FROM 'super@hbcommerce.demo' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_demo_super_email');
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, company)
  SELECT
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', 'Super Root HB'),
    'super_root',
    'HB Commerce'
  FROM auth.users u
  WHERE u.id = auth.uid()
  ON CONFLICT (id) DO UPDATE SET
    role = 'super_root',
    company = 'HB Commerce',
    email = EXCLUDED.email,
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name);

  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();

  RETURN jsonb_build_object('ok', true, 'role', v_role);
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_demo_super_root() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bootstrap_demo_super_root() TO authenticated;

COMMENT ON FUNCTION public.bootstrap_demo_super_root() IS
  'Demo : promeut super@hbcommerce.demo en super_root pour débloquer la liste Équipe HB (SECURITY DEFINER).';
