
-- =============================================
-- SISTEMA DE ORÇAMENTO TÉCNICO PARA MARCENARIA
-- =============================================

-- 1. Tabela de Custos Globais (Variáveis Editáveis)
CREATE TABLE public.budget_global_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('material', 'maquina', 'mao_obra', 'ferragem')),
  value DECIMAL(12,4) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Tabela de Orçamentos de Projetos
CREATE TABLE public.project_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  status TEXT DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'finalizado', 'aprovado', 'arquivado')),
  notes TEXT,
  markup_percent DECIMAL(5,2) DEFAULT 30.00,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  total_cost DECIMAL(12,2) DEFAULT 0,
  total_price DECIMAL(12,2) DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Tabela de Produtos do Orçamento
CREATE TABLE public.budget_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID REFERENCES public.project_budgets(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  ambiente TEXT,
  quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
  unit_cost DECIMAL(12,2) DEFAULT 0,
  unit_price DECIMAL(12,2) DEFAULT 0,
  total_cost DECIMAL(12,2) DEFAULT 0,
  total_price DECIMAL(12,2) DEFAULT 0,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Tabela de Linhas de Custo por Produto
CREATE TABLE public.budget_product_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.budget_products(id) ON DELETE CASCADE NOT NULL,
  line_name TEXT NOT NULL,
  line_type TEXT NOT NULL CHECK (line_type IN ('material', 'maquina', 'mao_obra', 'ferragem')),
  quantity DECIMAL(10,4) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  cost_ref_id UUID REFERENCES public.budget_global_costs(id),
  cost_ref_code TEXT,
  unit_cost DECIMAL(12,4) NOT NULL DEFAULT 0,
  subtotal DECIMAL(12,2) GENERATED ALWAYS AS (ROUND(quantity * unit_cost, 2)) STORED,
  notes TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Tabela de Templates de Produtos (reutilizáveis)
CREATE TABLE public.budget_product_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  categoria TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. Linhas de Template
CREATE TABLE public.budget_template_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.budget_product_templates(id) ON DELETE CASCADE NOT NULL,
  line_name TEXT NOT NULL,
  line_type TEXT NOT NULL CHECK (line_type IN ('material', 'maquina', 'mao_obra', 'ferragem')),
  default_quantity DECIMAL(10,4) DEFAULT 0,
  unit TEXT NOT NULL,
  cost_ref_id UUID REFERENCES public.budget_global_costs(id),
  cost_ref_code TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_project_budgets_project ON public.project_budgets(project_id);
CREATE INDEX idx_project_budgets_status ON public.project_budgets(status);
CREATE INDEX idx_budget_products_budget ON public.budget_products(budget_id);
CREATE INDEX idx_budget_product_lines_product ON public.budget_product_lines(product_id);
CREATE INDEX idx_budget_product_lines_cost_ref ON public.budget_product_lines(cost_ref_id);
CREATE INDEX idx_budget_global_costs_code ON public.budget_global_costs(code);
CREATE INDEX idx_budget_global_costs_category ON public.budget_global_costs(category);

-- =============================================
-- TRIGGERS DE UPDATED_AT
-- =============================================
CREATE OR REPLACE FUNCTION public.update_budget_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_budget_global_costs_updated_at
  BEFORE UPDATE ON public.budget_global_costs
  FOR EACH ROW EXECUTE FUNCTION public.update_budget_updated_at();

CREATE TRIGGER trigger_project_budgets_updated_at
  BEFORE UPDATE ON public.project_budgets
  FOR EACH ROW EXECUTE FUNCTION public.update_budget_updated_at();

CREATE TRIGGER trigger_budget_products_updated_at
  BEFORE UPDATE ON public.budget_products
  FOR EACH ROW EXECUTE FUNCTION public.update_budget_updated_at();

CREATE TRIGGER trigger_budget_product_templates_updated_at
  BEFORE UPDATE ON public.budget_product_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_budget_updated_at();

-- =============================================
-- FUNÇÃO: RECALCULAR LINHAS QUANDO CUSTO GLOBAL MUDA
-- =============================================
CREATE OR REPLACE FUNCTION public.recalculate_budget_on_cost_change()
RETURNS TRIGGER AS $$
DECLARE
  v_product_id UUID;
  v_budget_id UUID;
BEGIN
  -- 1. Atualizar unit_cost de todas as linhas que referenciam este custo
  UPDATE public.budget_product_lines
  SET unit_cost = NEW.value
  WHERE cost_ref_id = NEW.id;

  -- 2. Recalcular unit_cost e total_cost de cada produto afetado
  FOR v_product_id IN 
    SELECT DISTINCT product_id 
    FROM public.budget_product_lines 
    WHERE cost_ref_id = NEW.id
  LOOP
    UPDATE public.budget_products bp
    SET 
      unit_cost = (
        SELECT COALESCE(SUM(bpl.subtotal), 0)
        FROM public.budget_product_lines bpl
        WHERE bpl.product_id = bp.id
      ),
      total_cost = bp.quantity * (
        SELECT COALESCE(SUM(bpl.subtotal), 0)
        FROM public.budget_product_lines bpl
        WHERE bpl.product_id = bp.id
      ),
      updated_at = now()
    WHERE bp.id = v_product_id;
  END LOOP;

  -- 3. Recalcular totais dos orçamentos afetados
  FOR v_budget_id IN
    SELECT DISTINCT bp.budget_id
    FROM public.budget_products bp
    JOIN public.budget_product_lines bpl ON bpl.product_id = bp.id
    WHERE bpl.cost_ref_id = NEW.id
  LOOP
    UPDATE public.project_budgets pb
    SET 
      total_cost = (
        SELECT COALESCE(SUM(bp.total_cost), 0)
        FROM public.budget_products bp
        WHERE bp.budget_id = pb.id
      ),
      total_price = (
        SELECT COALESCE(SUM(bp.total_cost), 0)
        FROM public.budget_products bp
        WHERE bp.budget_id = pb.id
      ) * (1 + pb.markup_percent/100) * (1 - pb.discount_percent/100),
      updated_at = now()
    WHERE pb.id = v_budget_id;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_recalculate_on_cost_change
  AFTER UPDATE OF value ON public.budget_global_costs
  FOR EACH ROW
  WHEN (OLD.value IS DISTINCT FROM NEW.value)
  EXECUTE FUNCTION public.recalculate_budget_on_cost_change();

-- =============================================
-- FUNÇÃO: RECALCULAR PRODUTO QUANDO LINHA MUDA
-- =============================================
CREATE OR REPLACE FUNCTION public.recalculate_product_on_line_change()
RETURNS TRIGGER AS $$
DECLARE
  v_product_id UUID;
  v_budget_id UUID;
BEGIN
  v_product_id := COALESCE(NEW.product_id, OLD.product_id);

  -- Recalcular produto
  UPDATE public.budget_products bp
  SET 
    unit_cost = (
      SELECT COALESCE(SUM(bpl.subtotal), 0)
      FROM public.budget_product_lines bpl
      WHERE bpl.product_id = bp.id
    ),
    updated_at = now()
  WHERE bp.id = v_product_id;

  -- Atualizar total_cost baseado em quantity
  UPDATE public.budget_products
  SET total_cost = quantity * unit_cost
  WHERE id = v_product_id;

  -- Buscar budget_id e recalcular orçamento
  SELECT budget_id INTO v_budget_id FROM public.budget_products WHERE id = v_product_id;

  IF v_budget_id IS NOT NULL THEN
    UPDATE public.project_budgets pb
    SET 
      total_cost = (
        SELECT COALESCE(SUM(bp.total_cost), 0)
        FROM public.budget_products bp
        WHERE bp.budget_id = pb.id
      ),
      total_price = (
        SELECT COALESCE(SUM(bp.total_cost), 0)
        FROM public.budget_products bp
        WHERE bp.budget_id = pb.id
      ) * (1 + pb.markup_percent/100) * (1 - pb.discount_percent/100),
      updated_at = now()
    WHERE pb.id = v_budget_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_recalculate_product_on_line_insert
  AFTER INSERT ON public.budget_product_lines
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_product_on_line_change();

CREATE TRIGGER trigger_recalculate_product_on_line_update
  AFTER UPDATE ON public.budget_product_lines
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_product_on_line_change();

CREATE TRIGGER trigger_recalculate_product_on_line_delete
  AFTER DELETE ON public.budget_product_lines
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_product_on_line_change();

-- =============================================
-- FUNÇÃO: RECALCULAR ORÇAMENTO QUANDO PRODUTO MUDA
-- =============================================
CREATE OR REPLACE FUNCTION public.recalculate_budget_on_product_change()
RETURNS TRIGGER AS $$
DECLARE
  v_budget_id UUID;
BEGIN
  v_budget_id := COALESCE(NEW.budget_id, OLD.budget_id);

  UPDATE public.project_budgets pb
  SET 
    total_cost = (
      SELECT COALESCE(SUM(bp.total_cost), 0)
      FROM public.budget_products bp
      WHERE bp.budget_id = pb.id
    ),
    total_price = (
      SELECT COALESCE(SUM(bp.total_cost), 0)
      FROM public.budget_products bp
      WHERE bp.budget_id = pb.id
    ) * (1 + pb.markup_percent/100) * (1 - pb.discount_percent/100),
    updated_at = now()
  WHERE pb.id = v_budget_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_recalculate_budget_on_product_insert
  AFTER INSERT ON public.budget_products
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_budget_on_product_change();

CREATE TRIGGER trigger_recalculate_budget_on_product_update
  AFTER UPDATE OF quantity, total_cost ON public.budget_products
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_budget_on_product_change();

CREATE TRIGGER trigger_recalculate_budget_on_product_delete
  AFTER DELETE ON public.budget_products
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_budget_on_product_change();

-- =============================================
-- RLS POLICIES
-- =============================================
ALTER TABLE public.budget_global_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_product_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_product_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_template_lines ENABLE ROW LEVEL SECURITY;

-- Políticas para budget_global_costs
CREATE POLICY "Autenticados podem ler custos globais"
  ON public.budget_global_costs FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins podem gerenciar custos globais"
  ON public.budget_global_costs FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Políticas para project_budgets
CREATE POLICY "Autenticados podem ler orçamentos"
  ON public.project_budgets FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem criar orçamentos"
  ON public.project_budgets FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem atualizar orçamentos"
  ON public.project_budgets FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins podem deletar orçamentos"
  ON public.project_budgets FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Políticas para budget_products
CREATE POLICY "Autenticados podem ler produtos"
  ON public.budget_products FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem criar produtos"
  ON public.budget_products FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem atualizar produtos"
  ON public.budget_products FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem deletar produtos"
  ON public.budget_products FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Políticas para budget_product_lines
CREATE POLICY "Autenticados podem ler linhas"
  ON public.budget_product_lines FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem criar linhas"
  ON public.budget_product_lines FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem atualizar linhas"
  ON public.budget_product_lines FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem deletar linhas"
  ON public.budget_product_lines FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Políticas para templates
CREATE POLICY "Autenticados podem ler templates"
  ON public.budget_product_templates FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem criar templates"
  ON public.budget_product_templates FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem atualizar templates"
  ON public.budget_product_templates FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins podem deletar templates"
  ON public.budget_product_templates FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Autenticados podem ler linhas de template"
  ON public.budget_template_lines FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem criar linhas de template"
  ON public.budget_template_lines FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem atualizar linhas de template"
  ON public.budget_template_lines FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem deletar linhas de template"
  ON public.budget_template_lines FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- =============================================
-- DADOS INICIAIS: VARIÁVEIS GLOBAIS DE CUSTO
-- =============================================
INSERT INTO public.budget_global_costs (name, code, category, value, unit, description) VALUES
-- Materiais
('MDF 15mm Padrão', 'mdf_15mm_padrao', 'material', 85.00, 'm²', 'MDF branco ou cru 15mm'),
('MDF 15mm Premium/Colorido', 'mdf_15mm_premium', 'material', 120.00, 'm²', 'MDF com acabamento premium ou colorido'),
('MDF 18mm Padrão', 'mdf_18mm_padrao', 'material', 95.00, 'm²', 'MDF branco ou cru 18mm'),
('MDF 18mm Premium/Colorido', 'mdf_18mm_premium', 'material', 135.00, 'm²', 'MDF com acabamento premium ou colorido 18mm'),
('MDF 6mm Fundo', 'mdf_6mm_fundo', 'material', 45.00, 'm²', 'MDF para fundos de armários'),
('MDF 3mm Fundo', 'mdf_3mm_fundo', 'material', 28.00, 'm²', 'MDF fino para fundos leves'),
('Fita de Borda 22mm', 'fita_borda_22mm', 'material', 2.50, 'metro linear', 'Fita de borda padrão 22mm'),
('Fita de Borda 45mm', 'fita_borda_45mm', 'material', 4.00, 'metro linear', 'Fita de borda larga 45mm'),
('Cola PVA', 'cola_pva', 'material', 0.15, 'ml', 'Cola branca para colagem'),
('Cola Hot Melt', 'cola_hot_melt', 'material', 0.08, 'grama', 'Cola para coladeira de borda'),

-- Máquinas
('Custo Máquina Corte', 'maquina_corte_custo', 'maquina', 0.80, 'minuto', 'Custo operacional da seccionadora'),
('Velocidade Máquina Corte', 'maquina_corte_velocidade', 'maquina', 15.00, 'metros/minuto', 'Velocidade média de corte'),
('Custo Coladeira de Borda', 'coladeira_custo', 'maquina', 1.20, 'metro linear', 'Custo operacional da coladeira'),
('Velocidade Coladeira', 'coladeira_velocidade', 'maquina', 8.00, 'metros/minuto', 'Velocidade média de fitagem'),
('Custo CNC', 'cnc_custo', 'maquina', 2.50, 'minuto', 'Custo operacional do CNC'),
('Custo Furadeira', 'furadeira_custo', 'maquina', 0.50, 'furo', 'Custo por furo'),

-- Mão de Obra
('Montagem Básica', 'mao_obra_montagem', 'mao_obra', 150.00, 'hora', 'Custo hora de montador'),
('Instalação', 'mao_obra_instalacao', 'mao_obra', 180.00, 'hora', 'Custo hora de instalador'),
('Acabamento/Lixamento', 'mao_obra_acabamento', 'mao_obra', 80.00, 'hora', 'Custo hora para acabamento'),

-- Ferragens
('Dobradiça 35mm', 'dobradica_35mm', 'ferragem', 8.50, 'unidade', 'Dobradiça caneco 35mm'),
('Dobradiça Slow Motion', 'dobradica_slow', 'ferragem', 18.00, 'unidade', 'Dobradiça com amortecedor'),
('Pistão a Gás 60N', 'pistao_60n', 'ferragem', 45.00, 'unidade', 'Pistão para portas basculantes'),
('Pistão a Gás 80N', 'pistao_80n', 'ferragem', 52.00, 'unidade', 'Pistão para portas basculantes pesadas'),
('Corrediça Telescópica 300mm', 'corredica_300', 'ferragem', 28.00, 'par', 'Corrediça para gavetas pequenas'),
('Corrediça Telescópica 450mm', 'corredica_450', 'ferragem', 35.00, 'par', 'Corrediça para gavetas médias'),
('Corrediça Telescópica 550mm', 'corredica_550', 'ferragem', 42.00, 'par', 'Corrediça para gavetas grandes'),
('Corrediça Soft Close 450mm', 'corredica_soft_450', 'ferragem', 65.00, 'par', 'Corrediça com amortecedor'),
('Puxador Alça 128mm', 'puxador_alca_128', 'ferragem', 12.00, 'unidade', 'Puxador tipo alça'),
('Puxador Alça 256mm', 'puxador_alca_256', 'ferragem', 18.00, 'unidade', 'Puxador tipo alça grande'),
('Puxador Perfil', 'puxador_perfil', 'ferragem', 45.00, 'metro', 'Puxador tipo perfil de alumínio'),
('Sapata Niveladora', 'sapata_niveladora', 'ferragem', 3.50, 'unidade', 'Pé nivelador para móveis'),
('Parafuso Confirmat', 'parafuso_confirmat', 'ferragem', 0.15, 'unidade', 'Parafuso para montagem'),
('Minifix', 'minifix', 'ferragem', 2.80, 'conjunto', 'Sistema de fixação oculta'),
('Suporte Prateleira', 'suporte_prateleira', 'ferragem', 1.20, 'unidade', 'Suporte para prateleiras');
