
-- 1) public tables — drop lax DELETE policies and apply admin_only_delete
DO $$
DECLARE
  t text;
  pol record;
  tables text[] := ARRAY[
    'architect_files','architect_timeline_attachments',
    'budget_product_lines','budget_products','budget_template_lines',
    'tendenci_campaign_queue','tendenci_ia_produtos_estoque'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname='public' AND tablename=t AND cmd='DELETE'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;
    EXECUTE format(
      'CREATE POLICY admin_only_delete ON public.%I AS PERMISSIVE FOR DELETE TO authenticated USING (public.is_any_tenant_admin())',
      t
    );
  END LOOP;
END $$;

-- 2) storage.objects — replace lax DELETE policies on 4 buckets with admin-only
DROP POLICY IF EXISTS "Autenticados deletam arquivos timeline" ON storage.objects;
DROP POLICY IF EXISTS "Autenticados podem deletar anexos" ON storage.objects;
DROP POLICY IF EXISTS "Autenticados podem deletar arquivos de arquitetos" ON storage.objects;
DROP POLICY IF EXISTS "Autenticados podem deletar assets" ON storage.objects;

CREATE POLICY "admin_delete_crm_timeline_attachments" ON storage.objects
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (bucket_id = 'crm-timeline-attachments' AND public.is_any_tenant_admin());

CREATE POLICY "admin_delete_lead_attachments" ON storage.objects
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (bucket_id = 'lead-attachments' AND public.is_any_tenant_admin());

CREATE POLICY "admin_delete_architect_files" ON storage.objects
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (bucket_id = 'architect-files' AND public.is_any_tenant_admin());

CREATE POLICY "admin_delete_ia_assets" ON storage.objects
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (bucket_id = 'ia-assets' AND public.is_any_tenant_admin());
