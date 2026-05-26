
-- 1) production-attachments storage
DROP POLICY IF EXISTS production_attachments_auth_insert ON storage.objects;
DROP POLICY IF EXISTS production_attachments_auth_delete ON storage.objects;

CREATE POLICY production_attachments_tenant_insert
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'production-attachments'
  AND owner = auth.uid()
  AND (is_owner() OR tenant_rls_check(storage_tenant_for(bucket_id, name)))
);

CREATE POLICY production_attachments_admin_delete
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'production-attachments'
  AND is_any_tenant_admin()
);

-- 2) crm_deal_history RESTRICTIVE tenant iso via parent crm_deals
CREATE POLICY crm_deal_history_tenant_iso
ON public.crm_deal_history
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  is_owner() OR EXISTS (
    SELECT 1 FROM public.crm_deals d
    WHERE d.id = crm_deal_history.deal_id
      AND tenant_rls_check(d.tenant_id)
  )
);

-- 3) erp_tasks tenant-scoped INSERT
DROP POLICY IF EXISTS authenticated_insert_tasks ON public.erp_tasks;
CREATE POLICY erp_tasks_tenant_insert
ON public.erp_tasks
FOR INSERT
TO authenticated
WITH CHECK (tenant_rls_check(tenant_id));

-- 4) tendenci_daily_architect_goals: scope by vendedor's tenant (no tenant_id column on table)
DROP POLICY IF EXISTS "Sistema cria metas automáticas" ON public.tendenci_daily_architect_goals;
DROP POLICY IF EXISTS "Sistema cria metas diárias" ON public.tendenci_daily_architect_goals;
CREATE POLICY daily_architect_goals_tenant_insert
ON public.tendenci_daily_architect_goals
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = tendenci_daily_architect_goals.vendedor_id
      AND tenant_rls_check(p.tenant_id)
  )
);

-- 5) Revoke EXECUTE on SECURITY DEFINER public functions from anon/PUBLIC; keep authenticated + service_role
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon',
                     r.nspname, r.proname, r.args);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated, service_role',
                     r.nspname, r.proname, r.args);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END $$;
