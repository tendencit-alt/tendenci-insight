
-- A) fin_reconciliation_rules: add tenant_id + tenant RLS
ALTER TABLE public.fin_reconciliation_rules
  ADD COLUMN IF NOT EXISTS tenant_id uuid NOT NULL DEFAULT public.get_user_tenant_id();

DROP POLICY IF EXISTS "Authenticated users can view fin_reconciliation_rules" ON public.fin_reconciliation_rules;
DROP POLICY IF EXISTS "Authenticated users can insert fin_reconciliation_rules" ON public.fin_reconciliation_rules;
DROP POLICY IF EXISTS "Authenticated users can update fin_reconciliation_rules" ON public.fin_reconciliation_rules;

CREATE POLICY tenant_select_fin_reconciliation_rules
  ON public.fin_reconciliation_rules FOR SELECT TO authenticated
  USING (public.tenant_rls_check(tenant_id));

CREATE POLICY tenant_insert_fin_reconciliation_rules
  ON public.fin_reconciliation_rules FOR INSERT TO authenticated
  WITH CHECK (public.tenant_rls_check(tenant_id));

CREATE POLICY tenant_update_fin_reconciliation_rules
  ON public.fin_reconciliation_rules FOR UPDATE TO authenticated
  USING (public.tenant_rls_check(tenant_id))
  WITH CHECK (public.tenant_rls_check(tenant_id));

-- existing admin_only_delete policy stays

-- B) Extend storage_tenant_for to resolve master-ideas-files via master_idea_attachments.file_path
CREATE OR REPLACE FUNCTION public.storage_tenant_for(_bucket text, _name text)
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  root_id uuid;
  t uuid;
BEGIN
  IF _bucket = 'master-ideas-files' THEN
    SELECT tenant_id INTO t FROM public.master_idea_attachments WHERE file_path = _name LIMIT 1;
    RETURN t;
  END IF;

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
  ELSIF _bucket = 'production-attachments' THEN
    SELECT tenant_id INTO t FROM public.production_orders WHERE id = root_id;
  ELSE
    t := NULL;
  END IF;

  RETURN t;
END $function$;

REVOKE EXECUTE ON FUNCTION public.storage_tenant_for(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.storage_tenant_for(text, text) TO authenticated;

-- C) Add master-ideas-files to defense-in-depth tenant restrictive policies on storage.objects
DROP POLICY IF EXISTS tenant_defense_in_depth_select ON storage.objects;
CREATE POLICY tenant_defense_in_depth_select
ON storage.objects AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  bucket_id NOT IN (
    'architect-files','architect-timeline','client-files','project-files',
    'crm-files','crm-timeline','crm-timeline-attachments','deal-files',
    'erp-documents','production-attachments','lead-attachments','master-ideas-files'
  )
  OR public.is_owner()
  OR (
    bucket_id = 'master-ideas-files'
    AND public.storage_tenant_for(bucket_id, name) IS NOT NULL
    AND public.tenant_rls_check(public.storage_tenant_for(bucket_id, name))
  )
  OR (
    bucket_id <> 'master-ideas-files'
    AND (
      public.storage_tenant_for(bucket_id, name) IS NULL
      OR public.tenant_rls_check(public.storage_tenant_for(bucket_id, name))
    )
  )
);

DROP POLICY IF EXISTS tenant_defense_in_depth_insert ON storage.objects;
CREATE POLICY tenant_defense_in_depth_insert
ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (
  bucket_id NOT IN (
    'architect-files','architect-timeline','client-files','project-files',
    'crm-files','crm-timeline','crm-timeline-attachments','deal-files',
    'erp-documents','production-attachments','lead-attachments','master-ideas-files'
  )
  OR public.is_owner()
  OR bucket_id = 'master-ideas-files'  -- new uploads: insert allowed; row will be linked via master_idea_attachments
  OR public.storage_tenant_for(bucket_id, name) IS NULL
  OR public.tenant_rls_check(public.storage_tenant_for(bucket_id, name))
);

DROP POLICY IF EXISTS tenant_defense_in_depth_update ON storage.objects;
CREATE POLICY tenant_defense_in_depth_update
ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated
USING (
  bucket_id NOT IN (
    'architect-files','architect-timeline','client-files','project-files',
    'crm-files','crm-timeline','crm-timeline-attachments','deal-files',
    'erp-documents','production-attachments','lead-attachments','master-ideas-files'
  )
  OR public.is_owner()
  OR (
    bucket_id = 'master-ideas-files'
    AND (
      public.storage_tenant_for(bucket_id, name) IS NULL
      OR public.tenant_rls_check(public.storage_tenant_for(bucket_id, name))
    )
  )
  OR (
    bucket_id <> 'master-ideas-files'
    AND (
      public.storage_tenant_for(bucket_id, name) IS NULL
      OR public.tenant_rls_check(public.storage_tenant_for(bucket_id, name))
    )
  )
);

DROP POLICY IF EXISTS tenant_defense_in_depth_delete ON storage.objects;
CREATE POLICY tenant_defense_in_depth_delete
ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated
USING (
  bucket_id NOT IN (
    'architect-files','architect-timeline','client-files','project-files',
    'crm-files','crm-timeline','crm-timeline-attachments','deal-files',
    'erp-documents','production-attachments','lead-attachments','master-ideas-files'
  )
  OR public.is_owner()
  OR (
    bucket_id = 'master-ideas-files'
    AND (
      public.storage_tenant_for(bucket_id, name) IS NULL
      OR public.tenant_rls_check(public.storage_tenant_for(bucket_id, name))
    )
  )
  OR (
    bucket_id <> 'master-ideas-files'
    AND (
      public.storage_tenant_for(bucket_id, name) IS NULL
      OR public.tenant_rls_check(public.storage_tenant_for(bucket_id, name))
    )
  )
);
