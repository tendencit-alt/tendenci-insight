-- =========================================================
-- Feature catalog (mapeamento folha → módulo)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.feature_catalog (
  feature_key text PRIMARY KEY,
  module text NOT NULL,
  label text NOT NULL,
  root_key text NOT NULL,
  root_label text NOT NULL,
  owner_only boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.feature_catalog TO anon, authenticated;
GRANT ALL ON public.feature_catalog TO service_role;

ALTER TABLE public.feature_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feature_catalog_read_all" ON public.feature_catalog;
CREATE POLICY "feature_catalog_read_all"
  ON public.feature_catalog FOR SELECT
  USING (true);

-- Seed idempotente da árvore atual (espelha src/config/menuPermissionMap.ts)
INSERT INTO public.feature_catalog (feature_key, module, label, root_key, root_label, owner_only) VALUES
  -- Hoje
  ('/central-navegacao',           'dashboard',           'Central de Navegação',                 'hoje',         'Hoje',                          false),
  ('/control-tower',               'dashboard_executivo', 'Control Tower',                        'hoje',         'Hoje',                          false),
  ('/executive',                   'dashboard_executivo', 'Executive Center',                     'hoje',         'Hoje',                          false),
  -- Comercial
  ('/pedidos',                     'pedidos',             'Pedidos',                              'comercial',    'Comercial',                     false),
  ('/contatos',                    'comercial',           'Clientes / Fornecedores (Contatos)',   'comercial',    'Comercial',                     false),
  ('/crm',                         'comercial',           'CRM',                                  'comercial',    'Comercial',                     false),
  ('/catalogo',                    'comercial',           'Catálogo de Produtos',                 'comercial',    'Comercial',                     false),
  ('/comissoes',                   'comercial',           'Compromissos sobre Venda',             'comercial',    'Comercial',                     false),
  -- Operação
  ('/producao-operacoes',          'operacional',         'Produção',                             'operacao',     'Operação',                      false),
  ('/entregas-montagem',           'operacional',         'Entregas & Montagem',                  'operacao',     'Operação',                      false),
  ('/suprimentos',                 'operacional',         'Compras',                              'operacao',     'Operação',                      false),
  ('/estoque',                     'estoque',             'Estoque',                              'operacao',     'Operação',                      false),
  ('/automacoes',                  'operacional',         'Automações',                           'operacao',     'Operação',                      false),
  ('/producao',                    'producao',            'Produção (legado)',                    'operacao',     'Operação',                      false),
  -- Financeiro
  ('/dre',                         'financeiro',          'DRE',                                  'financeiro',   'Financeiro',                    false),
  ('/fluxo-caixa',                 'financeiro',          'Fluxo de Caixa',                       'financeiro',   'Financeiro',                    false),
  ('/contas-pagar',                'financeiro',          'Contas a Pagar',                       'financeiro',   'Financeiro',                    false),
  ('/contas-receber',              'financeiro',          'Contas a Receber',                     'financeiro',   'Financeiro',                    false),
  ('/financeiro/rh-pj',            'financeiro',          'RH / PJ',                              'financeiro',   'Financeiro',                    false),
  ('/financeiro/compromissos-venda','financeiro',         'Compromissos sobre Venda',             'financeiro',   'Financeiro',                    false),
  ('/financeiro',                  'financeiro',          'Tesouraria',                           'financeiro',   'Financeiro',                    false),
  ('/conciliacao',                 'financeiro',          'Conciliação Bancária',                 'financeiro',   'Financeiro',                    false),
  ('/resultado-financeiro',        'financeiro',          'Forecast Financeiro',                  'financeiro',   'Financeiro',                    false),
  ('/planning',                    'planejamento',        'Metas Financeiras',                    'financeiro',   'Financeiro',                    false),
  -- KPI's
  ('/dashboard',                   'dashboard_executivo', 'Dashboard Executivo',                  'kpis',         'KPI''s & BI',                   false),
  ('/dashboards-personalizados',   'relatorios_bi',       'Dashboards Personalizados',            'kpis',         'KPI''s & BI',                   false),
  ('/benchmarking',                'relatorios_bi',       'Benchmarking',                         'kpis',         'KPI''s & BI',                   false),
  ('/owner/visao-consolidada',     'relatorios_bi',       'Visão Consolidada (Owner)',            'kpis',         'KPI''s & BI',                   true),
  -- Pessoas
  ('/rh',                          'configuracoes',       'RH & Colaboradores',                   'pessoas',      'Pessoas',                       false),
  ('/smart-onboarding',            'configuracoes',       'Smart Onboarding',                     'pessoas',      'Pessoas',                       false),
  -- Estratégia
  ('/ai-decision',                 'dashboard_executivo', 'Decision Assistant',                   'estrategia',   'Estratégia',                    false),
  ('/education',                   'configuracoes',       'Educação & Trilhas',                   'estrategia',   'Estratégia',                    false),
  ('/auditoria',                   'controladoria',       'Auditoria',                            'estrategia',   'Estratégia',                    false),
  -- Configurações
  ('/settings/users',              'configuracoes',       'Usuários & Permissões',                'configuracoes','Configurações',                 false),
  ('/governanca',                  'configuracoes',       'Governança de Acesso',                 'configuracoes','Configurações',                 false),
  ('/settings?tab=brand',          'configuracoes',       'Marca & Catálogo',                     'configuracoes','Configurações',                 false),
  ('/cadastros-financeiros?tab=chart',         'cadastros_financeiros', 'Plano de Contas',        'configuracoes','Configurações',                 false),
  ('/cadastros-financeiros?tab=cost-centers',  'cadastros_financeiros', 'Centros de Custo',       'configuracoes','Configurações',                 false),
  ('/cadastros-financeiros?tab=projects',      'cadastros_financeiros', 'Projetos',               'configuracoes','Configurações',                 false),
  ('/cadastros-financeiros?tab=fees',          'cadastros_financeiros', 'Taxas',                  'configuracoes','Configurações',                 false),
  ('/cadastros-financeiros?tab=bank-accounts', 'cadastros_financeiros', 'Contas Bancárias',       'configuracoes','Configurações',                 false),
  ('/cadastros-financeiros?tab=commitments',   'cadastros_financeiros', 'Compromissos sobre Venda (config)', 'configuracoes','Configurações',     false),
  ('/settings',                    'configuracoes',       'Configurações Gerais',                 'configuracoes','Configurações',                 false),
  ('/settings/integracoes',        'configuracoes',       'Integrações',                          'configuracoes','Configurações',                 false),
  ('/settings/logs',               'configuracoes',       'Logs do Sistema',                      'configuracoes','Configurações',                 false),
  -- Owner sections
  ('/owner/control-tower',         'dashboard_executivo', 'Owner Control Tower',                  'owner_operacao','Owner · Operação',             true),
  ('/owner/execution-priority',    'dashboard_executivo', 'Execution Priority',                   'owner_operacao','Owner · Operação',             true),
  ('/owner/billing-ops',           'configuracoes',       'Billing Ops',                          'owner_receita','Owner · Receita & Clientes',    true),
  ('/billing',                     'configuracoes',       'Billing & Subscriptions',              'owner_receita','Owner · Receita & Clientes',    true),
  ('/owner/upgrade-center',        'configuracoes',       'Upgrade Center',                       'owner_receita','Owner · Receita & Clientes',    true),
  ('/customer-lifecycle',          'configuracoes',       'Customer Lifecycle',                   'owner_receita','Owner · Receita & Clientes',    true),
  ('/super-admin',                 'configuracoes',       'Painel Owner',                         'owner_admin',  'Owner · Administração',         true),
  ('/owner/admin',                 'configuracoes',       'Smart Admin',                          'owner_admin',  'Owner · Administração',         true),
  ('/owner/permission-debug',      'configuracoes',       'Permission Debug',                     'owner_admin',  'Owner · Administração',         true)
ON CONFLICT (feature_key) DO UPDATE
  SET module = EXCLUDED.module,
      label = EXCLUDED.label,
      root_key = EXCLUDED.root_key,
      root_label = EXCLUDED.root_label,
      owner_only = EXCLUDED.owner_only,
      updated_at = now();

-- =========================================================
-- Resolver: verificar_acesso_por_perfil (núcleo)
-- =========================================================
CREATE OR REPLACE FUNCTION public.verificar_acesso_por_perfil(
  _profile_type_id uuid,
  _resource_key text,
  _action text
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_module text;
  v_override boolean;
  v_module_val boolean;
  v_col text;
BEGIN
  IF _action NOT IN ('view','create','edit','delete') THEN
    RAISE EXCEPTION 'invalid action: % (use view|create|edit|delete)', _action;
  END IF;
  IF _profile_type_id IS NULL OR _resource_key IS NULL THEN
    RETURN false;
  END IF;
  v_col := 'can_' || _action;

  -- Resolve módulo via catálogo; se ausente, assume key == módulo
  SELECT module INTO v_module FROM public.feature_catalog WHERE feature_key = _resource_key;
  IF v_module IS NULL THEN v_module := _resource_key; END IF;

  -- 1) Override por folha (se valor explícito não-nulo)
  EXECUTE format(
    'SELECT %I FROM public.profile_type_feature_overrides WHERE profile_type_id = $1 AND feature_key = $2 LIMIT 1',
    v_col
  ) INTO v_override USING _profile_type_id, _resource_key;

  IF v_override IS NOT NULL THEN
    RETURN v_override;
  END IF;

  -- 2) Fallback: módulo agregado
  EXECUTE format(
    'SELECT %I FROM public.profile_type_permissions WHERE profile_type_id = $1 AND module = $2 LIMIT 1',
    v_col
  ) INTO v_module_val USING _profile_type_id, v_module;

  RETURN COALESCE(v_module_val, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.verificar_acesso_por_perfil(uuid, text, text) TO anon, authenticated, service_role;

-- =========================================================
-- Resolver público: verificar_acesso_ao_recurso (por user)
-- =========================================================
CREATE OR REPLACE FUNCTION public.verificar_acesso_ao_recurso(
  _user_id uuid,
  _resource_key text,
  _action text
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_type_id uuid;
  v_is_owner boolean;
BEGIN
  IF _user_id IS NULL THEN RETURN false; END IF;

  SELECT profile_type_id, COALESCE(is_owner, false)
    INTO v_profile_type_id, v_is_owner
  FROM public.profiles WHERE id = _user_id;

  IF v_is_owner THEN RETURN true; END IF;
  IF v_profile_type_id IS NULL THEN RETURN false; END IF;

  RETURN public.verificar_acesso_por_perfil(v_profile_type_id, _resource_key, _action);
END;
$$;

GRANT EXECUTE ON FUNCTION public.verificar_acesso_ao_recurso(uuid, text, text) TO anon, authenticated, service_role;