
CREATE TABLE IF NOT EXISTS public.saas_admin_action_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  target_tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  target_user_id uuid,
  action_type text NOT NULL,
  action_category text NOT NULL DEFAULT 'tenant',
  reason text NOT NULL,
  before_state jsonb,
  after_state jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saas_admin_log_tenant ON public.saas_admin_action_log(target_tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saas_admin_log_actor ON public.saas_admin_action_log(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saas_admin_log_action ON public.saas_admin_action_log(action_type, created_at DESC);

ALTER TABLE public.saas_admin_action_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner full access saas_admin_action_log"
ON public.saas_admin_action_log FOR ALL TO authenticated
USING (is_owner()) WITH CHECK (is_owner());

CREATE OR REPLACE FUNCTION public.get_saas_company_overview(_tenant_id uuid DEFAULT NULL)
RETURNS TABLE (
  tenant_id uuid, tenant_name text, tenant_slug text, active boolean,
  plan_id uuid, plan_name text, plan_price numeric,
  subscription_status text, current_period_end timestamptz, trial_ends_at timestamptz,
  health_score numeric, health_classification text,
  active_users bigint, max_users integer, last_user_login timestamptz,
  overdue_invoices bigint, active_modules bigint, created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    t.id, t.name, t.slug, t.active, t.plan_id,
    tp.name, tp.price,
    s.status, s.current_period_end, s.trial_ends_at,
    chs.total_score, chs.classification,
    (SELECT COUNT(*) FROM profiles p WHERE p.tenant_id = t.id),
    t.max_users,
    (SELECT MAX(au.last_sign_in_at) FROM auth.users au JOIN profiles p ON p.id = au.id WHERE p.tenant_id = t.id),
    (SELECT COUNT(*) FROM invoices i WHERE i.tenant_id = t.id AND i.status IN ('overdue', 'past_due')),
    (SELECT COUNT(*) FROM feature_flag_overrides ffo WHERE ffo.tenant_id = t.id AND ffo.enabled = true),
    t.created_at
  FROM tenants t
  LEFT JOIN tenant_plans tp ON tp.id = t.plan_id
  LEFT JOIN subscriptions s ON s.tenant_id = t.id
  LEFT JOIN customer_health_scores chs ON chs.tenant_id = t.id
  WHERE _tenant_id IS NULL OR t.id = _tenant_id
  ORDER BY t.name;
$$;

CREATE OR REPLACE FUNCTION public.get_saas_admin_analytics()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_tenants', (SELECT COUNT(*) FROM tenants),
    'active_tenants', (SELECT COUNT(*) FROM tenants WHERE active = true),
    'suspended_tenants', (SELECT COUNT(*) FROM subscriptions WHERE status = 'suspended'),
    'trial_tenants', (SELECT COUNT(*) FROM subscriptions WHERE status = 'trial'),
    'past_due_tenants', (SELECT COUNT(*) FROM subscriptions WHERE status = 'past_due'),
    'total_users', (SELECT COUNT(*) FROM profiles),
    'tenants_at_risk', (SELECT COUNT(*) FROM customer_health_scores WHERE classification IN ('risk', 'critical')),
    'tenants_healthy', (SELECT COUNT(*) FROM customer_health_scores WHERE classification = 'healthy'),
    'avg_health_score', (SELECT COALESCE(ROUND(AVG(total_score)::numeric, 1), 0) FROM customer_health_scores),
    'tenants_by_plan', (
      SELECT COALESCE(jsonb_object_agg(plan_name, count), '{}'::jsonb)
      FROM (SELECT COALESCE(tp.name, 'Sem plano') AS plan_name, COUNT(*) AS count
            FROM tenants t LEFT JOIN tenant_plans tp ON tp.id = t.plan_id GROUP BY tp.name) sub
    ),
    'top_active_modules', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('module', flag_key, 'count', count) ORDER BY count DESC), '[]'::jsonb)
      FROM (SELECT ff.flag_key, COUNT(*) AS count
            FROM feature_flag_overrides ffo JOIN feature_flags ff ON ff.id = ffo.flag_id
            WHERE ffo.enabled = true GROUP BY ff.flag_key ORDER BY count DESC LIMIT 10) sub
    ),
    'overdue_by_plan', (
      SELECT COALESCE(jsonb_object_agg(plan_name, count), '{}'::jsonb)
      FROM (SELECT COALESCE(tp.name, 'Sem plano') AS plan_name, COUNT(DISTINCT i.tenant_id) AS count
            FROM invoices i JOIN tenants t ON t.id = i.tenant_id
            LEFT JOIN tenant_plans tp ON tp.id = t.plan_id
            WHERE i.status IN ('overdue', 'past_due') GROUP BY tp.name) sub
    )
  ) INTO result;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_saas_tenant_limits(_tenant_id uuid)
RETURNS TABLE (
  limit_key text, limit_name text, limit_value integer,
  current_usage bigint, pct_used numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _plan_id uuid;
BEGIN
  SELECT plan_id INTO _plan_id FROM tenants WHERE id = _tenant_id;
  RETURN QUERY
  SELECT
    pl.limit_key, pl.limit_name, pl.limit_value,
    CASE pl.limit_key
      WHEN 'users' THEN (SELECT COUNT(*) FROM profiles WHERE tenant_id = _tenant_id)
      WHEN 'projects' THEN (SELECT COUNT(*) FROM projects WHERE tenant_id = _tenant_id)
      WHEN 'orders' THEN (SELECT COUNT(*) FROM orders WHERE tenant_id = _tenant_id)
      WHEN 'companies' THEN 1::bigint
      ELSE COALESCE((SELECT current_value::bigint FROM usage_consumption
                     WHERE tenant_id = _tenant_id AND metric_key = pl.limit_key
                     ORDER BY period_end DESC NULLS LAST LIMIT 1), 0)
    END AS current_usage,
    CASE WHEN pl.limit_value = 0 THEN 0::numeric
    ELSE ROUND(
      (CASE pl.limit_key
        WHEN 'users' THEN (SELECT COUNT(*) FROM profiles WHERE tenant_id = _tenant_id)
        WHEN 'projects' THEN (SELECT COUNT(*) FROM projects WHERE tenant_id = _tenant_id)
        WHEN 'orders' THEN (SELECT COUNT(*) FROM orders WHERE tenant_id = _tenant_id)
        WHEN 'companies' THEN 1::bigint
        ELSE 0::bigint
      END)::numeric / pl.limit_value::numeric * 100, 1)
    END AS pct_used
  FROM plan_limits pl
  WHERE pl.plan_id = _plan_id;
END;
$$;
