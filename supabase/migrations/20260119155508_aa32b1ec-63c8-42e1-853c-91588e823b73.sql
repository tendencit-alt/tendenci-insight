-- Remover trigger e função que referenciam tabela inexistente 'seller_goals'
-- A tabela correta no sistema é 'tendenci_seller_goals'

-- Primeiro, remover a trigger que está causando o erro
DROP TRIGGER IF EXISTS trigger_update_seller_goal_progress ON crm_deals;

-- Remover a função problemática que referencia 'seller_goals'
DROP FUNCTION IF EXISTS update_seller_goal_progress();

-- Remover a função RPC que também referencia a tabela errada
DROP FUNCTION IF EXISTS get_seller_goal_stats(uuid, integer, integer);