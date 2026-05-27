
-- 1) PERMISSIVE policies para liberar personalização por tenant
DROP POLICY IF EXISTS "tenant_can_select_fin_chart_accounts" ON public.fin_chart_accounts;
CREATE POLICY "tenant_can_select_fin_chart_accounts"
  ON public.fin_chart_accounts
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    public.is_owner()
    OR tenant_id = public.get_user_tenant_id()
    OR (tenant_id IS NULL AND is_core = true)
  );

DROP POLICY IF EXISTS "tenant_can_insert_fin_chart_accounts" ON public.fin_chart_accounts;
CREATE POLICY "tenant_can_insert_fin_chart_accounts"
  ON public.fin_chart_accounts
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (public.tenant_rls_check(tenant_id));

DROP POLICY IF EXISTS "tenant_can_update_fin_chart_accounts" ON public.fin_chart_accounts;
CREATE POLICY "tenant_can_update_fin_chart_accounts"
  ON public.fin_chart_accounts
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (public.tenant_rls_check(tenant_id))
  WITH CHECK (public.tenant_rls_check(tenant_id));

-- DELETE já tem permissive admin_only_delete; nada a fazer.

-- 2) Backfill defensivo: tenant sem contas ganha cópia do template do Owner.
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT id FROM public.tenants
    WHERE id <> 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid
      AND NOT EXISTS (SELECT 1 FROM public.fin_chart_accounts WHERE tenant_id = tenants.id)
  LOOP
    PERFORM public.seed_chart_of_accounts_from_owner(t.id);
  END LOOP;
END $$;
