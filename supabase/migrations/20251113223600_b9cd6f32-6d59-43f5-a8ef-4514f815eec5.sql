-- Adicionar campos para diferenciar tipos de metas

-- Adicionar tipo de meta às metas individuais
ALTER TABLE tendenci_seller_goals 
ADD COLUMN IF NOT EXISTS tipo_meta TEXT DEFAULT 'vendas' CHECK (tipo_meta IN ('vendas', 'captacao', 'efetivacao'));

-- Adicionar campo de quantidade alvo (usado para metas de captação e efetivação)
ALTER TABLE tendenci_seller_goals 
ADD COLUMN IF NOT EXISTS quantidade_meta INTEGER;

-- Adicionar tipo de meta às metas da empresa
ALTER TABLE tendenci_company_goals 
ADD COLUMN IF NOT EXISTS tipo_meta TEXT DEFAULT 'vendas' CHECK (tipo_meta IN ('vendas', 'captacao', 'efetivacao'));

-- Adicionar campo de quantidade alvo para metas da empresa
ALTER TABLE tendenci_company_goals 
ADD COLUMN IF NOT EXISTS quantidade_meta INTEGER;

-- Adicionar campo de quantidade alcançada no progresso
ALTER TABLE tendenci_goal_progress 
ADD COLUMN IF NOT EXISTS quantidade_alcancada INTEGER DEFAULT 0;

-- Comentários explicativos
COMMENT ON COLUMN tendenci_seller_goals.tipo_meta IS 'Tipo de meta: vendas (valor em R$), captacao (quantidade de leads), efetivacao (quantidade de arquitetos)';
COMMENT ON COLUMN tendenci_seller_goals.quantidade_meta IS 'Meta de quantidade para captação ou efetivação';
COMMENT ON COLUMN tendenci_company_goals.tipo_meta IS 'Tipo de meta consolidada: vendas (valor em R$), captacao (quantidade de leads), efetivacao (quantidade de arquitetos)';
COMMENT ON COLUMN tendenci_company_goals.quantidade_meta IS 'Meta de quantidade para captação ou efetivação';
COMMENT ON COLUMN tendenci_goal_progress.quantidade_alcancada IS 'Quantidade alcançada para metas de captação ou efetivação';