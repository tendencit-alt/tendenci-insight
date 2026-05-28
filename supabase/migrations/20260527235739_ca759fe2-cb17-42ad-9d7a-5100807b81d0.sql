
-- Fix exploitable INSERT policies allowing anon
DROP POLICY IF EXISTS "Sistema cria notificações" ON public.notifications;
CREATE POLICY "Sistema cria notificações"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role inserts health events" ON public.integration_health_events;
CREATE POLICY "Service role inserts health events"
ON public.integration_health_events
FOR INSERT
TO service_role
WITH CHECK (true);
