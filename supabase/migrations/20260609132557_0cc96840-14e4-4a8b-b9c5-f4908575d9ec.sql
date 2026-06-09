-- Add restrictive tenant SELECT for erp_tasks
CREATE POLICY erp_tasks_tenant_select_restrictive
ON public.erp_tasks
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.tenant_rls_check(tenant_id));

-- Restrict hr_employees SELECT to users with HR PII access
DROP POLICY IF EXISTS tenant_select_hr_employees ON public.hr_employees;
CREATE POLICY tenant_select_hr_employees
ON public.hr_employees
FOR SELECT
TO authenticated
USING (
  tenant_id = (SELECT public.get_user_tenant_id())
  AND public.can_view_hr_pii(tenant_id)
);

-- Restrict hr_time_records SELECT to users with HR PII access
DROP POLICY IF EXISTS tenant_select_hr_time_records ON public.hr_time_records;
CREATE POLICY tenant_select_hr_time_records
ON public.hr_time_records
FOR SELECT
TO authenticated
USING (
  public.tenant_rls_check(tenant_id)
  AND public.can_view_hr_pii(tenant_id)
);