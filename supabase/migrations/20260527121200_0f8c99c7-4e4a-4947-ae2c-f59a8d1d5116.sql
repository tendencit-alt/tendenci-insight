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

REVOKE EXECUTE ON FUNCTION public.storage_tenant_for(text, text) FROM anon, PUBLIC;