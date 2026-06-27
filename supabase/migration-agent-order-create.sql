-- Agent commercial : créer une commande pour un client assigné
-- Exécuter après migration-commercial-agents.sql

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

COMMENT ON POLICY "Commercial agent insert assigned client orders" ON public.orders IS
  'Commande saisie par l agent pour un client de son portefeuille — visible côté client et agent';
