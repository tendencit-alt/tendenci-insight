
-- 1) master-ideas-files: turn bucket PRIVATE and remove legacy permissive policies
UPDATE storage.buckets SET public = false WHERE id = 'master-ideas-files';

DROP POLICY IF EXISTS "Autenticados veem arquivos ideias" ON storage.objects;
DROP POLICY IF EXISTS "Autenticados fazem upload arquivos ideias" ON storage.objects;
DROP POLICY IF EXISTS "Autenticados deletam próprios arquivos ideias" ON storage.objects;

-- Ensure admin-only INSERT WITH CHECK is correct (existing INSERT had qual=NULL/with_check; replace)
DROP POLICY IF EXISTS "Admins can upload master ideas files" ON storage.objects;
CREATE POLICY "Admins can upload master ideas files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'master-ideas-files'
  AND (public.is_owner() OR public.is_any_tenant_admin())
);

DROP POLICY IF EXISTS "Admins can update master ideas files" ON storage.objects;
CREATE POLICY "Admins can update master ideas files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'master-ideas-files'
  AND (public.is_owner() OR public.is_any_tenant_admin())
);

-- 2) erp_notifications: RESTRICTIVE INSERT policy (same-tenant target user)
DROP POLICY IF EXISTS restrict_insert_notifications_same_tenant ON public.erp_notifications;
CREATE POLICY restrict_insert_notifications_same_tenant
ON public.erp_notifications
AS RESTRICTIVE
FOR INSERT TO authenticated
WITH CHECK (
  public.is_owner()
  OR (
    tenant_id IS NOT NULL
    AND public.tenant_rls_check(tenant_id)
    AND (
      user_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = erp_notifications.user_id
          AND p.tenant_id = erp_notifications.tenant_id
      )
    )
  )
);

-- 3) Defense-in-depth RESTRICTIVE on storage.objects for private tenant buckets.
-- When storage_tenant_for() can resolve (path follows {parentId}/...), require tenant match.
-- When it returns NULL (legacy paths), this restrictive passes and the existing permissive policies still govern access.
DROP POLICY IF EXISTS tenant_defense_in_depth_select ON storage.objects;
CREATE POLICY tenant_defense_in_depth_select
ON storage.objects
AS RESTRICTIVE
FOR SELECT TO authenticated
USING (
  bucket_id NOT IN (
    'architect-files','architect-timeline','client-files','project-files',
    'crm-files','crm-timeline','crm-timeline-attachments','deal-files',
    'erp-documents','production-attachments','lead-attachments'
  )
  OR public.is_owner()
  OR public.storage_tenant_for(bucket_id, name) IS NULL
  OR public.tenant_rls_check(public.storage_tenant_for(bucket_id, name))
);

DROP POLICY IF EXISTS tenant_defense_in_depth_insert ON storage.objects;
CREATE POLICY tenant_defense_in_depth_insert
ON storage.objects
AS RESTRICTIVE
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id NOT IN (
    'architect-files','architect-timeline','client-files','project-files',
    'crm-files','crm-timeline','crm-timeline-attachments','deal-files',
    'erp-documents','production-attachments','lead-attachments'
  )
  OR public.is_owner()
  OR public.storage_tenant_for(bucket_id, name) IS NULL
  OR public.tenant_rls_check(public.storage_tenant_for(bucket_id, name))
);

DROP POLICY IF EXISTS tenant_defense_in_depth_update ON storage.objects;
CREATE POLICY tenant_defense_in_depth_update
ON storage.objects
AS RESTRICTIVE
FOR UPDATE TO authenticated
USING (
  bucket_id NOT IN (
    'architect-files','architect-timeline','client-files','project-files',
    'crm-files','crm-timeline','crm-timeline-attachments','deal-files',
    'erp-documents','production-attachments','lead-attachments'
  )
  OR public.is_owner()
  OR public.storage_tenant_for(bucket_id, name) IS NULL
  OR public.tenant_rls_check(public.storage_tenant_for(bucket_id, name))
);

DROP POLICY IF EXISTS tenant_defense_in_depth_delete ON storage.objects;
CREATE POLICY tenant_defense_in_depth_delete
ON storage.objects
AS RESTRICTIVE
FOR DELETE TO authenticated
USING (
  bucket_id NOT IN (
    'architect-files','architect-timeline','client-files','project-files',
    'crm-files','crm-timeline','crm-timeline-attachments','deal-files',
    'erp-documents','production-attachments','lead-attachments'
  )
  OR public.is_owner()
  OR public.storage_tenant_for(bucket_id, name) IS NULL
  OR public.tenant_rls_check(public.storage_tenant_for(bucket_id, name))
);
