
-- ============================================================
-- Fix 1: profiles SELECT — restrict cross-tenant-member email/is_owner exposure
-- Vendedores should only see their own profile; admins see tenant profiles; owner sees all.
-- ============================================================
DROP POLICY IF EXISTS "Usuários veem próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Owner can view all profiles" ON public.profiles;

CREATE POLICY "profiles_select_self"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "profiles_select_owner"
ON public.profiles
FOR SELECT
TO authenticated
USING (is_owner());

CREATE POLICY "profiles_select_tenant_admin"
ON public.profiles
FOR SELECT
TO authenticated
USING (is_admin() AND tenant_id = get_user_tenant_id());

-- ============================================================
-- Fix 2: storage tenant isolation — deny when storage_tenant_for() returns NULL
-- Replace tenant_iso_private_* and tenant_defense_in_depth_* restrictive policies
-- so NULL tenant resolution does not bypass the tenant check.
-- ============================================================

-- Private buckets list (kept identical to the original policies)
DROP POLICY IF EXISTS "tenant_iso_private_select" ON storage.objects;
DROP POLICY IF EXISTS "tenant_iso_private_insert" ON storage.objects;
DROP POLICY IF EXISTS "tenant_iso_private_update" ON storage.objects;
DROP POLICY IF EXISTS "tenant_iso_private_delete" ON storage.objects;

CREATE POLICY "tenant_iso_private_select"
ON storage.objects AS RESTRICTIVE FOR SELECT TO public
USING (
  bucket_id <> ALL (ARRAY['lead-attachments','architect-files','architect-timeline','client-files','project-files','crm-files','crm-timeline','crm-timeline-attachments','deal-files','erp-documents']::text[])
  OR is_owner()
  OR tenant_rls_check(COALESCE(storage_tenant_for(bucket_id, name), '00000000-0000-0000-0000-000000000000'::uuid))
);

CREATE POLICY "tenant_iso_private_insert"
ON storage.objects AS RESTRICTIVE FOR INSERT TO public
WITH CHECK (
  bucket_id <> ALL (ARRAY['lead-attachments','architect-files','architect-timeline','client-files','project-files','crm-files','crm-timeline','crm-timeline-attachments','deal-files','erp-documents']::text[])
  OR is_owner()
  OR tenant_rls_check(COALESCE(storage_tenant_for(bucket_id, name), '00000000-0000-0000-0000-000000000000'::uuid))
);

CREATE POLICY "tenant_iso_private_update"
ON storage.objects AS RESTRICTIVE FOR UPDATE TO public
USING (
  bucket_id <> ALL (ARRAY['lead-attachments','architect-files','architect-timeline','client-files','project-files','crm-files','crm-timeline','crm-timeline-attachments','deal-files','erp-documents']::text[])
  OR is_owner()
  OR tenant_rls_check(COALESCE(storage_tenant_for(bucket_id, name), '00000000-0000-0000-0000-000000000000'::uuid))
)
WITH CHECK (
  bucket_id <> ALL (ARRAY['lead-attachments','architect-files','architect-timeline','client-files','project-files','crm-files','crm-timeline','crm-timeline-attachments','deal-files','erp-documents']::text[])
  OR is_owner()
  OR tenant_rls_check(COALESCE(storage_tenant_for(bucket_id, name), '00000000-0000-0000-0000-000000000000'::uuid))
);

CREATE POLICY "tenant_iso_private_delete"
ON storage.objects AS RESTRICTIVE FOR DELETE TO public
USING (
  bucket_id <> ALL (ARRAY['lead-attachments','architect-files','architect-timeline','client-files','project-files','crm-files','crm-timeline','crm-timeline-attachments','deal-files','erp-documents']::text[])
  OR is_owner()
  OR tenant_rls_check(COALESCE(storage_tenant_for(bucket_id, name), '00000000-0000-0000-0000-000000000000'::uuid))
);

-- Defense-in-depth (broader list including production-attachments and master-ideas-files)
DROP POLICY IF EXISTS "tenant_defense_in_depth_select" ON storage.objects;
DROP POLICY IF EXISTS "tenant_defense_in_depth_insert" ON storage.objects;
DROP POLICY IF EXISTS "tenant_defense_in_depth_update" ON storage.objects;
DROP POLICY IF EXISTS "tenant_defense_in_depth_delete" ON storage.objects;

CREATE POLICY "tenant_defense_in_depth_select"
ON storage.objects AS RESTRICTIVE FOR SELECT TO public
USING (
  bucket_id <> ALL (ARRAY['architect-files','architect-timeline','client-files','project-files','crm-files','crm-timeline','crm-timeline-attachments','deal-files','erp-documents','production-attachments','lead-attachments','master-ideas-files']::text[])
  OR is_owner()
  OR tenant_rls_check(COALESCE(storage_tenant_for(bucket_id, name), '00000000-0000-0000-0000-000000000000'::uuid))
);

CREATE POLICY "tenant_defense_in_depth_insert"
ON storage.objects AS RESTRICTIVE FOR INSERT TO public
WITH CHECK (
  bucket_id <> ALL (ARRAY['architect-files','architect-timeline','client-files','project-files','crm-files','crm-timeline','crm-timeline-attachments','deal-files','erp-documents','production-attachments','lead-attachments','master-ideas-files']::text[])
  OR is_owner()
  OR tenant_rls_check(COALESCE(storage_tenant_for(bucket_id, name), '00000000-0000-0000-0000-000000000000'::uuid))
);

CREATE POLICY "tenant_defense_in_depth_update"
ON storage.objects AS RESTRICTIVE FOR UPDATE TO public
USING (
  bucket_id <> ALL (ARRAY['architect-files','architect-timeline','client-files','project-files','crm-files','crm-timeline','crm-timeline-attachments','deal-files','erp-documents','production-attachments','lead-attachments','master-ideas-files']::text[])
  OR is_owner()
  OR tenant_rls_check(COALESCE(storage_tenant_for(bucket_id, name), '00000000-0000-0000-0000-000000000000'::uuid))
)
WITH CHECK (
  bucket_id <> ALL (ARRAY['architect-files','architect-timeline','client-files','project-files','crm-files','crm-timeline','crm-timeline-attachments','deal-files','erp-documents','production-attachments','lead-attachments','master-ideas-files']::text[])
  OR is_owner()
  OR tenant_rls_check(COALESCE(storage_tenant_for(bucket_id, name), '00000000-0000-0000-0000-000000000000'::uuid))
);

CREATE POLICY "tenant_defense_in_depth_delete"
ON storage.objects AS RESTRICTIVE FOR DELETE TO public
USING (
  bucket_id <> ALL (ARRAY['architect-files','architect-timeline','client-files','project-files','crm-files','crm-timeline','crm-timeline-attachments','deal-files','erp-documents','production-attachments','lead-attachments','master-ideas-files']::text[])
  OR is_owner()
  OR tenant_rls_check(COALESCE(storage_tenant_for(bucket_id, name), '00000000-0000-0000-0000-000000000000'::uuid))
);
