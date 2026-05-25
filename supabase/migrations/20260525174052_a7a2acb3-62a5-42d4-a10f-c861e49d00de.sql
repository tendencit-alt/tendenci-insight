
-- =====================================================================
-- 1) onboarding_progress — strict tenant isolation
-- =====================================================================
ALTER TABLE public.onboarding_progress ALTER COLUMN tenant_id SET NOT NULL;

DROP POLICY IF EXISTS "Auth users can insert onboarding_progress" ON public.onboarding_progress;
DROP POLICY IF EXISTS "Auth users can update onboarding_progress" ON public.onboarding_progress;
DROP POLICY IF EXISTS "Auth users can view onboarding_progress" ON public.onboarding_progress;

CREATE POLICY "onboarding_progress tenant select" ON public.onboarding_progress
  FOR SELECT TO authenticated USING (public.tenant_rls_check(tenant_id));
CREATE POLICY "onboarding_progress tenant insert" ON public.onboarding_progress
  FOR INSERT TO authenticated WITH CHECK (public.tenant_rls_check(tenant_id));
CREATE POLICY "onboarding_progress tenant update" ON public.onboarding_progress
  FOR UPDATE TO authenticated USING (public.tenant_rls_check(tenant_id)) WITH CHECK (public.tenant_rls_check(tenant_id));
CREATE POLICY "onboarding_progress tenant delete" ON public.onboarding_progress
  FOR DELETE TO authenticated USING (public.tenant_rls_check(tenant_id));

-- =====================================================================
-- 2) order_strategic_commitments — backfill + strict tenant isolation
-- =====================================================================
UPDATE public.order_strategic_commitments osc
SET tenant_id = o.tenant_id
FROM public.orders o
WHERE osc.order_id = o.id AND osc.tenant_id IS NULL;

-- Drop any orphan rows whose order has no tenant (defensive; should be 0)
DELETE FROM public.order_strategic_commitments WHERE tenant_id IS NULL;

ALTER TABLE public.order_strategic_commitments ALTER COLUMN tenant_id SET NOT NULL;

DROP POLICY IF EXISTS "Authenticated users can delete order commitments" ON public.order_strategic_commitments;
DROP POLICY IF EXISTS "Authenticated users can insert order commitments" ON public.order_strategic_commitments;
DROP POLICY IF EXISTS "Authenticated users can update order commitments" ON public.order_strategic_commitments;
DROP POLICY IF EXISTS "Authenticated users can view order commitments" ON public.order_strategic_commitments;

CREATE POLICY "osc tenant select" ON public.order_strategic_commitments
  FOR SELECT TO authenticated USING (public.tenant_rls_check(tenant_id));
CREATE POLICY "osc tenant insert" ON public.order_strategic_commitments
  FOR INSERT TO authenticated WITH CHECK (public.tenant_rls_check(tenant_id));
CREATE POLICY "osc tenant update" ON public.order_strategic_commitments
  FOR UPDATE TO authenticated USING (public.tenant_rls_check(tenant_id)) WITH CHECK (public.tenant_rls_check(tenant_id));
CREATE POLICY "osc tenant delete" ON public.order_strategic_commitments
  FOR DELETE TO authenticated USING (public.tenant_rls_check(tenant_id));

-- Trigger: auto-fill tenant_id from order on insert if missing
CREATE OR REPLACE FUNCTION public.osc_set_tenant_from_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    SELECT tenant_id INTO NEW.tenant_id FROM public.orders WHERE id = NEW.order_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_osc_set_tenant ON public.order_strategic_commitments;
CREATE TRIGGER trg_osc_set_tenant
BEFORE INSERT ON public.order_strategic_commitments
FOR EACH ROW EXECUTE FUNCTION public.osc_set_tenant_from_order();

-- =====================================================================
-- 3) tendenci_goal_progress — replace USING(true) update policy
-- =====================================================================
DROP POLICY IF EXISTS "Sistema atualiza progresso" ON public.tendenci_goal_progress;

CREATE POLICY "tendenci_goal_progress tenant update" ON public.tendenci_goal_progress
  FOR UPDATE TO authenticated
  USING (
    public.is_owner()
    OR EXISTS (SELECT 1 FROM public.tendenci_seller_goals sg WHERE sg.id = tendenci_goal_progress.seller_goal_id AND public.tenant_rls_check(sg.tenant_id))
    OR EXISTS (SELECT 1 FROM public.tendenci_company_goals cg WHERE cg.id = tendenci_goal_progress.company_goal_id AND public.tenant_rls_check(cg.tenant_id))
  )
  WITH CHECK (
    public.is_owner()
    OR EXISTS (SELECT 1 FROM public.tendenci_seller_goals sg WHERE sg.id = tendenci_goal_progress.seller_goal_id AND public.tenant_rls_check(sg.tenant_id))
    OR EXISTS (SELECT 1 FROM public.tendenci_company_goals cg WHERE cg.id = tendenci_goal_progress.company_goal_id AND public.tenant_rls_check(cg.tenant_id))
  );

-- =====================================================================
-- 4) ia_metrics — service_role only (edge functions are the only writers)
-- =====================================================================
DROP POLICY IF EXISTS "Service role can manage ia_metrics" ON public.ia_metrics;

CREATE POLICY "ia_metrics service role only" ON public.ia_metrics
  AS PERMISSIVE FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Owner can read for observability
CREATE POLICY "ia_metrics owner read" ON public.ia_metrics
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (public.is_owner());

-- =====================================================================
-- 5) Storage — per-bucket tenant isolation for 10 private buckets
-- =====================================================================
CREATE OR REPLACE FUNCTION public.storage_tenant_for(_bucket text, _name text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  root_id uuid;
  t uuid;
BEGIN
  BEGIN
    root_id := split_part(_name, '/', 1)::uuid;
  EXCEPTION WHEN others THEN
    RETURN NULL;
  END;

  IF _bucket = 'lead-attachments' THEN
    SELECT tenant_id INTO t FROM public.leads WHERE id = root_id;
  ELSIF _bucket IN ('architect-files', 'architect-timeline') THEN
    SELECT tenant_id INTO t FROM public.architects WHERE id = root_id;
  ELSIF _bucket = 'client-files' THEN
    SELECT tenant_id INTO t FROM public.clients WHERE id = root_id;
  ELSIF _bucket = 'project-files' THEN
    SELECT tenant_id INTO t FROM public.projects WHERE id = root_id;
  ELSIF _bucket IN ('crm-files', 'crm-timeline', 'crm-timeline-attachments', 'deal-files') THEN
    SELECT tenant_id INTO t FROM public.crm_deals WHERE id = root_id;
  ELSIF _bucket = 'erp-documents' THEN
    SELECT tenant_id INTO t FROM public.erp_documents WHERE id = root_id;
  ELSE
    t := NULL;
  END IF;

  RETURN t;
END $$;

-- Restrictive policies on storage.objects: only apply to the 10 private buckets.
-- For all other buckets, this policy is a no-op (passes through).
DROP POLICY IF EXISTS "tenant_iso_private_select" ON storage.objects;
DROP POLICY IF EXISTS "tenant_iso_private_insert" ON storage.objects;
DROP POLICY IF EXISTS "tenant_iso_private_update" ON storage.objects;
DROP POLICY IF EXISTS "tenant_iso_private_delete" ON storage.objects;

CREATE POLICY "tenant_iso_private_select"
  ON storage.objects AS RESTRICTIVE FOR SELECT
  TO authenticated
  USING (
    bucket_id NOT IN ('lead-attachments','architect-files','architect-timeline','client-files','project-files','crm-files','crm-timeline','crm-timeline-attachments','deal-files','erp-documents')
    OR public.is_owner()
    OR public.tenant_rls_check(public.storage_tenant_for(bucket_id, name))
  );

CREATE POLICY "tenant_iso_private_insert"
  ON storage.objects AS RESTRICTIVE FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id NOT IN ('lead-attachments','architect-files','architect-timeline','client-files','project-files','crm-files','crm-timeline','crm-timeline-attachments','deal-files','erp-documents')
    OR public.is_owner()
    OR public.tenant_rls_check(public.storage_tenant_for(bucket_id, name))
  );

CREATE POLICY "tenant_iso_private_update"
  ON storage.objects AS RESTRICTIVE FOR UPDATE
  TO authenticated
  USING (
    bucket_id NOT IN ('lead-attachments','architect-files','architect-timeline','client-files','project-files','crm-files','crm-timeline','crm-timeline-attachments','deal-files','erp-documents')
    OR public.is_owner()
    OR public.tenant_rls_check(public.storage_tenant_for(bucket_id, name))
  )
  WITH CHECK (
    bucket_id NOT IN ('lead-attachments','architect-files','architect-timeline','client-files','project-files','crm-files','crm-timeline','crm-timeline-attachments','deal-files','erp-documents')
    OR public.is_owner()
    OR public.tenant_rls_check(public.storage_tenant_for(bucket_id, name))
  );

CREATE POLICY "tenant_iso_private_delete"
  ON storage.objects AS RESTRICTIVE FOR DELETE
  TO authenticated
  USING (
    bucket_id NOT IN ('lead-attachments','architect-files','architect-timeline','client-files','project-files','crm-files','crm-timeline','crm-timeline-attachments','deal-files','erp-documents')
    OR public.is_owner()
    OR public.tenant_rls_check(public.storage_tenant_for(bucket_id, name))
  );
