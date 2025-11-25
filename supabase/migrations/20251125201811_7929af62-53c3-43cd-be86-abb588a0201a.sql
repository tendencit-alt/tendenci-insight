-- Criar tabela para itens de menu personalizáveis
CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  icon TEXT NOT NULL,
  route TEXT NOT NULL,
  module TEXT NOT NULL,
  position INTEGER NOT NULL,
  visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- Policy: todos podem ler
CREATE POLICY "Todos podem ler menu items"
  ON public.menu_items
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: apenas MASTER pode editar
CREATE POLICY "Apenas MASTER pode atualizar menu items"
  ON public.menu_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Inserir itens de menu padrão
INSERT INTO public.menu_items (label, icon, route, module, position, visible) VALUES
  ('Dashboard', 'LayoutDashboard', '/', 'dashboard', 1, true),
  ('Leads', 'TrendingUp', '/leads', 'leads', 2, true),
  ('Projetos', 'Package', '/projects', 'projetos', 3, true),
  ('Prospecção', 'Users', '/prospeccao', 'prospeccao', 4, true),
  ('CRM', 'Briefcase', '/crm', 'crm', 5, true),
  ('Metas', 'Target', '/metas', 'metas', 6, true),
  ('Dashboards', 'BarChart3', '/dashboards', 'dashboards_personalizados', 7, true),
  ('Configurações', 'Settings', '/configuracoes', 'gestao_usuarios', 8, true);