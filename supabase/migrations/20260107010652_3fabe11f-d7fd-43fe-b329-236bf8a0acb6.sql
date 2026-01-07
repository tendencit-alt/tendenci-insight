-- Criar tabela para tipos de mão de obra
CREATE TABLE labor_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  default_cost numeric DEFAULT 0,
  unit text DEFAULT 'h',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Inserir alguns tipos iniciais
INSERT INTO labor_types (name, unit) VALUES 
  ('Montagem', 'h'),
  ('Pintura', 'h'),
  ('Acabamento', 'h'),
  ('Instalação', 'h');

-- Adicionar coluna para identificar tipo na BOM (material ou mao_obra)
ALTER TABLE production_product_bom 
ADD COLUMN tipo text DEFAULT 'material' CHECK (tipo IN ('material', 'mao_obra'));

-- Habilitar RLS
ALTER TABLE labor_types ENABLE ROW LEVEL SECURITY;

-- Políticas para labor_types (todos podem ler, apenas autenticados podem criar/atualizar)
CREATE POLICY "Anyone can view labor types" ON labor_types FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert labor types" ON labor_types FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update labor types" ON labor_types FOR UPDATE USING (auth.uid() IS NOT NULL);