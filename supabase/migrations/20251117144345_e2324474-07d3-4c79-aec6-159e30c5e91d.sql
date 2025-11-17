-- Corrigir função de atualização de meta diária para incluir validação e logs
CREATE OR REPLACE FUNCTION update_daily_architect_goal_on_status_change()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verifica se o status mudou para contato_efetivado
  IF NEW.status_funil = 'contato_efetivado' AND (OLD.status_funil IS NULL OR OLD.status_funil != 'contato_efetivado') THEN
    
    -- Log para debug
    RAISE NOTICE 'Arquiteto % movido para contato_efetivado. Vendedor: %', NEW.name, NEW.vendedor_responsavel;
    
    -- Validar se tem vendedor responsável
    IF NEW.vendedor_responsavel IS NULL THEN
      RAISE WARNING 'Arquiteto % não tem vendedor_responsavel atribuído. Meta diária não será atualizada.', NEW.name;
      RETURN NEW;
    END IF;
    
    -- Incrementa o contador de captações para o vendedor responsável na data de hoje
    UPDATE tendenci_daily_architect_goals
    SET captacoes_realizadas = captacoes_realizadas + 1,
        updated_at = now()
    WHERE vendedor_id = NEW.vendedor_responsavel
      AND data = CURRENT_DATE;
    
    -- Se não existe registro para hoje, cria um
    IF NOT FOUND THEN
      RAISE NOTICE 'Criando nova meta diária para vendedor % na data %', NEW.vendedor_responsavel, CURRENT_DATE;
      INSERT INTO tendenci_daily_architect_goals (vendedor_id, data, meta_captacoes, captacoes_realizadas)
      VALUES (NEW.vendedor_responsavel, CURRENT_DATE, 30, 1)
      ON CONFLICT (vendedor_id, data) 
      DO UPDATE SET 
        captacoes_realizadas = tendenci_daily_architect_goals.captacoes_realizadas + 1,
        updated_at = now();
    ELSE
      RAISE NOTICE 'Meta diária atualizada para vendedor %', NEW.vendedor_responsavel;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Corrigir função de INSERT também para incluir validação
CREATE OR REPLACE FUNCTION update_daily_capture_goal()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_today date;
BEGIN
  v_today := CURRENT_DATE;

  -- Log para debug
  RAISE NOTICE 'Novo arquiteto criado: %. Vendedor: %', NEW.name, NEW.vendedor_responsavel;

  -- Verificar se existe vendedor responsável
  IF NEW.vendedor_responsavel IS NULL THEN
    RAISE WARNING 'Arquiteto % criado sem vendedor_responsavel. Meta diária não será atualizada.', NEW.name;
    RETURN NEW;
  END IF;

  -- Verificar se existe meta diária para o vendedor responsável hoje
  UPDATE tendenci_daily_architect_goals
  SET 
    captacoes_realizadas = captacoes_realizadas + 1,
    updated_at = NOW()
  WHERE vendedor_id = NEW.vendedor_responsavel
    AND data = v_today;

  -- Se não existe, criar com 1 captação realizada
  IF NOT FOUND THEN
    RAISE NOTICE 'Criando nova meta diária para vendedor % na data %', NEW.vendedor_responsavel, v_today;
    INSERT INTO tendenci_daily_architect_goals (
      vendedor_id,
      data,
      meta_captacoes,
      captacoes_realizadas
    ) VALUES (
      NEW.vendedor_responsavel,
      v_today,
      30, -- Meta padrão diária
      1
    )
    ON CONFLICT (vendedor_id, data) 
    DO UPDATE SET 
      captacoes_realizadas = tendenci_daily_architect_goals.captacoes_realizadas + 1,
      updated_at = NOW();
  ELSE
    RAISE NOTICE 'Meta diária atualizada para vendedor %', NEW.vendedor_responsavel;
  END IF;

  RETURN NEW;
END;
$$;