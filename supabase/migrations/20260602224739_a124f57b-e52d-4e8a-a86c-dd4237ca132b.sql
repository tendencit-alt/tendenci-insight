REVOKE EXECUTE ON FUNCTION public.move_production_phase(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.move_production_phase(uuid, text, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.can_regress_production_phase(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_regress_production_phase(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.reprogram_op(uuid, timestamp with time zone, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reprogram_op(uuid, timestamp with time zone, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.seed_default_phase_templates_for_type() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.seed_default_phase_templates_for_type() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.seed_production_status_columns() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.seed_production_status_columns() TO authenticated, service_role;