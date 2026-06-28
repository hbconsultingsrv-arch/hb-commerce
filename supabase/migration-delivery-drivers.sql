-- HB Commerce — Livreurs & assignation livraisons
-- Exécuter dans Supabase SQL Editor après schema.sql
-- Ensuite : migration-agent-driver-assignment.sql et migration-agent-order-create.sql
-- OU en une fois : migration-livreurs-setup-complete.sql

-- Table livreurs
CREATE TABLE IF NOT EXISTS delivery_drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text,
  phone text,
  vehicle_info text,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Lien profil ↔ livreur
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS driver_id uuid REFERENCES delivery_drivers(id) ON DELETE SET NULL;

-- Assignation commande ↔ livreur
ALTER TABLE orders ADD COLUMN IF NOT EXISTS assigned_driver_id uuid REFERENCES delivery_drivers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_assigned_driver ON orders(assigned_driver_id);
CREATE INDEX IF NOT EXISTS idx_profiles_driver_id ON profiles(driver_id);

-- Étendre le rôle livreur (adapter si votre contrainte CHECK a un autre nom)
DO $$
BEGIN
  ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
  ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (
    role IN (
      'pending_company', 'client', 'supplier', 'livreur',
      'agent_commercial', 'admin', 'super_root'
    )
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Vérifiez manuellement le CHECK role sur profiles : %', SQLERRM;
END $$;

-- RLS delivery_drivers
ALTER TABLE delivery_drivers ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS "Admins manage drivers" ON delivery_drivers;
CREATE POLICY "Admins manage drivers"
  ON delivery_drivers FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "Drivers read own row" ON delivery_drivers;
CREATE POLICY "Drivers read own row"
  ON delivery_drivers FOR SELECT
  USING (id = public.auth_driver_id() AND public.auth_driver_id() IS NOT NULL);

-- Livreur : lecture commandes assignées
DROP POLICY IF EXISTS "Driver reads assigned orders" ON orders;
CREATE POLICY "Driver reads assigned orders"
  ON orders FOR SELECT
  USING (
    public.auth_driver_id() IS NOT NULL
    AND assigned_driver_id = public.auth_driver_id()
  );

-- Livreur : mise à jour champs livraison uniquement
DROP POLICY IF EXISTS "Driver updates delivery fields" ON orders;
CREATE POLICY "Driver updates delivery fields"
  ON orders FOR UPDATE
  USING (
    public.auth_driver_id() IS NOT NULL
    AND assigned_driver_id = public.auth_driver_id()
  )
  WITH CHECK (
    public.auth_driver_id() IS NOT NULL
    AND assigned_driver_id = public.auth_driver_id()
  );

-- Lecture profils clients pour adresse (livreur voit les clients de ses livraisons)
DROP POLICY IF EXISTS "Driver reads delivery customer profiles" ON profiles;
CREATE POLICY "Driver reads delivery customer profiles"
  ON profiles FOR SELECT
  USING (
    public.auth_driver_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM orders o
      WHERE o.user_id = profiles.id
        AND o.assigned_driver_id = public.auth_driver_id()
    )
  );

COMMENT ON TABLE delivery_drivers IS 'Livreurs / transporteurs HB Commerce';
COMMENT ON COLUMN orders.assigned_driver_id IS 'Livreur assigné à la course';
