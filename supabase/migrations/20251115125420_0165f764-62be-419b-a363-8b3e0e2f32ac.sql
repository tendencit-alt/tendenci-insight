-- Corrigir função para adicionar search_path
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
$$ LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path TO 'public';