-- Adicionar campo cor na tabela production_product_bom
ALTER TABLE production_product_bom 
ADD COLUMN IF NOT EXISTS cor TEXT;