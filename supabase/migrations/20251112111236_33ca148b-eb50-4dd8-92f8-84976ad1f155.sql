-- Adicionar novos campos para cadastro de negócio
ALTER TABLE crm_deals 
ADD COLUMN IF NOT EXISTS categoria TEXT,
ADD COLUMN IF NOT EXISTS centro_custo TEXT,
ADD COLUMN IF NOT EXISTS tipo_produto TEXT;

-- Comentários explicativos
COMMENT ON COLUMN crm_deals.categoria IS 'Categoria do negócio: Planejados ou Móveis Soltos';
COMMENT ON COLUMN crm_deals.centro_custo IS 'Centro de custo: Rústico, Industrial, Revenda, Planejado, Náutico';
COMMENT ON COLUMN crm_deals.tipo_produto IS 'Tipo específico de produto: Sofá, Poltrona, Mesa, Cadeira, etc.';