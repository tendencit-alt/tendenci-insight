-- ============================================================================
-- SMART MODULE ENTITLEMENT LAYER
-- Camada central de direitos comerciais por tenant
-- ============================================================================

-- 1. ENTITLEMENT CATALOG ------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.entitlement_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  entitlement_group TEXT NOT NULL DEFAULT 'module',
  type TEXT NOT NULL DEFAULT 'module' CHECK (type IN ('module','feature','limit','addon')),
  is_core BOOLEAN NOT NULL DEFAULT false,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  is_limit_based BOOLEAN NOT NULL DEFAULT false,
  default_limit NUMERIC,
  unit TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.entitlement_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read entitlement catalog"
  ON public.entitlement_catalog FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Owner manages entitlement catalog"
  ON public.entitlement_catalog FOR ALL
  TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());

CREATE TRIGGER trg_entitlement_catalog_updated
  BEFORE UPDATE ON public.entitlement_catalog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. PLAN -> ENTITLEMENT MAPPING ----------------------------------------------
CREATE TABLE IF NOT EXISTS public.plan_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.tenant_plans(id) ON DELETE CASCADE,
  entitlement_code TEXT NOT NULL REFERENCES public.entitlement_catalog(code) ON DELETE CASCADE,
  included BOOLEAN NOT NULL DEFAULT true,
  limit_value NUMERIC,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(plan_id, entitlement_code)
);

CREATE INDEX idx_plan_entitlements_plan ON public.plan_entitlements(plan_id);
CREATE INDEX idx_plan_entitlements_code ON public.plan_entitlements(entitlement_code);

ALTER TABLE public.plan_entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read plan entitlements"
  ON public.plan_entitlements FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Owner manages plan entitlements"
  ON public.plan_entitlements FOR ALL
  TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());

CREATE TRIGGER trg_plan_entitlements_updated
  BEFORE UPDATE ON public.plan_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. TENANT ENTITLEMENT OVERRIDES ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_entitlement_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entitlement_code TEXT NOT NULL REFERENCES public.entitlement_catalog(code) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  limit_value NUMERIC,
  reason TEXT,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','support','campaign','onboarding','retention','migration')),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, entitlement_code)
);

CREATE INDEX idx_tenant_overrides_tenant ON public.tenant_entitlement_overrides(tenant_id);
CREATE INDEX idx_tenant_overrides_active ON public.tenant_entitlement_overrides(active, expires_at) WHERE active = true;

ALTER TABLE public.tenant_entitlement_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant reads own overrides"
  ON public.tenant_entitlement_overrides FOR SELECT
  TO authenticated USING (tenant_id = public.get_user_tenant_id() OR public.is_owner());

CREATE POLICY "Owner manages overrides"
  ON public.tenant_entitlement_overrides FOR ALL
  TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());

CREATE TRIGGER trg_tenant_overrides_updated
  BEFORE UPDATE ON public.tenant_entitlement_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. GRANTS (TRIALS + UPGRADES TEMPORARIOS) -----------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_entitlement_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entitlement_code TEXT NOT NULL REFERENCES public.entitlement_catalog(code) ON DELETE CASCADE,
  grant_type TEXT NOT NULL CHECK (grant_type IN ('trial','upgrade','campaign','manual','onboarding_bonus')),
  duration_days INT,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','revoked','converted')),
  reason TEXT,
  granted_by UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenant_grants_tenant ON public.tenant_entitlement_grants(tenant_id);
CREATE INDEX idx_tenant_grants_active ON public.tenant_entitlement_grants(status, expires_at) WHERE status = 'active';

ALTER TABLE public.tenant_entitlement_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant reads own grants"
  ON public.tenant_entitlement_grants FOR SELECT
  TO authenticated USING (tenant_id = public.get_user_tenant_id() OR public.is_owner());

CREATE POLICY "Owner manages grants"
  ON public.tenant_entitlement_grants FOR ALL
  TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());

CREATE TRIGGER trg_tenant_grants_updated
  BEFORE UPDATE ON public.tenant_entitlement_grants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. ACCESS LOG (analytics de bloqueios) --------------------------------------
CREATE TABLE IF NOT EXISTS public.entitlement_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  user_id UUID,
  entitlement_code TEXT NOT NULL,
  allowed BOOLEAN NOT NULL,
  reason TEXT,
  context JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_entitlement_log_tenant ON public.entitlement_access_log(tenant_id, created_at DESC);
CREATE INDEX idx_entitlement_log_code ON public.entitlement_access_log(entitlement_code, created_at DESC);

ALTER TABLE public.entitlement_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant inserts own log"
  ON public.entitlement_access_log FOR INSERT
  TO authenticated WITH CHECK (tenant_id = public.get_user_tenant_id() OR tenant_id IS NULL);

CREATE POLICY "Owner reads access log"
  ON public.entitlement_access_log FOR SELECT
  TO authenticated USING (public.is_owner());

-- ============================================================================
-- FUNÇÕES DE RESOLUÇÃO
-- ============================================================================

-- Resolver principal: decide se um tenant tem entitlement em runtime
CREATE OR REPLACE FUNCTION public.has_entitlement(_tenant_id UUID, _code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id UUID;
  v_billing_status TEXT;
  v_override RECORD;
  v_grant RECORD;
  v_plan_included BOOLEAN;
  v_is_core BOOLEAN;
BEGIN
  IF _tenant_id IS NULL OR _code IS NULL THEN RETURN false; END IF;

  -- Core sempre liberado
  SELECT is_core INTO v_is_core FROM entitlement_catalog WHERE code = _code AND active = true;
  IF v_is_core IS NULL THEN RETURN false; END IF;
  IF v_is_core THEN RETURN true; END IF;

  -- 1. Override explícito vence tudo (se ativo e dentro da validade)
  SELECT * INTO v_override
  FROM tenant_entitlement_overrides
  WHERE tenant_id = _tenant_id AND entitlement_code = _code AND active = true
    AND (starts_at IS NULL OR starts_at <= now())
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;
  IF FOUND THEN RETURN v_override.enabled; END IF;

  -- 2. Grant ativo libera
  SELECT * INTO v_grant
  FROM tenant_entitlement_grants
  WHERE tenant_id = _tenant_id AND entitlement_code = _code
    AND status = 'active' AND expires_at > now()
  LIMIT 1;
  IF FOUND THEN RETURN true; END IF;

  -- 3. Billing bloqueado bloqueia tudo (exceto core)
  SELECT subscription_status INTO v_billing_status FROM tenants WHERE id = _tenant_id;
  IF v_billing_status IN ('past_due','suspended','canceled') THEN RETURN false; END IF;

  -- 4. Plano define
  SELECT plan_id INTO v_plan_id FROM tenants WHERE id = _tenant_id;
  IF v_plan_id IS NULL THEN RETURN false; END IF;

  SELECT included INTO v_plan_included
  FROM plan_entitlements
  WHERE plan_id = v_plan_id AND entitlement_code = _code;

  RETURN COALESCE(v_plan_included, false);
END;
$$;

-- Limite efetivo: max(plan, override, grant)
CREATE OR REPLACE FUNCTION public.get_tenant_entitlement_limit(_tenant_id UUID, _code TEXT)
RETURNS NUMERIC
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id UUID;
  v_plan_limit NUMERIC;
  v_override_limit NUMERIC;
  v_default NUMERIC;
BEGIN
  SELECT default_limit INTO v_default FROM entitlement_catalog WHERE code = _code;
  SELECT plan_id INTO v_plan_id FROM tenants WHERE id = _tenant_id;
  SELECT limit_value INTO v_plan_limit FROM plan_entitlements WHERE plan_id = v_plan_id AND entitlement_code = _code;
  SELECT limit_value INTO v_override_limit FROM tenant_entitlement_overrides
    WHERE tenant_id = _tenant_id AND entitlement_code = _code AND active = true
      AND (expires_at IS NULL OR expires_at > now());

  RETURN GREATEST(
    COALESCE(v_override_limit, 0),
    COALESCE(v_plan_limit, 0),
    COALESCE(v_default, 0)
  );
END;
$$;

-- Mapa completo de entitlements para o tenant (carregado no login)
CREATE OR REPLACE FUNCTION public.get_tenant_entitlements_resolved(_tenant_id UUID)
RETURNS TABLE (
  code TEXT,
  name TEXT,
  entitlement_group TEXT,
  type TEXT,
  is_premium BOOLEAN,
  enabled BOOLEAN,
  source TEXT,
  limit_value NUMERIC,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id UUID;
  v_billing_status TEXT;
BEGIN
  SELECT plan_id, subscription_status INTO v_plan_id, v_billing_status
  FROM tenants WHERE id = _tenant_id;

  RETURN QUERY
  SELECT
    c.code,
    c.name,
    c.entitlement_group,
    c.type,
    c.is_premium,
    CASE
      WHEN c.is_core THEN true
      WHEN ovr.id IS NOT NULL AND ovr.active AND (ovr.expires_at IS NULL OR ovr.expires_at > now()) THEN ovr.enabled
      WHEN gr.id IS NOT NULL THEN true
      WHEN v_billing_status IN ('past_due','suspended','canceled') THEN false
      ELSE COALESCE(pe.included, false)
    END AS enabled,
    CASE
      WHEN c.is_core THEN 'core'
      WHEN ovr.id IS NOT NULL THEN 'override'
      WHEN gr.id IS NOT NULL THEN 'grant'
      WHEN v_billing_status IN ('past_due','suspended','canceled') THEN 'billing_blocked'
      ELSE 'plan'
    END AS source,
    GREATEST(
      COALESCE(ovr.limit_value, 0),
      COALESCE(pe.limit_value, 0),
      COALESCE(c.default_limit, 0)
    ) AS limit_value,
    COALESCE(ovr.expires_at, gr.expires_at) AS expires_at
  FROM entitlement_catalog c
  LEFT JOIN plan_entitlements pe ON pe.plan_id = v_plan_id AND pe.entitlement_code = c.code
  LEFT JOIN tenant_entitlement_overrides ovr
    ON ovr.tenant_id = _tenant_id AND ovr.entitlement_code = c.code AND ovr.active = true
  LEFT JOIN tenant_entitlement_grants gr
    ON gr.tenant_id = _tenant_id AND gr.entitlement_code = c.code
   AND gr.status = 'active' AND gr.expires_at > now()
  WHERE c.active = true;
END;
$$;

-- Analytics para o painel Owner
CREATE OR REPLACE FUNCTION public.get_owner_entitlement_analytics()
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT public.is_owner() THEN
    RAISE EXCEPTION 'Only owner can access entitlement analytics';
  END IF;

  SELECT jsonb_build_object(
    'total_entitlements', (SELECT COUNT(*) FROM entitlement_catalog WHERE active = true),
    'active_overrides', (SELECT COUNT(*) FROM tenant_entitlement_overrides WHERE active = true AND (expires_at IS NULL OR expires_at > now())),
    'active_grants', (SELECT COUNT(*) FROM tenant_entitlement_grants WHERE status = 'active' AND expires_at > now()),
    'expiring_grants_7d', (SELECT COUNT(*) FROM tenant_entitlement_grants WHERE status = 'active' AND expires_at BETWEEN now() AND now() + interval '7 days'),
    'top_overrides', (
      SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT entitlement_code, COUNT(*) AS count
        FROM tenant_entitlement_overrides WHERE active = true
        GROUP BY entitlement_code ORDER BY count DESC LIMIT 5
      ) t
    ),
    'top_blocked', (
      SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT entitlement_code, COUNT(*) AS count
        FROM entitlement_access_log
        WHERE allowed = false AND created_at > now() - interval '30 days'
        GROUP BY entitlement_code ORDER BY count DESC LIMIT 10
      ) t
    ),
    'tenants_in_trial', (SELECT COUNT(DISTINCT tenant_id) FROM tenant_entitlement_grants WHERE grant_type = 'trial' AND status = 'active' AND expires_at > now())
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Job: expira grants vencidos
CREATE OR REPLACE FUNCTION public.expire_entitlement_grants()
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE tenant_entitlement_grants
     SET status = 'expired', updated_at = now()
   WHERE status = 'active' AND expires_at <= now();
  GET DIAGNOSTICS v_count = ROW_COUNT;

  UPDATE tenant_entitlement_overrides
     SET active = false, updated_at = now()
   WHERE active = true AND expires_at IS NOT NULL AND expires_at <= now();

  RETURN v_count;
END;
$$;

-- ============================================================================
-- SEED INICIAL DO CATALOGO
-- ============================================================================
INSERT INTO public.entitlement_catalog (code, name, description, entitlement_group, type, is_core, is_premium, is_limit_based, default_limit, unit) VALUES
  ('crm', 'CRM', 'Gestão de leads e oportunidades', 'core_modules', 'module', true, false, false, NULL, NULL),
  ('orders', 'Pedidos', 'Gestão de pedidos e contratos', 'core_modules', 'module', true, false, false, NULL, NULL),
  ('financial', 'Financeiro', 'Contas a pagar/receber, DRE básico', 'core_modules', 'module', true, false, false, NULL, NULL),
  ('projects', 'Projetos', 'Gestão de projetos e tarefas', 'operations', 'module', false, false, false, NULL, NULL),
  ('production', 'Produção', 'Ordens de produção e Kanban', 'operations', 'module', false, false, false, NULL, NULL),
  ('inventory', 'Estoque', 'Gestão de estoque e MRP', 'operations', 'module', false, false, false, NULL, NULL),
  ('purchases', 'Compras', 'Cotações e pedidos de compra', 'operations', 'module', false, false, false, NULL, NULL),
  ('hr', 'RH Operacional', 'Custeio por colaborador e apontamentos', 'operations', 'module', false, false, false, NULL, NULL),
  ('dre_advanced', 'DRE Avançada', 'DRE multi-cenário com drill-down', 'analytics', 'feature', false, true, false, NULL, NULL),
  ('forecast', 'Forecast Financeiro', 'Projeção e simulações de fluxo de caixa', 'analytics', 'feature', false, true, false, NULL, NULL),
  ('benchmarks', 'Benchmarks', 'Comparativos de mercado por cluster', 'analytics', 'feature', false, true, false, NULL, NULL),
  ('ai_decision_assistant', 'IA Assistente de Decisão', 'Recomendações e diagnósticos por IA', 'ai', 'feature', false, true, false, NULL, NULL),
  ('automations_advanced', 'Automações Avançadas', 'Decision Engine e regras multi-step', 'automation', 'feature', false, true, false, NULL, NULL),
  ('integrations_api', 'API Pública', 'Tokens de API e webhooks externos', 'integrations', 'feature', false, true, false, NULL, NULL),
  ('control_tower_owner', 'Control Tower Owner', 'Painel executivo SaaS-wide', 'owner_only', 'feature', false, true, false, NULL, NULL),
  ('limit_users', 'Limite de Usuários', 'Quantidade máxima de usuários ativos', 'limits', 'limit', false, false, true, 5, 'users'),
  ('limit_projects', 'Limite de Projetos', 'Projetos simultâneos', 'limits', 'limit', false, false, true, 10, 'projects'),
  ('limit_orders_month', 'Limite de Pedidos/mês', 'Pedidos criados por mês', 'limits', 'limit', false, false, true, 100, 'orders'),
  ('limit_storage_mb', 'Limite de Armazenamento', 'Espaço total em MB', 'limits', 'limit', false, false, true, 1000, 'mb')
ON CONFLICT (code) DO NOTHING;