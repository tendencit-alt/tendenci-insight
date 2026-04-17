-- SYSTEM INTEGRATION MAP LAYER
CREATE TABLE public.system_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  module_group TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.system_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads system modules" ON public.system_modules FOR SELECT USING (public.is_owner());
CREATE POLICY "Owner manages system modules" ON public.system_modules FOR ALL USING (public.is_owner()) WITH CHECK (public.is_owner());

CREATE TABLE public.system_module_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_module_code TEXT NOT NULL REFERENCES public.system_modules(code) ON DELETE CASCADE,
  target_module_code TEXT NOT NULL REFERENCES public.system_modules(code) ON DELETE CASCADE,
  integration_type TEXT NOT NULL DEFAULT 'data_sync',
  criticality TEXT NOT NULL DEFAULT 'medium',
  expected_interval_minutes INTEGER NOT NULL DEFAULT 60,
  is_required BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(source_module_code, target_module_code)
);
CREATE INDEX idx_smi_source ON public.system_module_integrations(source_module_code);
CREATE INDEX idx_smi_target ON public.system_module_integrations(target_module_code);
ALTER TABLE public.system_module_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads integrations" ON public.system_module_integrations FOR SELECT USING (public.is_owner());
CREATE POLICY "Owner manages integrations" ON public.system_module_integrations FOR ALL USING (public.is_owner()) WITH CHECK (public.is_owner());

CREATE TABLE public.integration_health_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_module_code TEXT NOT NULL,
  target_module_code TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('green','yellow','red','gray')),
  event_type TEXT NOT NULL,
  message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  tenant_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ihe_source_target ON public.integration_health_events(source_module_code, target_module_code, created_at DESC);
CREATE INDEX idx_ihe_status ON public.integration_health_events(status, created_at DESC);
ALTER TABLE public.integration_health_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads health events" ON public.integration_health_events FOR SELECT USING (public.is_owner());
CREATE POLICY "Service role inserts health events" ON public.integration_health_events FOR INSERT WITH CHECK (true);

CREATE TABLE public.integration_health_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_module_code TEXT NOT NULL,
  target_module_code TEXT NOT NULL,
  current_status TEXT NOT NULL DEFAULT 'gray' CHECK (current_status IN ('green','yellow','red','gray')),
  last_success_at TIMESTAMPTZ,
  last_error_at TIMESTAMPTZ,
  last_event_at TIMESTAMPTZ,
  delay_minutes INTEGER,
  health_score INTEGER NOT NULL DEFAULT 0,
  events_24h INTEGER NOT NULL DEFAULT 0,
  errors_24h INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(source_module_code, target_module_code)
);
CREATE INDEX idx_ihs_status ON public.integration_health_snapshots(current_status);
ALTER TABLE public.integration_health_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads snapshots" ON public.integration_health_snapshots FOR SELECT USING (public.is_owner());
CREATE POLICY "Service role manages snapshots" ON public.integration_health_snapshots FOR ALL USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.record_integration_event(
  p_source TEXT, p_target TEXT, p_status TEXT, p_event_type TEXT,
  p_message TEXT DEFAULT NULL, p_tenant_id UUID DEFAULT NULL, p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO public.integration_health_events (source_module_code, target_module_code, status, event_type, message, tenant_id, metadata)
  VALUES (p_source, p_target, p_status, p_event_type, p_message, p_tenant_id, p_metadata) RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

-- Triggers
CREATE OR REPLACE FUNCTION public.trg_integration_orders_to_financeiro()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.record_integration_event('crm','financeiro','green','order_to_financial_synced',
    'Pedido ' || COALESCE(NEW.order_number, NEW.id::text) || ' sincronizado', NEW.tenant_id,
    jsonb_build_object('order_id', NEW.id));
  PERFORM public.record_integration_event('crm','projetos','green','order_to_project_created',
    'Pedido gerou projeto', NEW.tenant_id, jsonb_build_object('order_id', NEW.id));
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_int_order_financeiro ON public.orders;
CREATE TRIGGER trg_int_order_financeiro AFTER UPDATE OF status ON public.orders FOR EACH ROW
  WHEN (NEW.status IN ('aprovado','approved') AND OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.trg_integration_orders_to_financeiro();

CREATE OR REPLACE FUNCTION public.trg_integration_financeiro_to_dre()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.record_integration_event('financeiro','dre','green','ledger_to_dre_recalculated',
    'Lançamento impacta DRE', NEW.tenant_id, jsonb_build_object('ledger_id', NEW.id));
  PERFORM public.record_integration_event('financeiro','fluxo_caixa','green','ledger_to_cashflow_updated',
    'Lançamento impacta fluxo de caixa', NEW.tenant_id, jsonb_build_object('ledger_id', NEW.id));
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_int_fin_dre ON public.fin_ledger_entries;
CREATE TRIGGER trg_int_fin_dre AFTER INSERT ON public.fin_ledger_entries FOR EACH ROW
  EXECUTE FUNCTION public.trg_integration_financeiro_to_dre();

CREATE OR REPLACE FUNCTION public.trg_integration_billing_to_entitlements()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.record_integration_event('billing','entitlements','green','billing_to_entitlements_synced',
    'Subscription ' || COALESCE(NEW.status,'unknown') || ' sincronizada', NEW.tenant_id,
    jsonb_build_object('subscription_id', NEW.id, 'status', NEW.status));
  PERFORM public.record_integration_event('billing','lifecycle','green','billing_status_to_lifecycle',
    'Status billing propagado para lifecycle', NEW.tenant_id, jsonb_build_object('status', NEW.status));
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_int_billing_ent ON public.subscriptions;
CREATE TRIGGER trg_int_billing_ent AFTER INSERT OR UPDATE OF status, plan_id ON public.subscriptions FOR EACH ROW
  EXECUTE FUNCTION public.trg_integration_billing_to_entitlements();

CREATE OR REPLACE FUNCTION public.trg_integration_automation_to_observability()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.record_integration_event('automations','observability',
    CASE WHEN NEW.status = 'success' THEN 'green' WHEN NEW.status = 'error' THEN 'red' ELSE 'yellow' END,
    'automation_executed', 'Regra ' || COALESCE(NEW.rule_name, NEW.rule_id::text) || ' → ' || NEW.status,
    NEW.tenant_id, jsonb_build_object('rule_id', NEW.rule_id, 'status', NEW.status));
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_int_auto_notif ON public.automation_execution_logs;
CREATE TRIGGER trg_int_auto_notif AFTER INSERT ON public.automation_execution_logs FOR EACH ROW
  EXECUTE FUNCTION public.trg_integration_automation_to_observability();

-- Reconciliação
CREATE OR REPLACE FUNCTION public.reconcile_integration_health()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_int RECORD; v_last_event TIMESTAMPTZ; v_last_success TIMESTAMPTZ; v_last_error TIMESTAMPTZ;
  v_events_24h INTEGER; v_errors_24h INTEGER; v_status TEXT; v_score INTEGER; v_delay INTEGER;
  v_total INTEGER := 0; v_g INTEGER := 0; v_y INTEGER := 0; v_r INTEGER := 0; v_gr INTEGER := 0;
BEGIN
  FOR v_int IN SELECT source_module_code, target_module_code, expected_interval_minutes FROM public.system_module_integrations LOOP
    SELECT MAX(created_at), MAX(created_at) FILTER (WHERE status IN ('green','yellow')),
      MAX(created_at) FILTER (WHERE status = 'red'),
      COUNT(*) FILTER (WHERE created_at > now() - interval '24 hours'),
      COUNT(*) FILTER (WHERE status = 'red' AND created_at > now() - interval '24 hours')
    INTO v_last_event, v_last_success, v_last_error, v_events_24h, v_errors_24h
    FROM public.integration_health_events
    WHERE source_module_code = v_int.source_module_code AND target_module_code = v_int.target_module_code;

    v_delay := CASE WHEN v_last_event IS NULL THEN NULL
      ELSE EXTRACT(EPOCH FROM (now() - v_last_event))::INTEGER / 60 END;

    v_status := CASE
      WHEN v_last_event IS NULL THEN 'gray'
      WHEN v_last_error IS NOT NULL AND v_last_error > now() - interval '1 hour' THEN 'red'
      WHEN v_delay IS NOT NULL AND v_delay > v_int.expected_interval_minutes * 3 THEN 'red'
      WHEN v_delay IS NOT NULL AND v_delay > v_int.expected_interval_minutes THEN 'yellow'
      WHEN COALESCE(v_errors_24h,0) > 0 THEN 'yellow'
      ELSE 'green' END;

    v_score := CASE v_status
      WHEN 'green' THEN 100 - LEAST(COALESCE(v_errors_24h,0) * 5, 20)
      WHEN 'yellow' THEN 60 - LEAST(COALESCE(v_errors_24h,0) * 3, 30)
      WHEN 'red' THEN GREATEST(20 - COALESCE(v_errors_24h,0) * 2, 0)
      ELSE 0 END;

    INSERT INTO public.integration_health_snapshots
      (source_module_code, target_module_code, current_status, last_success_at, last_error_at,
       last_event_at, delay_minutes, health_score, events_24h, errors_24h, updated_at)
    VALUES (v_int.source_module_code, v_int.target_module_code, v_status, v_last_success,
            v_last_error, v_last_event, v_delay, v_score, COALESCE(v_events_24h,0), COALESCE(v_errors_24h,0), now())
    ON CONFLICT (source_module_code, target_module_code) DO UPDATE SET
      current_status = EXCLUDED.current_status, last_success_at = EXCLUDED.last_success_at,
      last_error_at = EXCLUDED.last_error_at, last_event_at = EXCLUDED.last_event_at,
      delay_minutes = EXCLUDED.delay_minutes, health_score = EXCLUDED.health_score,
      events_24h = EXCLUDED.events_24h, errors_24h = EXCLUDED.errors_24h, updated_at = now();

    v_total := v_total + 1;
    IF v_status = 'green' THEN v_g := v_g + 1;
    ELSIF v_status = 'yellow' THEN v_y := v_y + 1;
    ELSIF v_status = 'red' THEN v_r := v_r + 1;
    ELSE v_gr := v_gr + 1; END IF;
  END LOOP;
  RETURN jsonb_build_object('processed', v_total, 'green', v_g, 'yellow', v_y, 'red', v_r, 'gray', v_gr);
END; $$;

CREATE OR REPLACE FUNCTION public.get_integration_map_overview()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_result JSONB;
BEGIN
  IF NOT public.is_owner() THEN RAISE EXCEPTION 'Access denied'; END IF;
  WITH s AS (
    SELECT COUNT(*) AS total,
      COUNT(*) FILTER (WHERE current_status = 'green') AS green,
      COUNT(*) FILTER (WHERE current_status = 'yellow') AS yellow,
      COUNT(*) FILTER (WHERE current_status = 'red') AS red,
      COUNT(*) FILTER (WHERE current_status = 'gray') AS gray,
      MAX(last_error_at) AS last_systemic_error
    FROM public.integration_health_snapshots
  ),
  cr AS (
    SELECT COUNT(*) AS c FROM public.integration_health_snapshots ihs
    JOIN public.system_module_integrations smi
      ON smi.source_module_code = ihs.source_module_code AND smi.target_module_code = ihs.target_module_code
    WHERE ihs.current_status = 'red' AND smi.criticality = 'high'
  )
  SELECT jsonb_build_object(
    'total', s.total, 'green', s.green, 'yellow', s.yellow, 'red', s.red, 'gray', s.gray,
    'healthy_pct', CASE WHEN s.total > 0 THEN ROUND((s.green::numeric / s.total) * 100) ELSE 0 END,
    'critical_red', cr.c, 'last_systemic_error', s.last_systemic_error
  ) INTO v_result FROM s, cr;
  RETURN v_result;
END; $$;

CREATE OR REPLACE FUNCTION public.get_module_integration_detail(p_module_code TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_module JSONB; v_outgoing JSONB; v_incoming JSONB; v_recent JSONB;
BEGIN
  IF NOT public.is_owner() THEN RAISE EXCEPTION 'Access denied'; END IF;
  SELECT to_jsonb(m.*) INTO v_module FROM public.system_modules m WHERE m.code = p_module_code;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'target', smi.target_module_code, 'target_name', tm.name, 'criticality', smi.criticality,
    'status', COALESCE(ihs.current_status,'gray'), 'health_score', COALESCE(ihs.health_score,0),
    'last_event_at', ihs.last_event_at, 'delay_minutes', ihs.delay_minutes
  )), '[]'::jsonb) INTO v_outgoing
  FROM public.system_module_integrations smi
  LEFT JOIN public.system_modules tm ON tm.code = smi.target_module_code
  LEFT JOIN public.integration_health_snapshots ihs
    ON ihs.source_module_code = smi.source_module_code AND ihs.target_module_code = smi.target_module_code
  WHERE smi.source_module_code = p_module_code;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'source', smi.source_module_code, 'source_name', sm.name, 'criticality', smi.criticality,
    'status', COALESCE(ihs.current_status,'gray'), 'health_score', COALESCE(ihs.health_score,0),
    'last_event_at', ihs.last_event_at, 'delay_minutes', ihs.delay_minutes
  )), '[]'::jsonb) INTO v_incoming
  FROM public.system_module_integrations smi
  LEFT JOIN public.system_modules sm ON sm.code = smi.source_module_code
  LEFT JOIN public.integration_health_snapshots ihs
    ON ihs.source_module_code = smi.source_module_code AND ihs.target_module_code = smi.target_module_code
  WHERE smi.target_module_code = p_module_code;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', e.id, 'source', e.source_module_code, 'target', e.target_module_code,
    'status', e.status, 'event_type', e.event_type, 'message', e.message, 'created_at', e.created_at
  )), '[]'::jsonb) INTO v_recent
  FROM (SELECT * FROM public.integration_health_events
        WHERE source_module_code = p_module_code OR target_module_code = p_module_code
        ORDER BY created_at DESC LIMIT 30) e;

  RETURN jsonb_build_object('module', v_module, 'outgoing', v_outgoing, 'incoming', v_incoming, 'recent_events', v_recent);
END; $$;

-- Seed
INSERT INTO public.system_modules (code, name, module_group, description) VALUES
  ('financeiro','Financeiro','financial','Lançamentos, contas a pagar/receber'),
  ('dre','DRE','financial','Demonstrativo de resultado'),
  ('fluxo_caixa','Fluxo de Caixa','financial','Cashflow gerencial'),
  ('forecast','Forecast','financial','Projeções e previsões'),
  ('crm','CRM','commercial','Leads, pedidos, clientes'),
  ('projetos','Projetos','operational','Gestão de projetos'),
  ('producao','Produção','operational','Ordens de produção e Kanban'),
  ('estoque','Estoque','operational','Controle de estoque'),
  ('suprimentos','Suprimentos','operational','Compras e fornecedores'),
  ('rh','RH','operational','Colaboradores e apontamentos'),
  ('billing','Billing Ops','platform','Subscriptions e cobrança SaaS'),
  ('lifecycle','Tenant Lifecycle','platform','Estágios do tenant'),
  ('entitlements','Entitlements','platform','Direitos de uso por tenant'),
  ('control_tower','Control Tower','platform','Painel sistêmico Owner'),
  ('automations','Automações','platform','Regras e execuções'),
  ('feature_flags','Feature Flags','platform','Rollout progressivo'),
  ('owner_admin','Owner Admin','platform','Administração SaaS'),
  ('observability','Observability','platform','Logs e notificações')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.system_module_integrations (source_module_code, target_module_code, integration_type, criticality, expected_interval_minutes, description) VALUES
  ('crm','forecast','data_sync','high',60,'Pedidos alimentam projeções'),
  ('crm','projetos','workflow','high',15,'Pedido aprovado gera projeto'),
  ('crm','financeiro','workflow','high',5,'Pedido gera lançamento financeiro'),
  ('projetos','producao','workflow','high',15,'Projeto gera OPs'),
  ('producao','estoque','data_sync','high',30,'Consumo atualiza estoque'),
  ('estoque','suprimentos','event','medium',60,'Estoque baixo dispara compra'),
  ('financeiro','dre','data_sync','high',5,'Lançamentos compõem DRE'),
  ('financeiro','fluxo_caixa','data_sync','high',5,'Lançamentos compõem fluxo'),
  ('financeiro','forecast','data_sync','medium',60,'Realizado alimenta forecast'),
  ('billing','entitlements','workflow','high',5,'Subscription define direitos'),
  ('billing','lifecycle','event','high',60,'Status de billing muda lifecycle'),
  ('lifecycle','control_tower','data_sync','medium',60,'Estágios refletem no painel'),
  ('lifecycle','entitlements','workflow','high',60,'Estágio influencia direitos'),
  ('automations','observability','event','medium',30,'Execuções geram logs'),
  ('feature_flags','entitlements','data_sync','medium',60,'Flags complementam entitlements'),
  ('owner_admin','billing','workflow','medium',60,'Owner gerencia billing'),
  ('rh','financeiro','data_sync','medium',1440,'Folha gera lançamentos'),
  ('rh','projetos','data_sync','medium',1440,'Apontamentos custeiam projetos')
ON CONFLICT (source_module_code, target_module_code) DO NOTHING;

INSERT INTO public.integration_health_snapshots (source_module_code, target_module_code, current_status, health_score)
SELECT source_module_code, target_module_code, 'gray', 0 FROM public.system_module_integrations
ON CONFLICT (source_module_code, target_module_code) DO NOTHING;

CREATE TRIGGER trg_sm_updated BEFORE UPDATE ON public.system_modules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_smi_updated BEFORE UPDATE ON public.system_module_integrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();