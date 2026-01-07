-- Tornar production_order_id opcional para permitir fichas técnicas de itens do estoque
ALTER TABLE production_products 
ALTER COLUMN production_order_id DROP NOT NULL;

-- Adicionar referência ao item do estoque
ALTER TABLE production_products 
ADD COLUMN product_id uuid REFERENCES products(id);

-- Criar índice para performance
CREATE INDEX idx_production_products_product_id 
ON production_products(product_id);