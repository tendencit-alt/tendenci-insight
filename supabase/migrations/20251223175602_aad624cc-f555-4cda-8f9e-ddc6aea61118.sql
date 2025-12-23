-- Adicionar coluna centro_custo na tabela order_items
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS centro_custo text;

-- Criar comentário para documentar os valores possíveis
COMMENT ON COLUMN public.order_items.centro_custo IS 'Centro de custo do item: moveis_planejados, producao_tendenci, revenda';

-- Adicionar status "ativo" na documentação (já suportado como texto livre no campo status)