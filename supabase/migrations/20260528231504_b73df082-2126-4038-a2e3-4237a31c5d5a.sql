
-- 1) subscription_plans
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  nome text NOT NULL,
  descricao text,
  preco_mensal numeric(10,2) NOT NULL DEFAULT 0,
  features_jsonb jsonb NOT NULL DEFAULT '{}'::jsonb,
  modules_jsonb jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.subscription_plans TO authenticated, anon;
GRANT ALL ON public.subscription_plans TO service_role;

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscription_plans_select_all" ON public.subscription_plans;
CREATE POLICY "subscription_plans_select_all" ON public.subscription_plans
  FOR SELECT TO authenticated, anon USING (is_active = true OR public.is_owner());

DROP POLICY IF EXISTS "subscription_plans_owner_write" ON public.subscription_plans;
CREATE POLICY "subscription_plans_owner_write" ON public.subscription_plans
  FOR ALL TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());

-- seed planos
INSERT INTO public.subscription_plans (slug, nome, descricao, preco_mensal, features_jsonb, modules_jsonb, is_active)
VALUES
  ('essencial', 'Essencial', 'Plano base com módulos comerciais e financeiro básico', 199.00,
    '{"contatos":true,"pedidos":true,"financeiro_basico":true,"catalogo":true,"rh_basico":true,"kpis_avancados":false,"producao":false,"entregas":false,"visao_consolidada":false,"automacoes_avancadas":false}'::jsonb,
    '{"comercial":true,"financeiro_basico":true,"catalogo":true,"rh_basico":true}'::jsonb,
    true),
  ('completo', 'Completo', 'Plano completo com todos os módulos e features', 499.00,
    '{"contatos":true,"pedidos":true,"financeiro_basico":true,"catalogo":true,"rh_basico":true,"kpis_avancados":true,"producao":true,"entregas":true,"visao_consolidada":true,"automacoes_avancadas":true,"bi_completo":true,"executive":true,"ai_decision":true}'::jsonb,
    '{"comercial":true,"financeiro_basico":true,"financeiro_completo":true,"catalogo":true,"rh_basico":true,"rh_completo":true,"producao":true,"entregas":true,"suprimentos":true,"bi":true,"executive":true}'::jsonb,
    true)
ON CONFLICT (slug) DO UPDATE
  SET nome = EXCLUDED.nome,
      descricao = EXCLUDED.descricao,
      preco_mensal = EXCLUDED.preco_mensal,
      features_jsonb = EXCLUDED.features_jsonb,
      modules_jsonb = EXCLUDED.modules_jsonb,
      is_active = EXCLUDED.is_active,
      updated_at = now();

-- 2) tenant_subscriptions: colunas Asaas
ALTER TABLE public.tenant_subscriptions
  ADD COLUMN IF NOT EXISTS asaas_customer_id text,
  ADD COLUMN IF NOT EXISTS asaas_subscription_id text;

-- garantir constraint de status
DO $$ BEGIN
  ALTER TABLE public.tenant_subscriptions
    ADD CONSTRAINT tenant_subscriptions_status_chk
    CHECK (status IN ('trialing','active','past_due','canceled'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) tenant_has_feature
CREATE OR REPLACE FUNCTION public.tenant_has_feature(_feature_key text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_plan_slug text;
  v_status text;
  v_features jsonb;
BEGIN
  -- Owner sempre tem acesso
  IF public.is_owner() THEN
    RETURN true;
  END IF;

  v_tenant := public.get_user_tenant_id();
  IF v_tenant IS NULL THEN
    RETURN false;
  END IF;

  SELECT plan_slug, status
    INTO v_plan_slug, v_status
    FROM public.tenant_subscriptions
   WHERE tenant_id = v_tenant
   LIMIT 1;

  IF v_plan_slug IS NULL THEN
    RETURN false;
  END IF;

  -- canceled = sem acesso premium; trialing/active/past_due ainda dão acesso (past_due em grace)
  IF v_status = 'canceled' THEN
    RETURN false;
  END IF;

  SELECT features_jsonb INTO v_features
    FROM public.subscription_plans
   WHERE slug = v_plan_slug AND is_active = true
   LIMIT 1;

  IF v_features IS NULL THEN
    RETURN false;
  END IF;

  RETURN COALESCE((v_features->>_feature_key)::boolean, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.tenant_has_feature(text) TO authenticated, anon;

-- trigger updated_at em subscription_plans
DROP TRIGGER IF EXISTS trg_subscription_plans_updated ON public.subscription_plans;
CREATE TRIGGER trg_subscription_plans_updated BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
