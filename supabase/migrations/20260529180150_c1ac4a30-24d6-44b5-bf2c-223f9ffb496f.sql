-- 1) labor_types: remover SELECT permissivo do anon
DROP POLICY IF EXISTS "Anyone can view labor types" ON public.labor_types;
DROP POLICY IF EXISTS "Authenticated users can insert labor types" ON public.labor_types;
DROP POLICY IF EXISTS "Authenticated users can update labor types" ON public.labor_types;

-- INSERT/UPDATE já cobertos por tenant_isolation_modify_labor_types (ALL, authenticated)
-- SELECT já coberto por tenant_isolation_select_labor_types (SELECT, authenticated)

-- 2) Revogar EXECUTE de anon em funções SECURITY DEFINER que não fazem parte do catálogo público
REVOKE EXECUTE ON FUNCTION public.auto_create_delivery_on_production_completed() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.block_operational_on_owner() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.clear_active_tenant() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.copy_owner_finance_rates_to_tenant(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_default_project_budget_percent() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_feature_access(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.infer_order_responsible_type(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.notify_low_stock_on_movement() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.notify_overdue_purchase_orders() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.notify_purchase_order_confirmed() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.notify_purchase_receipt_stock_entry() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.order_responsibles_set_type() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.stamp_order_generated_payable_note() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.sync_all_commitments_from_order() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.tenant_has_feature(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.tg_copy_owner_rates_on_tenant_create() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.tg_hr_employee_auto_provision() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.tg_service_provider_auto_provision() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.verificar_acesso_ao_recurso(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.verificar_acesso_por_perfil(uuid, text, text) FROM PUBLIC, anon;

-- Garantir EXECUTE para authenticated nas funções helper chamadas no app
GRANT EXECUTE ON FUNCTION public.has_feature_access(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_has_feature(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verificar_acesso_ao_recurso(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verificar_acesso_por_perfil(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_active_tenant() TO authenticated;
GRANT EXECUTE ON FUNCTION public.copy_owner_finance_rates_to_tenant(uuid) TO authenticated;