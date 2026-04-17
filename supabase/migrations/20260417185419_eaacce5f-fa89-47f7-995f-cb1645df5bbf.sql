-- ============================================================================
-- SMART UPGRADE EXPERIENCE LAYER (idempotent)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.upgrade_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  confidence_score INT NOT NULL DEFAULT 50,
  recommended_plan_id UUID REFERENCES public.tenant_plans(id),
  recommended_entitlement_code TEXT,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  message_template TEXT,
  ai_message TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add columns if missing (table pre-existed from earlier layer)
ALTER TABLE public.upgrade_signals ADD COLUMN IF NOT EXISTS confidence_score INT NOT NULL DEFAULT 50;
ALTER TABLE public.upgrade_signals ADD COLUMN IF NOT EXISTS recommended_plan_id UUID REFERENCES public.tenant_plans(id);
ALTER TABLE public.upgrade_signals ADD COLUMN IF NOT EXISTS recommended_entitlement_code TEXT;
ALTER TABLE public.upgrade_signals ADD COLUMN IF NOT EXISTS message_template TEXT;
ALTER TABLE public.upgrade_signals ADD COLUMN IF NOT EXISTS ai_message TEXT;
ALTER TABLE public.upgrade_signals ADD COLUMN IF NOT EXISTS detected_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.upgrade_signals ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days');

-- Unique constraint for upserts (drop+add safe)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'upgrade_signals_tenant_type_ent_key') THEN
    ALTER TABLE public.upgrade_signals
      ADD CONSTRAINT upgrade_signals_tenant_type_ent_key
      UNIQUE (tenant_id, signal_type, recommended_entitlement_code);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_upgrade_signals_tenant ON public.upgrade_signals(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_upgrade_signals_active ON public.upgrade_signals(status, expires_at) WHERE status = 'active';

ALTER TABLE public.upgrade_signals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='upgrade_signals' AND policyname='Tenant reads own signals v2') THEN
    CREATE POLICY "Tenant reads own signals v2" ON public.upgrade_signals FOR SELECT TO authenticated
      USING (tenant_id = public.get_user_tenant_id() OR public.is_owner());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='upgrade_signals' AND policyname='Owner manages signals v2') THEN
    CREATE POLICY "Owner manages signals v2" ON public.upgrade_signals FOR ALL TO authenticated
      USING (public.is_owner()) WITH CHECK (public.is_owner());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='upgrade_signals' AND policyname='Tenant updates own signal status v2') THEN
    CREATE POLICY "Tenant updates own signal status v2" ON public.upgrade_signals FOR UPDATE TO authenticated
      USING (tenant_id = public.get_user_tenant_id())
      WITH CHECK (tenant_id = public.get_user_tenant_id());
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_upgrade_signals_updated ON public.upgrade_signals;
CREATE TRIGGER trg_upgrade_signals_updated
  BEFORE UPDATE ON public.upgrade_signals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. UPGRADE UI EVENTS --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.upgrade_ui_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID,
  signal_id UUID REFERENCES public.upgrade_signals(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('shown','clicked','dismissed','ignored','converted')),
  surface TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_upgrade_ui_events_tenant ON public.upgrade_ui_events(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_upgrade_ui_events_signal ON public.upgrade_ui_events(signal_id, event_type);

ALTER TABLE public.upgrade_ui_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='upgrade_ui_events' AND policyname='Tenant inserts own ui events') THEN
    CREATE POLICY "Tenant inserts own ui events" ON public.upgrade_ui_events FOR INSERT TO authenticated
      WITH CHECK (tenant_id = public.get_user_tenant_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='upgrade_ui_events' AND policyname='Tenant reads own ui events') THEN
    CREATE POLICY "Tenant reads own ui events" ON public.upgrade_ui_events FOR SELECT TO authenticated
      USING (tenant_id = public.get_user_tenant_id() OR public.is_owner());
  END IF;
END $$;

-- ============================================================================
-- FUNÇÕES
-- ============================================================================

CREATE OR REPLACE FUNCTION public.should_show_upgrade_nudge(_tenant_id UUID, _signal_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_confidence INT; v_status TEXT; v_shown_last_week INT; v_ignored_count INT;
BEGIN
  SELECT confidence_score, status INTO v_confidence, v_status
  FROM upgrade_signals WHERE id = _signal_id AND tenant_id = _tenant_id;
  IF v_status IS DISTINCT FROM 'active' THEN RETURN false; END IF;
  IF COALESCE(v_confidence, 0) < 70 THEN RETURN false; END IF;
  SELECT COUNT(*) INTO v_shown_last_week FROM upgrade_ui_events
    WHERE signal_id = _signal_id AND event_type = 'shown' AND created_at > now() - interval '7 days';
  IF v_shown_last_week >= 1 THEN RETURN false; END IF;
  SELECT COUNT(*) INTO v_ignored_count FROM upgrade_ui_events
    WHERE signal_id = _signal_id AND event_type IN ('ignored','dismissed');
  IF v_ignored_count >= 3 THEN RETURN false; END IF;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_premium_feature_attempt(_tenant_id UUID, _code TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_is_premium BOOLEAN; v_recommended_plan UUID;
BEGIN
  SELECT is_premium INTO v_is_premium FROM entitlement_catalog WHERE code = _code;
  IF NOT COALESCE(v_is_premium, false) THEN RETURN; END IF;

  SELECT pe.plan_id INTO v_recommended_plan FROM plan_entitlements pe
    JOIN tenant_plans p ON p.id = pe.plan_id
    WHERE pe.entitlement_code = _code AND pe.included = true AND p.active = true
    ORDER BY p.price ASC LIMIT 1;

  INSERT INTO upgrade_signals (tenant_id, signal_type, severity, confidence_score, recommended_plan_id, recommended_entitlement_code, context)
  VALUES (_tenant_id, 'premium_feature_attempt', 'high', 85, v_recommended_plan, _code, jsonb_build_object('attempted_at', now()))
  ON CONFLICT (tenant_id, signal_type, recommended_entitlement_code) DO UPDATE
  SET confidence_score = LEAST(100, upgrade_signals.confidence_score + 5),
      context = upgrade_signals.context || jsonb_build_object('attempts', COALESCE((upgrade_signals.context->>'attempts')::int, 1) + 1, 'last_attempt', now()),
      status = 'active', updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_upgrade_signals_batch()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tenant RECORD;
BEGIN
  -- limit_reached / limit_80_percent
  FOR v_tenant IN SELECT id FROM tenants WHERE active = true LOOP
    INSERT INTO upgrade_signals (tenant_id, signal_type, severity, confidence_score, context)
    SELECT v_tenant.id,
           CASE WHEN l.pct_used >= 100 THEN 'limit_reached' ELSE 'limit_80_percent' END,
           CASE WHEN l.pct_used >= 100 THEN 'critical' ELSE 'high' END,
           CASE WHEN l.pct_used >= 100 THEN 95 ELSE 80 END,
           jsonb_build_object('limit_key', l.limit_key, 'pct_used', l.pct_used, 'usage', l.current_usage, 'limit', l.limit_value)
    FROM get_saas_tenant_limits(v_tenant.id) l
    WHERE l.pct_used >= 80
    ON CONFLICT (tenant_id, signal_type, recommended_entitlement_code) DO UPDATE
    SET context = EXCLUDED.context, confidence_score = EXCLUDED.confidence_score, status = 'active', updated_at = now();
  END LOOP;

  -- rapid_growth
  INSERT INTO upgrade_signals (tenant_id, signal_type, severity, confidence_score, context)
  SELECT chs.tenant_id, 'rapid_growth', 'medium', 75,
         jsonb_build_object('health_score', chs.health_score, 'period', '30d')
  FROM customer_health_scores chs
  WHERE chs.health_score >= 80
    AND NOT EXISTS (SELECT 1 FROM upgrade_signals s WHERE s.tenant_id = chs.tenant_id AND s.signal_type = 'rapid_growth' AND s.status = 'active')
  ON CONFLICT (tenant_id, signal_type, recommended_entitlement_code) DO NOTHING;

  UPDATE upgrade_signals SET status = 'expired' WHERE status = 'active' AND expires_at <= now();

  RETURN jsonb_build_object('generated_at', now(), 'tenants_processed', (SELECT COUNT(*) FROM tenants WHERE active = true));
END;
$$;

CREATE OR REPLACE FUNCTION public.get_active_upgrade_signals_for_tenant(_tenant_id UUID)
RETURNS TABLE (id UUID, signal_type TEXT, severity TEXT, confidence_score INT,
  recommended_entitlement_code TEXT, recommended_plan_id UUID, recommended_plan_name TEXT,
  context JSONB, message_template TEXT, ai_message TEXT, detected_at TIMESTAMPTZ, should_show BOOLEAN)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.signal_type, s.severity, s.confidence_score,
         s.recommended_entitlement_code, s.recommended_plan_id, p.name,
         s.context, s.message_template, s.ai_message, s.detected_at,
         public.should_show_upgrade_nudge(_tenant_id, s.id)
  FROM upgrade_signals s
  LEFT JOIN tenant_plans p ON p.id = s.recommended_plan_id
  WHERE s.tenant_id = _tenant_id AND s.status = 'active' AND s.expires_at > now()
  ORDER BY s.severity DESC, s.confidence_score DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_owner_upgrade_dashboard()
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_result JSONB;
BEGIN
  IF NOT public.is_owner() THEN RAISE EXCEPTION 'Only owner can access upgrade dashboard'; END IF;
  SELECT jsonb_build_object(
    'active_signals', (SELECT COUNT(*) FROM upgrade_signals WHERE status = 'active' AND expires_at > now()),
    'critical_signals', (SELECT COUNT(*) FROM upgrade_signals WHERE status = 'active' AND severity IN ('high','critical') AND expires_at > now()),
    'active_trials', (SELECT COUNT(*) FROM tenant_entitlement_grants WHERE grant_type = 'trial' AND status = 'active' AND expires_at > now()),
    'expiring_trials_7d', (SELECT COUNT(*) FROM tenant_entitlement_grants WHERE grant_type = 'trial' AND status = 'active' AND expires_at BETWEEN now() AND now() + interval '7 days'),
    'conversions_30d', (SELECT COUNT(*) FROM upgrade_ui_events WHERE event_type = 'converted' AND created_at > now() - interval '30 days'),
    'click_through_rate_30d', (
      SELECT CASE WHEN s.shown > 0 THEN ROUND(100.0 * s.clicked / s.shown, 1) ELSE 0 END
      FROM (SELECT COUNT(*) FILTER (WHERE event_type='shown') AS shown, COUNT(*) FILTER (WHERE event_type='clicked') AS clicked
            FROM upgrade_ui_events WHERE created_at > now() - interval '30 days') s
    ),
    'top_signal_types', (SELECT jsonb_agg(row_to_json(t)) FROM (
      SELECT signal_type, COUNT(*) AS count FROM upgrade_signals
      WHERE status = 'active' AND expires_at > now() GROUP BY signal_type ORDER BY count DESC LIMIT 8) t),
    'tenants_with_signals', (SELECT COUNT(DISTINCT tenant_id) FROM upgrade_signals WHERE status = 'active' AND expires_at > now())
  ) INTO v_result;
  RETURN v_result;
END;
$$;