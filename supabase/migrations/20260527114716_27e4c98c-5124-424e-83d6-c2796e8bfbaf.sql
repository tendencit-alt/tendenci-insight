
-- 1) tendenci_webhook_logs
DROP POLICY IF EXISTS "Admins can view webhook logs" ON public.tendenci_webhook_logs;
ALTER TABLE public.tendenci_webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tendenci_webhook_logs_owner_select"
  ON public.tendenci_webhook_logs FOR SELECT TO authenticated
  USING (public.is_owner());

CREATE POLICY "tendenci_webhook_logs_owner_delete"
  ON public.tendenci_webhook_logs FOR DELETE TO authenticated
  USING (public.is_owner());

REVOKE ALL ON public.tendenci_webhook_logs FROM anon, PUBLIC;
GRANT SELECT, DELETE ON public.tendenci_webhook_logs TO authenticated;
GRANT ALL ON public.tendenci_webhook_logs TO service_role;

-- 2) realtime.messages tenant-scoped
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "realtime_tenant_scoped_read"  ON realtime.messages;
DROP POLICY IF EXISTS "realtime_tenant_scoped_write" ON realtime.messages;

CREATE POLICY "realtime_tenant_scoped_read"
  ON realtime.messages FOR SELECT TO authenticated
  USING (
    public.is_owner()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND topic LIKE (COALESCE(p.current_tenant_id, p.tenant_id)::text || ':%')
    )
  );

CREATE POLICY "realtime_tenant_scoped_write"
  ON realtime.messages FOR INSERT TO authenticated
  WITH CHECK (
    public.is_owner()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND topic LIKE (COALESCE(p.current_tenant_id, p.tenant_id)::text || ':%')
    )
  );
