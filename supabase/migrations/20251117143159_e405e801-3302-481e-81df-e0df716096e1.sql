-- Função para atualizar meta de vendas quando deal for ganho
CREATE OR REPLACE FUNCTION update_sales_goal_on_deal_won()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_seller_goal_id uuid;
  v_current_value numeric;
BEGIN
  -- Só processa se o deal foi marcado como ganho
  IF NEW.status = 'won' AND (OLD.status IS NULL OR OLD.status != 'won') THEN
    -- Buscar meta ativa do vendedor responsável
    SELECT id INTO v_seller_goal_id
    FROM tendenci_seller_goals
    WHERE vendedor_id = NEW.owner_id
      AND status = 'ativa'
      AND NOW() BETWEEN data_inicio AND data_fim
    LIMIT 1;

    IF v_seller_goal_id IS NOT NULL THEN
      -- Verificar se já existe progresso para essa meta
      SELECT valor_vendido INTO v_current_value
      FROM tendenci_goal_progress
      WHERE seller_goal_id = v_seller_goal_id;

      IF v_current_value IS NOT NULL THEN
        -- Atualizar progresso existente
        UPDATE tendenci_goal_progress
        SET 
          valor_vendido = valor_vendido + COALESCE(NEW.value, 0),
          percentual = ((valor_vendido + COALESCE(NEW.value, 0)) / (
            SELECT valor_meta FROM tendenci_seller_goals WHERE id = v_seller_goal_id
          )) * 100,
          atualizado_em = NOW()
        WHERE seller_goal_id = v_seller_goal_id;
      ELSE
        -- Criar novo progresso
        INSERT INTO tendenci_goal_progress (
          seller_goal_id,
          valor_vendido,
          percentual,
          atualizado_em
        )
        SELECT 
          v_seller_goal_id,
          COALESCE(NEW.value, 0),
          (COALESCE(NEW.value, 0) / valor_meta) * 100,
          NOW()
        FROM tendenci_seller_goals
        WHERE id = v_seller_goal_id;
      END IF;
    END IF;
  END IF;

  -- Se deal foi reaberto (de won para outro status), subtrair valor
  IF OLD.status = 'won' AND NEW.status != 'won' THEN
    SELECT id INTO v_seller_goal_id
    FROM tendenci_seller_goals
    WHERE vendedor_id = NEW.owner_id
      AND status = 'ativa'
      AND NOW() BETWEEN data_inicio AND data_fim
    LIMIT 1;

    IF v_seller_goal_id IS NOT NULL THEN
      UPDATE tendenci_goal_progress
      SET 
        valor_vendido = GREATEST(0, valor_vendido - COALESCE(OLD.value, 0)),
        percentual = (GREATEST(0, valor_vendido - COALESCE(OLD.value, 0)) / (
          SELECT valor_meta FROM tendenci_seller_goals WHERE id = v_seller_goal_id
        )) * 100,
        atualizado_em = NOW()
      WHERE seller_goal_id = v_seller_goal_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger para atualizar meta de vendas
DROP TRIGGER IF EXISTS trigger_update_sales_goal ON crm_deals;
CREATE TRIGGER trigger_update_sales_goal
  AFTER UPDATE OF status
  ON crm_deals
  FOR EACH ROW
  EXECUTE FUNCTION update_sales_goal_on_deal_won();

-- Função para atualizar meta de captação quando arquiteto for criado
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

  -- Verificar se existe meta diária para o vendedor responsável hoje
  IF NEW.vendedor_responsavel IS NOT NULL THEN
    -- Tentar atualizar meta existente
    UPDATE tendenci_daily_architect_goals
    SET 
      captacoes_realizadas = captacoes_realizadas + 1,
      updated_at = NOW()
    WHERE vendedor_id = NEW.vendedor_responsavel
      AND data = v_today;

    -- Se não existe, criar com 1 captação realizada
    IF NOT FOUND THEN
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
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger para atualizar meta de captação
DROP TRIGGER IF EXISTS trigger_update_capture_goal ON architects;
CREATE TRIGGER trigger_update_capture_goal
  AFTER INSERT
  ON architects
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_capture_goal();