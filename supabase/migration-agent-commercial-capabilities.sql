-- Capacités agent commercial externe : créer un client assigné, lire alertes stock
-- Exécuter dans Supabase SQL Editor après migration-commercial-agents.sql

DROP POLICY IF EXISTS "Commercial agent create assigned client" ON public.profiles;
CREATE POLICY "Commercial agent create assigned client" ON public.profiles
  FOR INSERT
  WITH CHECK (
    public.is_commercial_agent()
    AND role = 'client'
    AND commercial_agent_id = auth.uid()
  );

DROP POLICY IF EXISTS "Commercial agent read stock alerts" ON public.stock_alerts;
CREATE POLICY "Commercial agent read stock alerts" ON public.stock_alerts
  FOR SELECT USING (public.is_commercial_agent());
