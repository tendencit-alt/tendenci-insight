DROP POLICY IF EXISTS "system_insert_suppression" ON public.offer_suppression_log;
CREATE POLICY "tenant_or_owner_insert_suppression" ON public.offer_suppression_log
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id() OR public.is_owner());