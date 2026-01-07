-- Adicionar coluna is_template para identificar fichas padrão
ALTER TABLE production_products 
  ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT FALSE;

-- Adicionar coluna template_id para rastrear origem quando copiado de um template
ALTER TABLE production_products 
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES production_products(id);

-- Criar índice para busca rápida de templates
CREATE INDEX IF NOT EXISTS idx_production_products_is_template 
  ON production_products(is_template) WHERE is_template = true;

-- Criar índice para busca por product_id em templates
CREATE INDEX IF NOT EXISTS idx_production_products_template_product 
  ON production_products(product_id, is_template) WHERE is_template = true;