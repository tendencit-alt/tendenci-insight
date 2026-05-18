CREATE POLICY "Public can read core fin_chart_accounts templates"
ON public.fin_chart_accounts
AS PERMISSIVE
FOR SELECT
TO anon
USING (
  tenant_id IS NULL
  AND is_core = true
);