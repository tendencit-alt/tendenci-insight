-- Add centro_custo column to tendenci_ia_produtos
ALTER TABLE tendenci_ia_produtos 
ADD COLUMN IF NOT EXISTS centro_custo text;