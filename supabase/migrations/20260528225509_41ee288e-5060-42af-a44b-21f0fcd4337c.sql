-- 1) tenants.cnpj
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS cnpj text;
CREATE UNIQUE INDEX IF NOT EXISTS tenants_cnpj_unique ON public.tenants (cnpj) WHERE cnpj IS NOT NULL;

-- 2) profiles.onboarding_completed_at
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

-- 3) tenant_subscriptions
CREATE TABLE IF NOT EXISTS public.tenant_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_slug text NOT NULL DEFAULT 'essencial',
  status text NOT NULL DEFAULT 'trialing',
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  external_subscription_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS tenant_subscriptions_tenant_uniq ON public.tenant_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS tenant_subscriptions_status_idx ON public.tenant_subscriptions(status);

GRANT SELECT ON public.tenant_subscriptions TO authenticated;
GRANT ALL ON public.tenant_subscriptions TO service_role;

ALTER TABLE public.tenant_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "tenant_subscriptions_select"
    ON public.tenant_subscriptions FOR SELECT
    TO authenticated
    USING (public.is_owner() OR public.tenant_rls_check(tenant_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- trigger updated_at
DO $$ BEGIN
  CREATE TRIGGER trg_tenant_subscriptions_updated
    BEFORE UPDATE ON public.tenant_subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4) rate_limit_signup
CREATE TABLE IF NOT EXISTS public.rate_limit_signup (
  ip text PRIMARY KEY,
  attempts integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now(),
  last_attempt_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.rate_limit_signup TO service_role;

ALTER TABLE public.rate_limit_signup ENABLE ROW LEVEL SECURITY;
-- No policies: only service_role accesses this table.