-- Function to check if user is master owner (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_master_owner(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _uid AND is_owner = true
  );
$$;

-- Modules visibility config table
CREATE TABLE IF NOT EXISTS public.modules_config (
  module_key text PRIMARY KEY,
  label text NOT NULL,
  icon text,
  category text NOT NULL DEFAULT 'futuro',
  visible_in_menu boolean NOT NULL DEFAULT false,
  visible_in_routes boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.modules_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "modules_config read all auth" ON public.modules_config;
CREATE POLICY "modules_config read all auth" ON public.modules_config
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "modules_config insert master" ON public.modules_config;
CREATE POLICY "modules_config insert master" ON public.modules_config
  FOR INSERT TO authenticated WITH CHECK (public.is_master_owner(auth.uid()));

DROP POLICY IF EXISTS "modules_config update master" ON public.modules_config;
CREATE POLICY "modules_config update master" ON public.modules_config
  FOR UPDATE TO authenticated USING (public.is_master_owner(auth.uid())) WITH CHECK (public.is_master_owner(auth.uid()));

DROP POLICY IF EXISTS "modules_config delete master" ON public.modules_config;
CREATE POLICY "modules_config delete master" ON public.modules_config
  FOR DELETE TO authenticated USING (public.is_master_owner(auth.uid()));

CREATE TRIGGER update_modules_config_updated_at
BEFORE UPDATE ON public.modules_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed: 8 visible modules + ~43 hidden
INSERT INTO public.modules_config (module_key, label, icon, category, visible_in_menu, sort_order) VALUES
  ('clientes',                'Clientes',              'Users',         'comercial',     true,  10),
  ('catalogo-produtos',       'Catálogo de Produtos',  'Package',       'comercial',     true,  20),
  ('pedidos',                 'Pedidos',               'ShoppingCart',  'comercial',     true,  30),
  ('estoque',                 'Estoque',               'Boxes',         'operacional',   true,  10),
  ('financeiro',              'Financeiro',            'DollarSign',    'financeiro',    true,  10),
  ('dashboard',               'Dashboard',             'BarChart3',     'relatorios',    true,  10),
  ('configuracoes-usuarios',  'Usuários & Permissões', 'Shield',        'configuracoes', true,  10),
  ('configuracoes-marca',     'Marca & Catálogo',      'Palette',       'configuracoes', true,  20),
  -- hidden (futuro)
  ('leads',                   'Leads',                       'Sparkles',     'futuro', false, 100),
  ('crm-comercial',           'CRM Comercial',               'Briefcase',    'futuro', false, 100),
  ('prospeccao',              'Prospecção',                  'Search',       'futuro', false, 100),
  ('metas',                   'Metas',                       'Target',       'futuro', false, 100),
  ('customer-lifecycle',      'Customer Lifecycle',          'GitBranch',    'futuro', false, 100),
  ('customer-success',        'Customer Success',            'Heart',        'futuro', false, 100),
  ('orcamentos',              'Orçamentos',                  'FileText',     'futuro', false, 100),
  ('contratos',               'Contratos',                   'FileCheck',    'futuro', false, 100),
  ('comissoes',               'Comissões',                   'Percent',      'futuro', false, 100),
  ('producao',                'Produção',                    'Factory',      'futuro', false, 100),
  ('producao-operacoes',      'Produção / Operações',        'Settings2',    'futuro', false, 100),
  ('projetos',                'Projetos',                    'Folder',       'futuro', false, 100),
  ('tarefas',                 'Tarefas',                     'CheckSquare',  'futuro', false, 100),
  ('atividades',              'Atividades',                  'Activity',     'futuro', false, 100),
  ('fornecedores',            'Fornecedores',                'Truck',        'futuro', false, 100),
  ('suprimentos',             'Suprimentos',                 'PackagePlus',  'futuro', false, 100),
  ('cobranca',                'Cobrança',                    'Receipt',      'futuro', false, 100),
  ('billing',                 'Billing',                     'CreditCard',   'futuro', false, 100),
  ('cadastros-financeiros',   'Cadastros Financeiros',       'Database',     'futuro', false, 100),
  ('automacoes',              'Automações',                  'Zap',          'futuro', false, 100),
  ('automacoes-inteligentes', 'Automações Inteligentes',     'Bot',          'futuro', false, 100),
  ('automation-center',       'Automation Center',           'Cpu',          'futuro', false, 100),
  ('ai-decision',             'AI Decision',                 'Brain',        'futuro', false, 100),
  ('executive',               'Executive',                   'Crown',        'futuro', false, 100),
  ('control-tower',           'Control Tower',               'Radar',        'futuro', false, 100),
  ('planning',                'Planning',                    'CalendarRange','futuro', false, 100),
  ('data-flow',               'Data Flow',                   'Network',      'futuro', false, 100),
  ('rh',                      'RH',                          'UserCog',      'futuro', false, 100),
  ('education',               'Education',                   'GraduationCap','futuro', false, 100),
  ('documentos',              'Documentos',                  'FolderOpen',   'futuro', false, 100),
  ('aprovacoes',              'Aprovações',                  'CheckCircle',  'futuro', false, 100),
  ('onboarding',              'Onboarding',                  'PlayCircle',   'futuro', false, 100),
  ('smart-onboarding',        'Smart Onboarding',            'Wand2',        'futuro', false, 100),
  ('governanca',              'Governança',                  'Scale',        'futuro', false, 100),
  ('auditoria',               'Auditoria',                   'ClipboardList','futuro', false, 100),
  ('auditoria-permissoes',    'Auditoria Permissões',        'Lock',         'futuro', false, 100),
  ('benchmarking',            'Benchmarking',                'TrendingUp',   'futuro', false, 100),
  ('multi-company',           'Multi-Company',               'Building2',    'futuro', false, 100),
  ('integracao',              'Integração',                  'Plug',         'futuro', false, 100),
  ('integracao-inteligente',  'Integração Inteligente',      'Plug2',        'futuro', false, 100),
  ('support-knowledge',       'Support Knowledge',           'BookOpen',     'futuro', false, 100),
  ('bi-dashboard',            'BI Dashboard',                'PieChart',     'futuro', false, 100),
  ('paineis',                 'Painéis',                     'LayoutDashboard','futuro', false, 100),
  ('relatorios',              'Relatórios',                  'FileBarChart', 'futuro', false, 100)
ON CONFLICT (module_key) DO NOTHING;