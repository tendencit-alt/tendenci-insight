DROP POLICY IF EXISTS "tenant_isolation_select_fin_chart_accounts" ON public.fin_chart_accounts;

CREATE POLICY "tenant_isolation_select_fin_chart_accounts"
ON public.fin_chart_accounts
AS PERMISSIVE
FOR SELECT
TO public
USING (
  public.is_owner()
  OR tenant_id = public.get_user_tenant_id()
  OR (tenant_id IS NULL AND is_core = true)
);