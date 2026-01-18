-- Fix ia_client_memory: Remove overly permissive policy and add authenticated-only policies
DROP POLICY IF EXISTS "Service role full access client memory" ON public.ia_client_memory;

CREATE POLICY "Authenticated users can view client memory"
ON public.ia_client_memory FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert client memory"
ON public.ia_client_memory FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update client memory"
ON public.ia_client_memory FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete client memory"
ON public.ia_client_memory FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Fix tendenci_campaign_queue: Remove overly permissive policy and add authenticated-only policies
DROP POLICY IF EXISTS "Sistema pode gerenciar fila" ON public.tendenci_campaign_queue;

CREATE POLICY "Authenticated users can view campaign queue"
ON public.tendenci_campaign_queue FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert campaign queue"
ON public.tendenci_campaign_queue FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update campaign queue"
ON public.tendenci_campaign_queue FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete campaign queue"
ON public.tendenci_campaign_queue FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL);