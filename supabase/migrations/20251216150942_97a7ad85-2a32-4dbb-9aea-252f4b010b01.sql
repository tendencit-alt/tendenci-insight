-- Adicionar centro_custo na tabela orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS centro_custo text;

-- Atualizar os 3 tipos de produção principais para os nomes corretos
-- 1. MÓVEIS PLANEJADOS
UPDATE production_types SET 
  name = 'Móveis Planejados',
  description = 'Móveis sob medida com projeto personalizado',
  color = 'blue-500',
  position = 1,
  active = true
WHERE id = '1ba14263-902c-45aa-a26a-205a4eefe0e1';

-- 2. PRODUÇÃO TENDENCI (renomear o tipo existente de produção)
UPDATE production_types SET 
  name = 'Produção Tendenci',
  slug = 'producao-tendenci',
  description = 'Móveis Soltos, Náuticos, Industrial, Rústico',
  color = 'amber-500',
  position = 2,
  active = true
WHERE id = '0a6645f5-54c6-4715-a44b-9d8189577f11';

-- 3. REVENDA
UPDATE production_types SET 
  name = 'Revenda',
  slug = 'revenda',
  description = 'Produtos de revenda',
  color = 'green-500',
  position = 3,
  active = true
WHERE id = '381f6968-da71-430e-a5f4-5c9faa961b4c';

-- Desativar tipos antigos duplicados/subtipos
UPDATE production_types SET active = false 
WHERE id NOT IN (
  '1ba14263-902c-45aa-a26a-205a4eefe0e1', -- Móveis Planejados
  '0a6645f5-54c6-4715-a44b-9d8189577f11', -- Produção Tendenci
  '381f6968-da71-430e-a5f4-5c9faa961b4c'  -- Revenda
);

-- Reatribuir ordens de produção dos tipos desativados para Produção Tendenci
UPDATE production_orders 
SET production_type_id = '0a6645f5-54c6-4715-a44b-9d8189577f11'
WHERE production_type_id IN (
  SELECT id FROM production_types 
  WHERE active = false 
  AND slug LIKE '%producao%'
);