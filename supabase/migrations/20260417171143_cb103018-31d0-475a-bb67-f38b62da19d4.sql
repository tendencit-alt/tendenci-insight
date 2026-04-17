-- Plan Versioning
ALTER TABLE public.tenant_plans 
  ADD COLUMN IF NOT EXISTS version_current integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS parent_plan_id uuid REFERENCES public.tenant_plans(id);

CREATE TABLE IF NOT EXISTS public.plan_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.tenant_plans(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  snapshot jsonb NOT NULL,
  changelog text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, version_number)
);
ALTER TABLE public.plan_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage plan versions" ON public.plan_versions FOR ALL USING (public.is_owner()) WITH CHECK (public.is_owner());

-- Dunning
CREATE TABLE IF NOT EXISTS public.billing_dunning_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  step_level text NOT NULL CHECK (step_level IN ('friendly_alert','reinforced_alert','partial_block','premium_block','full_suspension')),
  triggered_at timestamptz NOT NULL DEFAULT now(),
  executed_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','executed','cancelled','resolved')),
  reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dunning_tenant ON public.billing_dunning_steps(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dunning_status ON public.billing_dunning_steps(status, triggered_at);
ALTER TABLE public.billing_dunning_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage dunning" ON public.billing_dunning_steps FOR ALL USING (public.is_owner()) WITH CHECK (public.is_owner());

-- Upgrade Signals
CREATE TABLE IF NOT EXISTS public.upgrade_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  current_plan_id uuid REFERENCES public.tenant_plans(id),
  suggested_plan_id uuid REFERENCES public.tenant_plans(id),
  signal_type text NOT NULL,
  metric_key text NOT NULL,
  current_usage numeric,
  limit_value numeric,
  usage_percent numeric,
  priority integer NOT NULL DEFAULT 5,
  ai_pitch text,
  ai_generated_at timestamptz,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','dismissed','converted','expired')),
  evidence jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_upgrade_signals_tenant ON public.upgrade_signals(tenant_id, status);
ALTER TABLE public.upgrade_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage upgrade signals" ON public.upgrade_signals FOR ALL USING (public.is_owner()) WITH CHECK (public.is_owner());

-- Subscription Actions Log
CREATE TABLE IF NOT EXISTS public.subscription_actions_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  reason text NOT NULL,
  before_state jsonb,
  after_state jsonb,
  performed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sub_actions_tenant ON public.subscription_actions_log(tenant_id, created_at DESC);
ALTER TABLE public.subscription_actions_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners view actions log" ON public.subscription_actions_log FOR SELECT USING (public.is_owner());
CREATE POLICY "Owners insert actions log" ON public.subscription_actions_log FOR INSERT WITH CHECK (public.is_owner());

-- Billing Discounts
CREATE TABLE IF NOT EXISTS public.billing_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  discount_type text NOT NULL CHECK (discount_type IN ('percent','fixed','free_period')),
  value numeric NOT NULL,
  starts_at date NOT NULL DEFAULT CURRENT_DATE,
  ends_at date,
  reason text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.billing_discounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage discounts" ON public.billing_discounts FOR ALL USING (public.is_owner()) WITH CHECK (public.is_owner());

-- Detect dunning
CREATE OR REPLACE FUNCTION public.detect_billing_dunning()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count integer := 0; v_invoice record; v_days_overdue integer; v_step_level text;
BEGIN
  FOR v_invoice IN
    SELECT i.*, s.id AS sub_id FROM public.invoices i
    LEFT JOIN public.subscriptions s ON s.tenant_id = i.tenant_id AND s.status IN ('active','past_due')
    WHERE i.status IN ('pending','overdue','failed') AND i.due_date IS NOT NULL AND i.due_date < CURRENT_DATE
  LOOP
    v_days_overdue := CURRENT_DATE - v_invoice.due_date;
    v_step_level := CASE
      WHEN v_days_overdue >= 30 THEN 'full_suspension'
      WHEN v_days_overdue >= 21 THEN 'premium_block'
      WHEN v_days_overdue >= 14 THEN 'partial_block'
      WHEN v_days_overdue >= 7 THEN 'reinforced_alert'
      WHEN v_days_overdue >= 3 THEN 'friendly_alert'
      ELSE NULL END;
    IF v_step_level IS NULL THEN CONTINUE; END IF;
    IF EXISTS (SELECT 1 FROM public.billing_dunning_steps WHERE tenant_id = v_invoice.tenant_id AND invoice_id = v_invoice.id AND step_level = v_step_level AND triggered_at > now() - interval '24 hours') THEN CONTINUE; END IF;
    INSERT INTO public.billing_dunning_steps(tenant_id, subscription_id, invoice_id, step_level, reason, metadata)
    VALUES (v_invoice.tenant_id, v_invoice.sub_id, v_invoice.id, v_step_level,
      format('Fatura vencida há %s dias', v_days_overdue),
      jsonb_build_object('invoice_total', v_invoice.total, 'days_overdue', v_days_overdue));
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END; $$;

-- Detect upgrade signals
CREATE OR REPLACE FUNCTION public.detect_upgrade_signals()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count integer := 0; v_usage record; v_pct numeric; v_priority integer;
BEGIN
  FOR v_usage IN
    SELECT uc.tenant_id, uc.metric_name, uc.current_value, uc.limit_value, s.plan_id AS current_plan_id
    FROM public.usage_consumption uc
    LEFT JOIN public.subscriptions s ON s.tenant_id = uc.tenant_id AND s.status IN ('active','trial')
    WHERE uc.limit_value > 0 AND (uc.current_value / NULLIF(uc.limit_value,0)) >= 0.80
  LOOP
    v_pct := (v_usage.current_value / v_usage.limit_value) * 100;
    v_priority := CASE WHEN v_pct >= 95 THEN 1 WHEN v_pct >= 90 THEN 2 ELSE 5 END;
    IF EXISTS (SELECT 1 FROM public.upgrade_signals WHERE tenant_id = v_usage.tenant_id AND metric_key = v_usage.metric_name AND status = 'open' AND created_at > now() - interval '7 days') THEN CONTINUE; END IF;
    INSERT INTO public.upgrade_signals(tenant_id, current_plan_id, signal_type, metric_key, current_usage, limit_value, usage_percent, priority, evidence)
    VALUES (v_usage.tenant_id, v_usage.current_plan_id, 'usage_threshold', v_usage.metric_name,
      v_usage.current_value, v_usage.limit_value, v_pct, v_priority, jsonb_build_object('threshold_pct', 80));
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END; $$;

-- Overview
CREATE OR REPLACE FUNCTION public.get_billing_ops_overview()
RETURNS TABLE (
  tenant_id uuid, tenant_name text, plan_name text, subscription_status text,
  monthly_value numeric, last_invoice_date timestamptz, next_invoice_date timestamptz,
  payment_status text, open_dunning_steps integer, open_upgrade_signals integer,
  active_discounts integer, churn_risk text
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT t.id, t.name, tp.name, s.status, COALESCE(tp.price, 0)::numeric,
    (SELECT MAX(created_at) FROM public.invoices WHERE tenant_id = t.id),
    s.current_period_end,
    COALESCE((SELECT status FROM public.invoices WHERE tenant_id = t.id ORDER BY created_at DESC LIMIT 1), 'none'),
    (SELECT COUNT(*)::int FROM public.billing_dunning_steps WHERE tenant_id = t.id AND status = 'pending'),
    (SELECT COUNT(*)::int FROM public.upgrade_signals WHERE tenant_id = t.id AND status = 'open'),
    (SELECT COUNT(*)::int FROM public.billing_discounts WHERE tenant_id = t.id AND active = true),
    CASE WHEN s.status = 'cancelled' THEN 'lost'
         WHEN s.status IN ('past_due','suspended') THEN 'high'
         WHEN EXISTS (SELECT 1 FROM public.billing_dunning_steps WHERE tenant_id = t.id AND status = 'pending') THEN 'medium'
         ELSE 'low' END
  FROM public.tenants t
  LEFT JOIN public.subscriptions s ON s.tenant_id = t.id AND s.status IN ('active','trial','past_due','suspended')
  LEFT JOIN public.tenant_plans tp ON tp.id = s.plan_id
  WHERE public.is_owner();
$$;

-- KPIs
CREATE OR REPLACE FUNCTION public.get_billing_analytics_kpis()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_mrr numeric := 0; v_arr numeric := 0; v_active integer := 0; v_total integer := 0;
  v_cancelled integer := 0; v_past_due integer := 0; v_churn numeric := 0; v_inad numeric := 0;
  v_arpa numeric := 0; v_revenue_by_plan jsonb; v_upgrade_rate numeric := 0; v_upgrades_30d integer := 0;
BEGIN
  IF NOT public.is_owner() THEN RETURN jsonb_build_object('error','forbidden'); END IF;

  SELECT COALESCE(SUM(CASE WHEN s.billing_cycle = 'yearly' THEN COALESCE(tp.yearly_price,0)/12 ELSE COALESCE(tp.price,0) END),0)
    INTO v_mrr FROM public.subscriptions s LEFT JOIN public.tenant_plans tp ON tp.id = s.plan_id WHERE s.status = 'active';
  v_arr := v_mrr * 12;
  SELECT COUNT(*) INTO v_active FROM public.subscriptions WHERE status = 'active';
  SELECT COUNT(*) INTO v_total FROM public.subscriptions;
  SELECT COUNT(*) INTO v_cancelled FROM public.subscriptions WHERE status = 'cancelled';
  SELECT COUNT(*) INTO v_past_due FROM public.subscriptions WHERE status = 'past_due';
  v_churn := CASE WHEN v_total > 0 THEN (v_cancelled::numeric / v_total) * 100 ELSE 0 END;
  v_inad := CASE WHEN v_total > 0 THEN (v_past_due::numeric / v_total) * 100 ELSE 0 END;
  v_arpa := CASE WHEN v_active > 0 THEN v_mrr / v_active ELSE 0 END;

  SELECT COUNT(*) INTO v_upgrades_30d FROM public.subscription_history
    WHERE created_at > now() - interval '30 days' AND change_type = 'upgrade';
  v_upgrade_rate := CASE WHEN v_active > 0 THEN (v_upgrades_30d::numeric / v_active) * 100 ELSE 0 END;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('plan', plan_name, 'count', cnt, 'revenue', revenue)), '[]'::jsonb)
    INTO v_revenue_by_plan FROM (
    SELECT tp.name AS plan_name, COUNT(s.id) AS cnt,
      COALESCE(SUM(CASE WHEN s.billing_cycle='yearly' THEN COALESCE(tp.yearly_price,0)/12 ELSE COALESCE(tp.price,0) END),0) AS revenue
    FROM public.subscriptions s LEFT JOIN public.tenant_plans tp ON tp.id = s.plan_id
    WHERE s.status = 'active' GROUP BY tp.name) sub;

  RETURN jsonb_build_object('mrr', v_mrr, 'arr', v_arr, 'arpa', v_arpa,
    'churn_rate', v_churn, 'upgrade_rate', v_upgrade_rate, 'inadimplencia_pct', v_inad,
    'active_subs', v_active, 'total_subs', v_total, 'cancelled_subs', v_cancelled,
    'past_due_subs', v_past_due, 'revenue_by_plan', v_revenue_by_plan, 'calculated_at', now());
END; $$;

-- Trigger: snapshot plan version
CREATE OR REPLACE FUNCTION public.snapshot_plan_version()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (OLD.price IS DISTINCT FROM NEW.price OR OLD.yearly_price IS DISTINCT FROM NEW.yearly_price OR OLD.name IS DISTINCT FROM NEW.name) THEN
    NEW.version_current := COALESCE(OLD.version_current, 1) + 1;
    INSERT INTO public.plan_versions(plan_id, version_number, snapshot, changelog)
    VALUES (NEW.id, NEW.version_current, to_jsonb(OLD.*), format('Updated by %s', COALESCE(auth.uid()::text,'system')));
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_snapshot_plan_version ON public.tenant_plans;
CREATE TRIGGER trg_snapshot_plan_version BEFORE UPDATE ON public.tenant_plans
  FOR EACH ROW EXECUTE FUNCTION public.snapshot_plan_version();