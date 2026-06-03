-- C2: Remove RBAC permission denial telemetry tied to /auditoria-permissoes
DROP FUNCTION IF EXISTS public.log_permission_denial(text, text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.log_permission_denial CASCADE;
DROP TABLE IF EXISTS public.rbac_permission_denials CASCADE;