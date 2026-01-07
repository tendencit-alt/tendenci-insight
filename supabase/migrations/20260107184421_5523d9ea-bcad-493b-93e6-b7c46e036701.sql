-- 1. Remover fichas técnicas duplicadas (manter apenas a mais antiga para cada product_id)
DELETE FROM production_products 
WHERE id NOT IN (
  SELECT DISTINCT ON (product_id) id 
  FROM production_products 
  WHERE is_template = true AND product_id IS NOT NULL
  ORDER BY product_id, created_at ASC
)
AND is_template = true 
AND product_id IS NOT NULL;

-- 2. Criar índice único para evitar futuras duplicações
CREATE UNIQUE INDEX idx_unique_product_template 
ON production_products (product_id) 
WHERE is_template = true AND product_id IS NOT NULL;