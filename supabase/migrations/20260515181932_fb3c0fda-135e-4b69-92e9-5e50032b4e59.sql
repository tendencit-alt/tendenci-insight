DROP POLICY IF EXISTS "tenant_isolation_modify_fin_chart_accounts" ON public.fin_chart_accounts;

CREATE POLICY "tenant_isolation_insert_fin_chart_accounts"
ON public.fin_chart_accounts
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (
  public.tenant_rls_check(tenant_id)
);

CREATE POLICY "tenant_isolation_update_fin_chart_accounts"
ON public.fin_chart_accounts
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (
  public.tenant_rls_check(tenant_id)
)
WITH CHECK (
  public.tenant_rls_check(tenant_id)
);

CREATE POLICY "tenant_isolation_delete_fin_chart_accounts"
ON public.fin_chart_accounts
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (
  public.tenant_rls_check(tenant_id)
);