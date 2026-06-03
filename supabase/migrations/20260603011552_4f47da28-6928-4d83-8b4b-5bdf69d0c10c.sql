-- Drop audit-only trigger functions (CASCADE removes attached triggers)
DROP FUNCTION IF EXISTS public.fn_audit_trigger() CASCADE;
DROP FUNCTION IF EXISTS public.fn_fin_audit_log() CASCADE;
DROP FUNCTION IF EXISTS public.fin_audit_logs_set_tenant() CASCADE;

-- Drop tables
DROP TABLE IF EXISTS public.audit_log CASCADE;
DROP TABLE IF EXISTS public.audit_import_logs CASCADE;
DROP TABLE IF EXISTS public.fin_audit_logs CASCADE;