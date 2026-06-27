-- HB Commerce — Livreurs + agent (commandes & assignation)
-- Exécuter EN UNE FOIS dans Supabase SQL Editor
-- (Remplace migration-delivery-drivers + migration-agent-driver-assignment + migration-agent-order-create)

-- ── 1. Table livreurs ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.delivery_drivers (
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

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS driver_id uuid REFERENCES public.delivery_drivers(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS assigned_driver_id uuid REFERENCES public.delivery_drivers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_assigned_driver ON public.orders(assigned_driver_id);
CREATE INDEX IF NOT EXISTS idx_profiles_driver_id ON public.profiles(driver_id);

-- Rôle livreur sur profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (
  role IN (
    'pending_company', 'client', 'supplier', 'livreur',
    'agent_commercial', 'admin', 'super_root'
  )
);

-- ── 2. RLS delivery_drivers ─────────────────────────────────────
ALTER TABLE public.delivery_drivers ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS "Drivers read own row" ON public.delivery_drivers;
CREATE POLICY "Drivers read own row"
  ON public.delivery_drivers FOR SELECT
  USING (
    id IN (SELECT driver_id FROM public.profiles WHERE id = auth.uid() AND role = 'livreur')
  );

-- ── 3. RLS livreur sur commandes ────────────────────────────────
DROP POLICY IF EXISTS "Driver reads assigned orders" ON public.orders;
CREATE POLICY "Driver reads assigned orders"
  ON public.orders FOR SELECT
  USING (
    assigned_driver_id IN (
      SELECT driver_id FROM public.profiles WHERE id = auth.uid() AND role = 'livreur'
    )
  );

DROP POLICY IF EXISTS "Driver updates delivery fields" ON public.orders;
CREATE POLICY "Driver updates delivery fields"
  ON public.orders FOR UPDATE
  USING (
    assigned_driver_id IN (
      SELECT driver_id FROM public.profiles WHERE id = auth.uid() AND role = 'livreur'
    )
  )
  WITH CHECK (
    assigned_driver_id IN (
      SELECT driver_id FROM public.profiles WHERE id = auth.uid() AND role = 'livreur'
    )
  );

DROP POLICY IF EXISTS "Driver reads delivery customer profiles" ON public.profiles;
CREATE POLICY "Driver reads delivery customer profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.profiles me ON me.id = auth.uid() AND me.role = 'livreur'
      WHERE o.user_id = profiles.id
        AND o.assigned_driver_id = me.driver_id
    )
  );

-- ── 4. Agent : créer commande pour client assigné ───────────────
DROP POLICY IF EXISTS "Commercial agent insert assigned client orders" ON public.orders;
CREATE POLICY "Commercial agent insert assigned client orders" ON public.orders
  FOR INSERT
  WITH CHECK (public.is_assigned_commercial_agent(user_id));

DROP POLICY IF EXISTS "Commercial agent insert assigned order items" ON public.order_items;
CREATE POLICY "Commercial agent insert assigned order items" ON public.order_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id
        AND public.is_assigned_commercial_agent(o.user_id)
    )
  );

COMMENT ON TABLE public.delivery_drivers IS 'Livreurs / transporteurs HB Commerce';
COMMENT ON COLUMN public.orders.assigned_driver_id IS 'Livreur assigné à la course';
