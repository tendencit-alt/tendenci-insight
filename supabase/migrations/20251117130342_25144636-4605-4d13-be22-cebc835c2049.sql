-- Adicionar constraint UNIQUE em seller_goal_id para permitir ON CONFLICT
-- Primeiro, remover duplicatas se existirem
WITH ranked_progress AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY seller_goal_id ORDER BY atualizado_em DESC NULLS LAST, id) as rn
  FROM tendenci_goal_progress
  WHERE seller_goal_id IS NOT NULL
)
DELETE FROM tendenci_goal_progress
WHERE id IN (
  SELECT id FROM ranked_progress WHERE rn > 1
);

-- Adicionar constraint UNIQUE
ALTER TABLE tendenci_goal_progress
ADD CONSTRAINT unique_seller_goal_progress UNIQUE (seller_goal_id);

COMMENT ON CONSTRAINT unique_seller_goal_progress ON tendenci_goal_progress IS 'Garante que cada meta de vendedor tenha apenas um registro de progresso';