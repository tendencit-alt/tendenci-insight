
-- 1) ia_processing_failures: add tenant_id + scoped policy
ALTER TABLE public.ia_processing_failures ADD COLUMN IF NOT EXISTS tenant_id uuid;
CREATE INDEX IF NOT EXISTS idx_ia_processing_failures_tenant ON public.ia_processing_failures(tenant_id);

DROP POLICY IF EXISTS "Owners/admins read ia_processing_failures" ON public.ia_processing_failures;
CREATE POLICY "ia_proc_fail_tenant_select" ON public.ia_processing_failures
  FOR SELECT TO authenticated
  USING (is_owner() OR (tenant_id IS NOT NULL AND is_tenant_admin(tenant_id)));

-- 2) cadences + cadence_steps: add tenant_id + tenant isolation
ALTER TABLE public.cadences ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE public.cadence_steps ADD COLUMN IF NOT EXISTS tenant_id uuid;
CREATE INDEX IF NOT EXISTS idx_cadences_tenant ON public.cadences(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cadence_steps_tenant ON public.cadence_steps(tenant_id);

DROP POLICY IF EXISTS "Permitir leitura para autenticados" ON public.cadences;
DROP POLICY IF EXISTS "Permitir leitura para autenticados" ON public.cadence_steps;

CREATE POLICY "cadences_tenant_all" ON public.cadences
  FOR ALL TO authenticated
  USING (is_owner() OR (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id()))
  WITH CHECK (is_owner() OR (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id()));

CREATE POLICY "cadence_steps_tenant_all" ON public.cadence_steps
  FOR ALL TO authenticated
  USING (is_owner() OR (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id()))
  WITH CHECK (is_owner() OR (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id()));

-- 3) Revoke EXECUTE from anon/PUBLIC on public-facing SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.can_view_hr_pii(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_hr_payroll_payables(date) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_pj_contract_payables(date) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.hr_employees_guard_pii() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.profiles_block_is_owner_escalation() FROM anon, PUBLIC;
