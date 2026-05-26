
-- ============================================================
-- Security: tenant isolation for fin_attachments, leads_whatsapp
-- + lock down production-attachments storage bucket.
-- ============================================================

-- 1) fin_attachments: add tenant_id, RESTRICTIVE tenant isolation, drop USING(true).
ALTER TABLE public.fin_attachments
  ADD COLUMN IF NOT EXISTS tenant_id uuid;

CREATE OR REPLACE FUNCTION public.fin_attachments_set_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.get_user_tenant_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fin_attachments_set_tenant ON public.fin_attachments;
CREATE TRIGGER trg_fin_attachments_set_tenant
BEFORE INSERT ON public.fin_attachments
FOR EACH ROW EXECUTE FUNCTION public.fin_attachments_set_tenant();

DROP POLICY IF EXISTS "Authenticated users can view fin_attachments" ON public.fin_attachments;
DROP POLICY IF EXISTS "Authenticated users can insert fin_attachments" ON public.fin_attachments;

CREATE POLICY "fin_attachments_tenant_select"
  ON public.fin_attachments FOR SELECT TO authenticated
  USING (public.is_owner() OR public.tenant_rls_check(tenant_id));

CREATE POLICY "fin_attachments_tenant_insert"
  ON public.fin_attachments FOR INSERT TO authenticated
  WITH CHECK (public.is_owner() OR public.tenant_rls_check(tenant_id));

CREATE POLICY "fin_attachments_tenant_update"
  ON public.fin_attachments FOR UPDATE TO authenticated
  USING (public.is_owner() OR public.tenant_rls_check(tenant_id))
  WITH CHECK (public.is_owner() OR public.tenant_rls_check(tenant_id));

-- Hard restrictive isolation
DROP POLICY IF EXISTS "fin_attachments_tenant_iso" ON public.fin_attachments;
CREATE POLICY "fin_attachments_tenant_iso"
  ON public.fin_attachments AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_owner() OR public.tenant_rls_check(tenant_id))
  WITH CHECK (public.is_owner() OR public.tenant_rls_check(tenant_id));

-- 2) leads_whatsapp: add tenant_id + tenant isolation policies.
ALTER TABLE public.leads_whatsapp
  ADD COLUMN IF NOT EXISTS tenant_id uuid;

DROP POLICY IF EXISTS "auth_select_leads_whatsapp" ON public.leads_whatsapp;
DROP POLICY IF EXISTS "auth_update_leads_whatsapp" ON public.leads_whatsapp;

CREATE POLICY "leads_whatsapp_tenant_select"
  ON public.leads_whatsapp FOR SELECT TO authenticated
  USING (public.is_owner() OR public.tenant_rls_check(tenant_id));

CREATE POLICY "leads_whatsapp_tenant_update"
  ON public.leads_whatsapp FOR UPDATE TO authenticated
  USING (public.is_owner() OR public.tenant_rls_check(tenant_id))
  WITH CHECK (public.is_owner() OR public.tenant_rls_check(tenant_id));

DROP POLICY IF EXISTS "leads_whatsapp_tenant_iso" ON public.leads_whatsapp;
CREATE POLICY "leads_whatsapp_tenant_iso"
  ON public.leads_whatsapp AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_owner() OR public.tenant_rls_check(tenant_id))
  WITH CHECK (public.is_owner() OR public.tenant_rls_check(tenant_id));
-- Note: INSERT continues to be performed via Edge Functions (service_role bypasses RLS).

-- 3) production-attachments bucket: make private + tenant-scoped reads.
UPDATE storage.buckets SET public = false WHERE id = 'production-attachments';

DROP POLICY IF EXISTS "production_attachments_public_read" ON storage.objects;

CREATE POLICY "production_attachments_tenant_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'production-attachments'
    AND (
      public.is_owner()
      OR public.tenant_rls_check(public.storage_tenant_for(bucket_id, name))
    )
  );
