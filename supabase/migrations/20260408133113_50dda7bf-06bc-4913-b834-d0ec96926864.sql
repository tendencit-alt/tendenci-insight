
-- 1. PRIMEIRO adicionar colunas em profiles (antes de tudo)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tenant_id UUID,
  ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;

-- 2. Tabela de planos
CREATE TABLE public.tenant_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  max_users INT NOT NULL DEFAULT 5,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  features JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tenant_plans ENABLE ROW LEVEL SECURITY;

-- 3. Tabela de tenants
CREATE TABLE public.tenants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  plan_id UUID REFERENCES public.tenant_plans(id),
  max_users INT NOT NULL DEFAULT 5,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- 4. Agora adicionar FK em profiles → tenants
ALTER TABLE public.profiles
  ADD CONSTRAINT fk_profiles_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);

-- 5. Adicionar tenant_id em company_settings
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- 6. Funções helper
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_super_admin FROM public.profiles WHERE id = auth.uid()), false)
$$;

-- 7. RLS policies (agora is_super_admin já existe)
CREATE POLICY "Authenticated can view plans"
  ON public.tenant_plans FOR SELECT TO authenticated USING (true);

CREATE POLICY "Super admins manage plans"
  ON public.tenant_plans FOR ALL TO authenticated
  USING (public.is_super_admin());

CREATE POLICY "Authenticated can view tenants"
  ON public.tenants FOR SELECT TO authenticated USING (true);

CREATE POLICY "Super admins manage tenants"
  ON public.tenants FOR ALL TO authenticated
  USING (public.is_super_admin());

-- 8. Triggers updated_at
CREATE TRIGGER update_tenant_plans_updated_at
  BEFORE UPDATE ON public.tenant_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Dados iniciais
INSERT INTO public.tenant_plans (id, name, max_users, price, features) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Básico', 5, 199.90, '{"modules": ["pedidos", "producao", "estoque"]}'),
  ('a1000000-0000-0000-0000-000000000002', 'Pro', 20, 499.90, '{"modules": ["pedidos", "producao", "estoque", "financeiro", "crm"]}'),
  ('a1000000-0000-0000-0000-000000000003', 'Enterprise', 999, 999.90, '{"modules": "all"}');

INSERT INTO public.tenants (id, name, slug, plan_id, max_users, active) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'Tendenci', 'tendenci', 'a1000000-0000-0000-0000-000000000003', 999, true);

-- 10. Vincular dados existentes
UPDATE public.profiles
SET is_super_admin = true, tenant_id = 'b1000000-0000-0000-0000-000000000001'
WHERE id = 'fb91d86d-12bf-46db-baf9-79438c34977e';

UPDATE public.profiles
SET tenant_id = 'b1000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

UPDATE public.company_settings
SET tenant_id = 'b1000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;
