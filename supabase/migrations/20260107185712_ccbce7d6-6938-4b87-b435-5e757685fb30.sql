-- Tabela de tags de centro de custo
CREATE TABLE public.cost_center_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT 'bg-blue-100 text-blue-800',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de relacionamento muitos-para-muitos (produto pode ter múltiplas tags)
CREATE TABLE public.product_cost_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  cost_center_id UUID NOT NULL REFERENCES cost_center_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product_id, cost_center_id)
);

-- Habilitar RLS
ALTER TABLE cost_center_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_cost_centers ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso para usuários autenticados
CREATE POLICY "cost_center_tags_select" ON cost_center_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "cost_center_tags_insert" ON cost_center_tags FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "cost_center_tags_update" ON cost_center_tags FOR UPDATE TO authenticated USING (true);
CREATE POLICY "cost_center_tags_delete" ON cost_center_tags FOR DELETE TO authenticated USING (true);

CREATE POLICY "product_cost_centers_select" ON product_cost_centers FOR SELECT TO authenticated USING (true);
CREATE POLICY "product_cost_centers_insert" ON product_cost_centers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "product_cost_centers_delete" ON product_cost_centers FOR DELETE TO authenticated USING (true);

-- Inserir tags padrão (baseado no sistema atual)
INSERT INTO cost_center_tags (name, color) VALUES 
  ('Móveis Planejados', 'bg-purple-100 text-purple-800'),
  ('Produção Tendenci', 'bg-blue-100 text-blue-800'),
  ('Marcenaria', 'bg-amber-100 text-amber-800'),
  ('Estofados', 'bg-green-100 text-green-800'),
  ('Decoração', 'bg-pink-100 text-pink-800'),
  ('Iluminação', 'bg-yellow-100 text-yellow-800'),
  ('Paisagismo', 'bg-emerald-100 text-emerald-800');