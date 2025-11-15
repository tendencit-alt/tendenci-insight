-- Remove o trigger antigo que incrementava na criação
DROP TRIGGER IF EXISTS trg_update_daily_goal_on_architect_creation ON architects;
DROP FUNCTION IF EXISTS update_daily_architect_goal_on_creation();

-- Cria função para incrementar quando status muda para contato_efetivado
CREATE OR REPLACE FUNCTION update_daily_architect_goal_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Verifica se o status mudou para contato_efetivado
  IF NEW.status_funil = 'contato_efetivado' AND (OLD.status_funil IS NULL OR OLD.status_funil != 'contato_efetivado') THEN
    -- Incrementa o contador de captações para o vendedor responsável na data de hoje
    UPDATE tendenci_daily_architect_goals
    SET captacoes_realizadas = captacoes_realizadas + 1,
        updated_at = now()
    WHERE vendedor_id = NEW.vendedor_responsavel
      AND data = CURRENT_DATE;
    
    -- Se não existe registro para hoje, cria um
    IF NOT FOUND THEN
      INSERT INTO tendenci_daily_architect_goals (vendedor_id, data, meta_captacoes, captacoes_realizadas)
      VALUES (NEW.vendedor_responsavel, CURRENT_DATE, 30, 1);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cria trigger para UPDATE na tabela architects
CREATE TRIGGER trg_update_daily_goal_on_status_change
AFTER UPDATE OF status_funil ON architects
FOR EACH ROW
EXECUTE FUNCTION update_daily_architect_goal_on_status_change();