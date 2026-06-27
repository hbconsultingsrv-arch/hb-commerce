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

CREATE POLICY "Admins manage drivers"
  ON delivery_drivers FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_root', 'agent_commercial'))
  );

CREATE POLICY "Drivers read own row"
  ON delivery_drivers FOR SELECT
  USING (
    id IN (SELECT driver_id FROM profiles WHERE id = auth.uid() AND role = 'livreur')
  );

-- Livreur : lecture commandes assignées
CREATE POLICY "Driver reads assigned orders"
  ON orders FOR SELECT
  USING (
    assigned_driver_id IN (SELECT driver_id FROM profiles WHERE id = auth.uid() AND role = 'livreur')
  );

-- Livreur : mise à jour champs livraison uniquement
CREATE POLICY "Driver updates delivery fields"
  ON orders FOR UPDATE
  USING (
    assigned_driver_id IN (SELECT driver_id FROM profiles WHERE id = auth.uid() AND role = 'livreur')
  )
  WITH CHECK (
    assigned_driver_id IN (SELECT driver_id FROM profiles WHERE id = auth.uid() AND role = 'livreur')
  );

-- Lecture profils clients pour adresse (livreur voit les clients de ses livraisons)
CREATE POLICY "Driver reads delivery customer profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      JOIN profiles me ON me.id = auth.uid() AND me.role = 'livreur'
      WHERE o.user_id = profiles.id
        AND o.assigned_driver_id = me.driver_id
    )
  );

COMMENT ON TABLE delivery_drivers IS 'Livreurs / transporteurs HB Commerce';
COMMENT ON COLUMN orders.assigned_driver_id IS 'Livreur assigné à la course';
