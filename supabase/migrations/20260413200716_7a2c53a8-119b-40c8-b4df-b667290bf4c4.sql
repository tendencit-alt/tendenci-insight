
-- 1. Create the unified audit_log table
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid,
  tenant_id uuid REFERENCES public.tenants(id),
  table_name text NOT NULL,
  record_id text NOT NULL,
  field_name text,
  old_value text,
  new_value text,
  event_type text NOT NULL DEFAULT 'UPDATE',
  event_source text NOT NULL DEFAULT 'manual',
  ip_address text,
  user_agent text,
  metadata jsonb DEFAULT '{}'
);

CREATE INDEX idx_audit_log_tenant ON public.audit_log(tenant_id);
CREATE INDEX idx_audit_log_table ON public.audit_log(table_name);
CREATE INDEX idx_audit_log_record ON public.audit_log(record_id);
CREATE INDEX idx_audit_log_user ON public.audit_log(user_id);
CREATE INDEX idx_audit_log_created ON public.audit_log(created_at DESC);
CREATE INDEX idx_audit_log_event_type ON public.audit_log(event_type);

-- 2. RLS: append-only (INSERT + SELECT only, no UPDATE/DELETE)
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can insert audit_log" ON public.audit_log
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Auth users can view audit_log" ON public.audit_log
  FOR SELECT TO authenticated USING (true);

-- NO UPDATE or DELETE policies = append-only

-- 3. Create audit trigger function
CREATE OR REPLACE FUNCTION public.fn_audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_tenant_id uuid;
  v_old_data jsonb;
  v_new_data jsonb;
  v_key text;
  v_old_val text;
  v_new_val text;
BEGIN
  v_user_id := auth.uid();

  -- Try to get tenant_id from the record
  IF TG_OP = 'DELETE' THEN
    v_old_data := to_jsonb(OLD);
    v_tenant_id := (v_old_data->>'tenant_id')::uuid;
  ELSE
    v_new_data := to_jsonb(NEW);
    v_tenant_id := (v_new_data->>'tenant_id')::uuid;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (user_id, tenant_id, table_name, record_id, event_type, event_source, new_value)
    VALUES (v_user_id, v_tenant_id, TG_TABLE_NAME, (v_new_data->>'id'), 'CREATE', 'trigger', v_new_data::text);
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);

    FOR v_key IN SELECT jsonb_object_keys(v_new_data)
    LOOP
      IF v_key NOT IN ('updated_at', 'created_at') THEN
        v_old_val := v_old_data->>v_key;
        v_new_val := v_new_data->>v_key;
        IF v_old_val IS DISTINCT FROM v_new_val THEN
          INSERT INTO public.audit_log (user_id, tenant_id, table_name, record_id, field_name, old_value, new_value, event_type, event_source)
          VALUES (v_user_id, v_tenant_id, TG_TABLE_NAME, (v_new_data->>'id'), v_key, v_old_val, v_new_val, 'UPDATE', 'trigger');
        END IF;
      END IF;
    END LOOP;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (user_id, tenant_id, table_name, record_id, event_type, event_source, old_value)
    VALUES (v_user_id, v_tenant_id, TG_TABLE_NAME, (v_old_data->>'id'), 'DELETE_LOGICO', 'trigger', v_old_data::text);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

-- 4. Attach triggers to critical tables
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'orders',
    'fin_ledger_entries',
    'fin_payables',
    'fin_receivables',
    'fin_financial_goals',
    'fin_cost_centers',
    'fin_chart_accounts',
    'fin_bank_accounts',
    'clients',
    'suppliers',
    'profiles',
    'company_settings',
    'fin_event_automation_rules',
    'profile_type_permissions'
  ])
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_audit_%I ON public.%I;
       CREATE TRIGGER trg_audit_%I
       AFTER INSERT OR UPDATE OR DELETE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();',
      t, t, t, t
    );
  END LOOP;
END;
$$;

-- 5. Import audit logs table
CREATE TABLE IF NOT EXISTS public.audit_import_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid,
  tenant_id uuid REFERENCES public.tenants(id),
  file_name text NOT NULL,
  file_type text,
  record_count integer DEFAULT 0,
  success_count integer DEFAULT 0,
  error_count integer DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  errors jsonb DEFAULT '[]',
  metadata jsonb DEFAULT '{}'
);

ALTER TABLE public.audit_import_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can insert audit_import_logs" ON public.audit_import_logs
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can view audit_import_logs" ON public.audit_import_logs
  FOR SELECT TO authenticated USING (true);
