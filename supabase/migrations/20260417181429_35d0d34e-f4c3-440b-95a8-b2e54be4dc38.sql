-- ============================================================================
-- SMART AUTOMATION DECISION ENGINE
-- ============================================================================

-- 1. RULES TABLE
CREATE TABLE IF NOT EXISTS public.decision_engine_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL,
  condition JSONB NOT NULL DEFAULT '{}'::jsonb,
  action JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence_band TEXT NOT NULL DEFAULT 'moderate' CHECK (confidence_band IN ('low','moderate','high','critical')),
  confidence_score INTEGER NOT NULL DEFAULT 50 CHECK (confidence_score BETWEEN 0 AND 100),
  active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 100,
  is_system BOOLEAN NOT NULL DEFAULT false,
  execution_count INTEGER NOT NULL DEFAULT 0,
  last_executed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_de_rules_event ON public.decision_engine_rules(event_type) WHERE active = true;
ALTER TABLE public.decision_engine_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view rules" ON public.decision_engine_rules FOR SELECT USING (public.is_owner());
CREATE POLICY "Owners manage rules" ON public.decision_engine_rules FOR ALL USING (public.is_owner()) WITH CHECK (public.is_owner());
CREATE POLICY "Service role manages rules" ON public.decision_engine_rules FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- 2. EVENTS TABLE (fila)
CREATE TABLE IF NOT EXISTS public.decision_engine_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  tenant_id UUID,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_de_events_unprocessed ON public.decision_engine_events(created_at) WHERE processed = false;
CREATE INDEX IF NOT EXISTS idx_de_events_tenant ON public.decision_engine_events(tenant_id, event_type);
ALTER TABLE public.decision_engine_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view events" ON public.decision_engine_events FOR SELECT USING (public.is_owner());
CREATE POLICY "Service role manages events" ON public.decision_engine_events FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- 3. EXECUTIONS TABLE
CREATE TABLE IF NOT EXISTS public.decision_engine_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID REFERENCES public.decision_engine_rules(id) ON DELETE SET NULL,
  rule_name TEXT,
  event_id UUID REFERENCES public.decision_engine_events(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  tenant_id UUID,
  action_type TEXT NOT NULL,
  action_payload JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success','failed','skipped','partial')),
  confidence_band TEXT,
  confidence_score INTEGER,
  result JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_de_exec_tenant ON public.decision_engine_executions(tenant_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_de_exec_rule ON public.decision_engine_executions(rule_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_de_exec_recent ON public.decision_engine_executions(executed_at DESC);
ALTER TABLE public.decision_engine_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view executions" ON public.decision_engine_executions FOR SELECT USING (public.is_owner());
CREATE POLICY "Service role manages executions" ON public.decision_engine_executions FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- 4. EMIT EVENT FUNCTION
CREATE OR REPLACE FUNCTION public.emit_decision_event(
  p_event_type TEXT,
  p_tenant_id UUID,
  p_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO public.decision_engine_events (event_type, tenant_id, payload)
  VALUES (p_event_type, p_tenant_id, COALESCE(p_payload, '{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- 5. TRIGGER em customer_health_scores
CREATE OR REPLACE FUNCTION public.trg_emit_lifecycle_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- churn_risk subiu para alto
  IF NEW.churn_risk_band = 'high' AND (OLD.churn_risk_band IS DISTINCT FROM 'high') THEN
    PERFORM public.emit_decision_event('churn_risk_detected', NEW.tenant_id,
      jsonb_build_object('churn_risk_score', NEW.churn_risk_score, 'engagement_band', NEW.engagement_band));
  END IF;

  -- expansion ready
  IF NEW.expansion_ready_score >= 70 AND (OLD.expansion_ready_score IS NULL OR OLD.expansion_ready_score < 70) THEN
    PERFORM public.emit_decision_event('upgrade_ready_detected', NEW.tenant_id,
      jsonb_build_object('expansion_ready_score', NEW.expansion_ready_score));
  END IF;

  -- engagement caiu
  IF NEW.engagement_band = 'low' AND (OLD.engagement_band IS DISTINCT FROM 'low') THEN
    PERFORM public.emit_decision_event('engagement_score_drop', NEW.tenant_id,
      jsonb_build_object('engagement_score', NEW.engagement_score, 'previous_band', OLD.engagement_band));
  END IF;

  -- activation_score atualizado
  IF NEW.activation_score IS DISTINCT FROM OLD.activation_score THEN
    PERFORM public.emit_decision_event('activation_score_updated', NEW.tenant_id,
      jsonb_build_object('activation_score', NEW.activation_score, 'previous', OLD.activation_score));
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lifecycle_decision_events ON public.customer_health_scores;
CREATE TRIGGER trg_lifecycle_decision_events
AFTER UPDATE ON public.customer_health_scores
FOR EACH ROW EXECUTE FUNCTION public.trg_emit_lifecycle_events();

-- 6. TRIGGER em invoices
CREATE OR REPLACE FUNCTION public.trg_emit_billing_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('overdue','unpaid','failed') AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM public.emit_decision_event('billing_failed', NEW.tenant_id,
      jsonb_build_object('invoice_id', NEW.id, 'status', NEW.status, 'amount_cents', NEW.amount_cents));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_billing_decision_events ON public.invoices;
CREATE TRIGGER trg_billing_decision_events
AFTER UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.trg_emit_billing_events();

-- 7. TRIGGER em tenants (tenant_created)
CREATE OR REPLACE FUNCTION public.trg_emit_tenant_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.emit_decision_event('tenant_created', NEW.id,
    jsonb_build_object('tenant_name', NEW.name, 'created_at', NEW.created_at));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tenant_created_decision ON public.tenants;
CREATE TRIGGER trg_tenant_created_decision
AFTER INSERT ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.trg_emit_tenant_created();

-- 8. SEED DEFAULT RULES (idempotente)
INSERT INTO public.decision_engine_rules (name, description, event_type, condition, action, confidence_band, confidence_score, is_system, priority)
VALUES
  ('Activation baixa pós 3 dias', 'Se activation_score < 40 após 3 dias do tenant_created, dispara onboarding assistido.',
   'activation_score_updated',
   '{"min_days_since_created": 3, "max_activation_score": 40}'::jsonb,
   '{"type": "trigger_assisted_onboarding", "channels": ["in_app","email"]}'::jsonb,
   'high', 80, true, 10),

  ('Churn risk alto - alertar OWNER', 'Quando churn_risk_band vira high, notifica OWNER e CS.',
   'churn_risk_detected',
   '{}'::jsonb,
   '{"type": "notify_owner", "severity": "high", "create_alert": true}'::jsonb,
   'critical', 95, true, 5),

  ('Billing failed - bloqueio progressivo', 'Inicia dunning steps quando invoice fica overdue/unpaid.',
   'billing_failed',
   '{}'::jsonb,
   '{"type": "start_dunning", "step_level": "L1", "notify_owner": true}'::jsonb,
   'critical', 90, true, 5),

  ('Upgrade ready - sugerir plano', 'Quando expansion_ready >= 70, cria sugestão de upgrade.',
   'upgrade_ready_detected',
   '{}'::jsonb,
   '{"type": "suggest_upgrade", "channels": ["in_app","email"], "notify_owner": true}'::jsonb,
   'high', 75, true, 20),

  ('Engagement caiu para low', 'Engagement caiu para low, dispara reativação.',
   'engagement_score_drop',
   '{}'::jsonb,
   '{"type": "trigger_reengagement", "channels": ["email","in_app"]}'::jsonb,
   'moderate', 65, true, 30),

  ('Tenant criado - kickoff onboarding', 'Tenant novo criado, envia welcome e kickoff.',
   'tenant_created',
   '{}'::jsonb,
   '{"type": "send_welcome", "schedule_followups": true}'::jsonb,
   'high', 85, true, 15)
ON CONFLICT DO NOTHING;