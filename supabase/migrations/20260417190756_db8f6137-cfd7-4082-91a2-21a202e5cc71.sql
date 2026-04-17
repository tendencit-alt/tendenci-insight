-- ============================================================================
-- SMART OFFER ORCHESTRATION LAYER
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.offer_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_code TEXT NOT NULL UNIQUE,
  offer_type TEXT NOT NULL CHECK (offer_type IN (
    'upgrade_plano','trial_feature','discount_offer','temporary_limit_extension',
    'retention_offer','cross_sell_module','reactivation_offer'
  )),
  name TEXT NOT NULL,
  description TEXT,
  target_plan_id UUID REFERENCES public.tenant_plans(id),
  target_entitlement_code TEXT,
  duration_days INTEGER DEFAULT 14,
  priority_base INTEGER NOT NULL DEFAULT 50,
  goal TEXT,
  default_channel TEXT DEFAULT 'in_app_contextual' CHECK (default_channel IN (
    'in_app_contextual','dashboard_widget','billing_panel','control_tower_owner','email','banner_modulo_bloqueado'
  )),
  message_template TEXT,
  cta_label TEXT DEFAULT 'Saiba mais',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','archived')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.offer_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_manage_offer_catalog" ON public.offer_catalog FOR ALL TO authenticated
  USING (public.is_owner()) WITH CHECK (public.is_owner());
CREATE POLICY "authenticated_read_offer_catalog" ON public.offer_catalog FOR SELECT TO authenticated
  USING (status = 'active');

CREATE TABLE IF NOT EXISTS public.offer_priority_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL UNIQUE,
  signal_category TEXT NOT NULL CHECK (signal_category IN (
    'billing_risk','retention_critical','limit_reached','expansion_signal','cross_sell','reactivation','generic'
  )),
  offer_type TEXT,
  priority_weight INTEGER NOT NULL DEFAULT 50,
  active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.offer_priority_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_manage_priority_rules" ON public.offer_priority_rules FOR ALL TO authenticated
  USING (public.is_owner()) WITH CHECK (public.is_owner());

CREATE TABLE IF NOT EXISTS public.offer_eligibility_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_code TEXT NOT NULL REFERENCES public.offer_catalog(offer_code) ON DELETE CASCADE,
  rule_key TEXT NOT NULL,
  rule_expression JSONB NOT NULL DEFAULT '{}'::jsonb,
  block_message TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(offer_code, rule_key)
);

ALTER TABLE public.offer_eligibility_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_manage_eligibility" ON public.offer_eligibility_rules FOR ALL TO authenticated
  USING (public.is_owner()) WITH CHECK (public.is_owner());

CREATE TABLE IF NOT EXISTS public.offer_delivery_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  offer_code TEXT NOT NULL,
  signal_id UUID REFERENCES public.upgrade_signals(id) ON DELETE SET NULL,
  channel TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'shown','clicked','accepted','ignored','dismissed','converted','expired','suppressed'
  )),
  user_id UUID,
  ai_personalized BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offer_delivery_tenant ON public.offer_delivery_events(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_offer_delivery_offer ON public.offer_delivery_events(offer_code, event_type);

ALTER TABLE public.offer_delivery_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_read_own_delivery" ON public.offer_delivery_events FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id() OR public.is_owner());
CREATE POLICY "tenant_insert_own_delivery" ON public.offer_delivery_events FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id() OR public.is_owner());

CREATE TABLE IF NOT EXISTS public.offer_suppression_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  offer_code TEXT NOT NULL,
  reason TEXT NOT NULL,
  suppressed_until TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suppression_tenant_offer ON public.offer_suppression_log(tenant_id, offer_code, suppressed_until DESC);

ALTER TABLE public.offer_suppression_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_read_suppression" ON public.offer_suppression_log FOR SELECT TO authenticated
  USING (public.is_owner() OR tenant_id = public.get_user_tenant_id());
CREATE POLICY "system_insert_suppression" ON public.offer_suppression_log FOR INSERT TO authenticated
  WITH CHECK (true);

-- SEED ----------------------------------------------------------------------
INSERT INTO public.offer_catalog (offer_code, offer_type, name, description, priority_base, default_channel, message_template, cta_label) VALUES
  ('upgrade_pro_limit', 'upgrade_plano', 'Upgrade para Plano Pro', 'Expanda seus limites operacionais', 80, 'banner_modulo_bloqueado', 'Você atingiu o limite do plano atual. Faça upgrade e continue crescendo sem interrupções.', 'Fazer upgrade'),
  ('trial_ai_assistant', 'trial_feature', 'Trial: AI Assistant', 'Teste o AI Assistant por 14 dias', 60, 'in_app_contextual', 'Libere o AI Assistant gratuitamente por 14 dias e veja como acelera seu time.', 'Ativar trial'),
  ('trial_advanced_bi', 'trial_feature', 'Trial: BI Avançado', 'Dashboards executivos por 14 dias', 60, 'in_app_contextual', 'Experimente o BI Avançado por 14 dias e descubra insights ocultos no seu negócio.', 'Ativar trial'),
  ('retention_discount_20', 'retention_offer', 'Desconto Retenção 20%', 'Oferta especial para tenants em risco', 95, 'billing_panel', 'Temos uma condição especial para você continuar crescendo conosco. Fale com o time.', 'Quero ofertar'),
  ('cross_sell_automation', 'cross_sell_module', 'Cross-sell: Automações', 'Adicione módulo de automações', 50, 'dashboard_widget', 'Você usa vários módulos integrados. Automações avançadas economizam horas por semana.', 'Conhecer'),
  ('limit_extension_30d', 'temporary_limit_extension', 'Extensão Temporária 30d', 'Limite estendido por 30 dias', 70, 'banner_modulo_bloqueado', 'Liberamos uma extensão temporária para você não parar. Considere o upgrade.', 'Continuar'),
  ('reactivation_welcome_back', 'reactivation_offer', 'Bem-vindo de volta', 'Para tenants inativos', 40, 'email', 'Sentimos sua falta. Veja o que mudou e ganhe 14 dias de premium.', 'Voltar')
ON CONFLICT (offer_code) DO NOTHING;

INSERT INTO public.offer_priority_rules (rule_name, signal_category, offer_type, priority_weight, notes) VALUES
  ('billing_risk_critical', 'billing_risk', 'retention_offer', 100, 'Billing em falha sempre vence'),
  ('retention_high_risk', 'retention_critical', 'retention_offer', 95, 'Churn risk alto prioriza retenção'),
  ('limit_reached_high', 'limit_reached', 'upgrade_plano', 85, 'Limite atingido empurra upgrade'),
  ('expansion_signal_med', 'expansion_signal', 'trial_feature', 65, 'Sinal de expansão prioriza trial'),
  ('cross_sell_low', 'cross_sell', 'cross_sell_module', 40, 'Cross-sell tem menor prioridade'),
  ('reactivation_default', 'reactivation', 'reactivation_offer', 30, 'Reativação só quando nada melhor existe')
ON CONFLICT (rule_name) DO NOTHING;

-- HELPERS -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.map_signal_to_category(_signal_type TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE _signal_type
    WHEN 'limit_reached' THEN 'limit_reached'
    WHEN 'limit_80_percent' THEN 'limit_reached'
    WHEN 'premium_feature_attempt' THEN 'expansion_signal'
    WHEN 'multi_module_usage' THEN 'expansion_signal'
    WHEN 'rapid_growth' THEN 'expansion_signal'
    WHEN 'forecast_candidate' THEN 'expansion_signal'
    WHEN 'automation_candidate' THEN 'cross_sell'
    WHEN 'integration_candidate' THEN 'cross_sell'
    WHEN 'health_premium_ready' THEN 'expansion_signal'
    ELSE 'generic'
  END;
$$;

CREATE OR REPLACE FUNCTION public.check_offer_eligibility(_tenant_id UUID, _offer_code TEXT)
RETURNS TABLE(eligible BOOLEAN, reason TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_offer RECORD; v_tenant RECORD;
  v_existing INTEGER; v_recent INTEGER; v_ignored INTEGER;
BEGIN
  SELECT * INTO v_offer FROM offer_catalog WHERE offer_code = _offer_code AND status = 'active';
  IF NOT FOUND THEN RETURN QUERY SELECT false, 'offer_not_found'::TEXT; RETURN; END IF;

  SELECT t.* INTO v_tenant FROM tenants t WHERE t.id = _tenant_id;
  IF v_tenant.status = 'suspended' THEN RETURN QUERY SELECT false, 'tenant_suspended'::TEXT; RETURN; END IF;

  IF v_offer.offer_type = 'trial_feature' AND v_offer.target_entitlement_code IS NOT NULL THEN
    SELECT COUNT(*) INTO v_existing FROM tenant_entitlement_grants
    WHERE tenant_id = _tenant_id AND entitlement_code = v_offer.target_entitlement_code AND grant_type = 'trial';
    IF v_existing > 0 THEN RETURN QUERY SELECT false, 'trial_already_used'::TEXT; RETURN; END IF;
  END IF;

  SELECT COUNT(*) INTO v_recent FROM offer_suppression_log
  WHERE tenant_id = _tenant_id AND offer_code = _offer_code
    AND (suppressed_until IS NULL OR suppressed_until > now());
  IF v_recent > 0 THEN RETURN QUERY SELECT false, 'suppressed'::TEXT; RETURN; END IF;

  SELECT COUNT(*) INTO v_ignored FROM offer_delivery_events
  WHERE tenant_id = _tenant_id AND offer_code = _offer_code
    AND event_type IN ('ignored','dismissed') AND created_at > now() - INTERVAL '30 days';
  IF v_ignored >= 3 THEN RETURN QUERY SELECT false, 'too_many_ignored'::TEXT; RETURN; END IF;

  SELECT COUNT(*) INTO v_recent FROM offer_delivery_events
  WHERE tenant_id = _tenant_id AND offer_code = _offer_code
    AND event_type = 'shown' AND created_at > now() - INTERVAL '7 days';
  IF v_recent > 0 THEN RETURN QUERY SELECT false, 'recently_shown'::TEXT; RETURN; END IF;

  RETURN QUERY SELECT true, 'eligible'::TEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_best_offer_for_tenant(_tenant_id UUID, _channel TEXT DEFAULT 'in_app_contextual')
RETURNS TABLE(
  offer_code TEXT, offer_type TEXT, name TEXT, message TEXT, cta_label TEXT,
  channel TEXT, priority_score INTEGER, signal_id UUID, reasoning TEXT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_billing_critical BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM subscriptions WHERE tenant_id = _tenant_id AND status IN ('past_due','canceled','unpaid')
  ) INTO v_billing_critical;

  RETURN QUERY
  WITH candidates AS (
    SELECT
      oc.offer_code, oc.offer_type, oc.name,
      COALESCE(us.ai_message, us.message_template, oc.message_template) AS message,
      oc.cta_label, COALESCE(_channel, oc.default_channel) AS channel,
      (oc.priority_base + COALESCE(opr.priority_weight, 0) + COALESCE(us.confidence_score, 0)::int)::INTEGER AS priority_score,
      us.id AS signal_id,
      ('signal:' || us.signal_type || ' cat:' || public.map_signal_to_category(us.signal_type))::TEXT AS reasoning
    FROM upgrade_signals us
    JOIN offer_catalog oc ON oc.target_entitlement_code = us.recommended_entitlement_code
                          OR oc.target_plan_id = us.recommended_plan_id
    LEFT JOIN offer_priority_rules opr
      ON opr.signal_category = public.map_signal_to_category(us.signal_type)
     AND opr.offer_type = oc.offer_type AND opr.active = true
    WHERE us.tenant_id = _tenant_id AND us.status = 'active'
      AND us.expires_at > now() AND oc.status = 'active'
      AND (NOT v_billing_critical OR oc.offer_type = 'retention_offer')
    UNION ALL
    SELECT oc.offer_code, oc.offer_type, oc.name, oc.message_template, oc.cta_label,
      COALESCE(_channel, oc.default_channel), (oc.priority_base + 100)::INTEGER,
      NULL::UUID, 'billing_critical_retention'::TEXT
    FROM offer_catalog oc
    WHERE v_billing_critical AND oc.offer_type = 'retention_offer' AND oc.status = 'active'
  ),
  eligible AS (
    SELECT c.*, e.eligible FROM candidates c
    CROSS JOIN LATERAL public.check_offer_eligibility(_tenant_id, c.offer_code) e
  )
  SELECT e.offer_code, e.offer_type, e.name, e.message, e.cta_label, e.channel,
         e.priority_score, e.signal_id, e.reasoning
  FROM eligible e WHERE e.eligible = true
  ORDER BY e.priority_score DESC LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_offer_event(
  _tenant_id UUID, _offer_code TEXT, _channel TEXT, _event_type TEXT,
  _signal_id UUID DEFAULT NULL, _user_id UUID DEFAULT NULL, _metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO offer_delivery_events (tenant_id, offer_code, signal_id, channel, event_type, user_id, metadata)
  VALUES (_tenant_id, _offer_code, _signal_id, _channel, _event_type, _user_id, _metadata)
  RETURNING id INTO v_id;

  IF _event_type IN ('ignored','dismissed') THEN
    IF (SELECT COUNT(*) FROM offer_delivery_events
        WHERE tenant_id = _tenant_id AND offer_code = _offer_code
          AND event_type IN ('ignored','dismissed') AND created_at > now() - INTERVAL '30 days') >= 3 THEN
      INSERT INTO offer_suppression_log (tenant_id, offer_code, reason, suppressed_until)
      VALUES (_tenant_id, _offer_code, 'auto_3_ignored', now() + INTERVAL '60 days');
    END IF;
  END IF;

  IF _event_type = 'converted' AND _signal_id IS NOT NULL THEN
    UPDATE upgrade_signals SET status = 'converted' WHERE id = _signal_id;
  END IF;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_offer_analytics()
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_result JSONB;
BEGIN
  IF NOT public.is_owner() THEN RAISE EXCEPTION 'forbidden'; END IF;

  WITH per_offer AS (
    SELECT ode.offer_code, oc.offer_type, oc.name,
      COUNT(*) FILTER (WHERE ode.event_type = 'shown') AS shown,
      COUNT(*) FILTER (WHERE ode.event_type = 'clicked') AS clicked,
      COUNT(*) FILTER (WHERE ode.event_type = 'converted') AS converted,
      COUNT(*) FILTER (WHERE ode.event_type IN ('ignored','dismissed')) AS ignored,
      COUNT(*) FILTER (WHERE ode.event_type = 'suppressed') AS suppressed
    FROM offer_delivery_events ode
    JOIN offer_catalog oc ON oc.offer_code = ode.offer_code
    WHERE ode.created_at > now() - INTERVAL '90 days'
    GROUP BY ode.offer_code, oc.offer_type, oc.name
  ),
  per_type AS (
    SELECT offer_type, SUM(shown) AS shown, SUM(clicked) AS clicked, SUM(converted) AS converted,
      CASE WHEN SUM(shown) > 0 THEN ROUND(100.0 * SUM(converted) / SUM(shown), 2) ELSE 0 END AS conversion_rate
    FROM per_offer GROUP BY offer_type
  )
  SELECT jsonb_build_object(
    'totals', (SELECT jsonb_build_object(
      'shown', COALESCE(SUM(shown),0), 'clicked', COALESCE(SUM(clicked),0),
      'converted', COALESCE(SUM(converted),0), 'ignored', COALESCE(SUM(ignored),0),
      'suppressed', COALESCE(SUM(suppressed),0)
    ) FROM per_offer),
    'per_offer', (SELECT COALESCE(jsonb_agg(to_jsonb(p)), '[]'::jsonb) FROM per_offer p),
    'per_type', (SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) FROM per_type t),
    'top_ignored', (SELECT COALESCE(jsonb_agg(to_jsonb(p)), '[]'::jsonb)
                    FROM (SELECT * FROM per_offer ORDER BY ignored DESC LIMIT 5) p),
    'top_converted', (SELECT COALESCE(jsonb_agg(to_jsonb(p)), '[]'::jsonb)
                      FROM (SELECT * FROM per_offer ORDER BY converted DESC LIMIT 5) p)
  ) INTO v_result;
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_best_offer_for_tenant TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_offer_eligibility TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_offer_event TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_offer_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION public.map_signal_to_category TO authenticated;