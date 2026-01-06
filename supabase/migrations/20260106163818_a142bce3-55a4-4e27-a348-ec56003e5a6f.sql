-- Função que recalcula taxas de cartão quando há múltiplas formas de pagamento
CREATE OR REPLACE FUNCTION recalculate_order_card_fees()
RETURNS TRIGGER AS $$
DECLARE
  parcelas JSONB;
  parcela JSONB;
  total_taxa_cartao NUMERIC := 0;
  total_taxa_boleto NUMERIC := 0;
  subtotal_sem_taxa NUMERIC;
  taxa_perc NUMERIC;
  valor_base NUMERIC;
  maior_parcela_cartao INT := 0;
  maior_parcela_boleto INT := 0;
  carencia_boleto_max INT := 0;
  taxa_cartao_rates JSONB;
  taxa_boleto_rates JSONB;
BEGIN
  -- Se não há observacao_pagamento, não faz nada
  IF NEW.observacao_pagamento IS NULL OR NEW.observacao_pagamento = '' THEN
    RETURN NEW;
  END IF;

  -- Tentar parsear o JSON de parcelas
  BEGIN
    parcelas := (NEW.observacao_pagamento::JSONB)->>'parcelas';
    IF parcelas IS NULL THEN
      parcelas := '[]'::JSONB;
    ELSE
      parcelas := parcelas::JSONB;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Se falhar o parse, não faz nada
    RETURN NEW;
  END;

  -- Calcular subtotal sem taxa (base para cálculo)
  subtotal_sem_taxa := COALESCE(NEW.subtotal, 0) - COALESCE(NEW.desconto_valor, 0) + COALESCE(NEW.valor_frete, 0);

  -- Buscar taxas de cartão
  SELECT jsonb_object_agg(installments, rate_percent) INTO taxa_cartao_rates 
  FROM credit_card_rates WHERE active = true;

  -- Buscar taxas de boleto  
  SELECT jsonb_object_agg(
    installments || '_' || carencia_dias, 
    rate_percent
  ) INTO taxa_boleto_rates 
  FROM boleto_rates WHERE active = true;

  -- Iterar sobre as parcelas
  FOR parcela IN SELECT * FROM jsonb_array_elements(parcelas)
  LOOP
    -- Cartão de crédito
    IF (parcela->>'forma_pagamento') = 'cartao_credito' THEN
      taxa_perc := COALESCE((taxa_cartao_rates->>((parcela->>'numero_parcelas')::TEXT))::NUMERIC, 0);
      valor_base := subtotal_sem_taxa * COALESCE((parcela->>'percentual')::NUMERIC, 0) / 100;
      total_taxa_cartao := total_taxa_cartao + (valor_base * taxa_perc / 100);
      
      IF COALESCE((parcela->>'numero_parcelas')::INT, 1) > maior_parcela_cartao THEN
        maior_parcela_cartao := COALESCE((parcela->>'numero_parcelas')::INT, 1);
      END IF;
    END IF;
    
    -- Boleto
    IF (parcela->>'forma_pagamento') = 'boleto' THEN
      DECLARE
        boleto_key TEXT;
        num_parcelas INT;
        carencia INT;
      BEGIN
        num_parcelas := COALESCE((parcela->>'numero_parcelas')::INT, 1);
        carencia := COALESCE((parcela->>'carencia_dias')::INT, 0);
        boleto_key := num_parcelas || '_' || carencia;
        taxa_perc := COALESCE((taxa_boleto_rates->>boleto_key)::NUMERIC, 0);
        valor_base := subtotal_sem_taxa * COALESCE((parcela->>'percentual')::NUMERIC, 0) / 100;
        total_taxa_boleto := total_taxa_boleto + (valor_base * taxa_perc / 100);
        
        IF num_parcelas > maior_parcela_boleto THEN
          maior_parcela_boleto := num_parcelas;
          carencia_boleto_max := carencia;
        END IF;
      END;
    END IF;
  END LOOP;

  -- Atualizar valores de taxa de cartão se houve mudança
  IF total_taxa_cartao > 0 THEN
    NEW.taxa_cartao_valor := ROUND(total_taxa_cartao, 2);
    NEW.numero_parcelas_cartao := maior_parcela_cartao;
    -- Calcular percentual médio ponderado para exibição
    NEW.taxa_cartao_percentual := COALESCE((taxa_cartao_rates->>(maior_parcela_cartao::TEXT))::NUMERIC, 0);
  END IF;

  -- Atualizar valores de taxa de boleto se houve mudança
  IF total_taxa_boleto > 0 THEN
    NEW.taxa_boleto_valor := ROUND(total_taxa_boleto, 2);
    NEW.numero_parcelas_boleto := maior_parcela_boleto;
    NEW.carencia_boleto := carencia_boleto_max;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger na tabela orders
DROP TRIGGER IF EXISTS trigger_recalculate_card_fees ON orders;
CREATE TRIGGER trigger_recalculate_card_fees
  BEFORE INSERT OR UPDATE OF observacao_pagamento ON orders
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_order_card_fees();