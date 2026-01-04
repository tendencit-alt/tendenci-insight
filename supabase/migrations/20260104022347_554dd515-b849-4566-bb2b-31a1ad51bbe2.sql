-- Add dimension columns to tendenci_ia_produtos
ALTER TABLE tendenci_ia_produtos 
ADD COLUMN largura numeric,
ADD COLUMN comprimento numeric,
ADD COLUMN altura numeric,
ADD COLUMN unidade_medida text DEFAULT 'cm';