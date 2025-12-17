-- Função para reativar deals perdidos há 30+ dias
-- Planejados são convertidos para Móveis Soltos antes de ir para Follow Up
CREATE OR REPLACE FUNCTION public.reactivate_lost_deals_to_followup()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_followup_stage_id UUID;
  v_deal RECORD;
  v_reactivated_count INTEGER := 0;
  v_converted_count INTEGER := 0;
BEGIN
  -- Buscar ID da etapa "Follow Up (I.A)"
  SELECT id INTO v_followup_stage_id 
  FROM crm_stages 
  WHERE name ILIKE '%Follow Up%' 
  LIMIT 1;
  
  IF v_followup_stage_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Etapa Follow Up não encontrada',
      'reactivated', 0,
      'converted', 0
    );
  END IF;
  
  -- Processar cada deal perdido há 30+ dias
  FOR v_deal IN 
    SELECT id, title, categoria, lead_id, pipeline_id
    FROM crm_deals
    WHERE status = 'lost'
      AND updated_at < NOW() - INTERVAL '30 days'
  LOOP
    -- Verificar se categoria será convertida
    IF v_deal.categoria = 'Planejados' THEN
      v_converted_count := v_converted_count + 1;
    END IF;
    
    -- Atualizar o deal
    UPDATE crm_deals
    SET 
      stage_id = v_followup_stage_id,
      status = 'aberto',
      -- CONVERTER PLANEJADOS → MÓVEIS SOLTOS
      categoria = CASE 
        WHEN categoria = 'Planejados' THEN 'Móveis Soltos'
        ELSE categoria
      END,
      followup_enabled = true,
      followup_count = 0,
      last_followup_at = NULL,
      stage_entered_at = NOW(),
      updated_at = NOW(),
      lost_reason = NULL,
      lost_note = NULL
    WHERE id = v_deal.id;
    
    -- Inserir log na timeline
    INSERT INTO crm_timeline (deal_id, update_type, message, created_at)
    VALUES (
      v_deal.id,
      'Reativação Automática',
      CASE 
        WHEN v_deal.categoria = 'Planejados' 
        THEN '🔄 Deal reativado automaticamente após 30 dias em Perdido. Categoria alterada de Planejados para Móveis Soltos para nova abordagem.'
        ELSE '🔄 Deal reativado automaticamente após 30 dias em Perdido para nova tentativa de follow-up.'
      END,
      NOW()
    );
    
    v_reactivated_count := v_reactivated_count + 1;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'reactivated', v_reactivated_count,
    'converted_to_moveis_soltos', v_converted_count,
    'followup_stage_id', v_followup_stage_id,
    'executed_at', NOW()
  );
END;
$$;