-- Adicionar referência aos produtos da IA na tabela de fichas técnicas
ALTER TABLE production_products 
ADD COLUMN IF NOT EXISTS ia_produto_id uuid REFERENCES tendenci_ia_produtos(id);

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_production_products_ia_produto_id 
ON production_products(ia_produto_id);