-- Atualizar função para só registrar contato quando status mudar para contato_efetivado
CREATE OR REPLACE FUNCTION log_architect_prospeccao_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mudança de status no funil
  IF OLD.status_funil IS DISTINCT FROM NEW.status_funil THEN
    INSERT INTO tendenci_prospec_arq_logs (
      architect_id,
      tipo,
      canal,
      mensagem,
      enviado_por,
      metadata
    ) VALUES (
      NEW.id,
      'sistema',
      'prospecção',
      format('Status alterado de "%s" para "%s"', 
        COALESCE(OLD.status_funil, 'sem status'), 
        COALESCE(NEW.status_funil, 'sem status')
      ),
      auth.uid(),
      jsonb_build_object(
        'old_status', OLD.status_funil,
        'new_status', NEW.status_funil
      )
    );

    -- Registrar primeiro contato APENAS quando status mudar para contato_efetivado
    IF NEW.status_funil = 'contato_efetivado' AND OLD.data_primeiro_contato IS NULL THEN
      -- Atualizar data_primeiro_contato
      NEW.data_primeiro_contato = NOW();
      
      INSERT INTO tendenci_prospec_arq_logs (
        architect_id,
        tipo,
        canal,
        mensagem,
        enviado_por
      ) VALUES (
        NEW.id,
        'vendedor',
        'prospecção',
        '🎯 Primeiro contato realizado',
        auth.uid()
      );
    END IF;

    -- Atualizar data_ultimo_contato quando mover para contato_efetivado
    IF NEW.status_funil = 'contato_efetivado' THEN
      NEW.data_ultimo_contato = NOW();
    END IF;
  END IF;

  -- Mudança de vendedor responsável
  IF OLD.vendedor_responsavel IS DISTINCT FROM NEW.vendedor_responsavel THEN
    INSERT INTO tendenci_prospec_arq_logs (
      architect_id,
      tipo,
      canal,
      mensagem,
      enviado_por,
      metadata
    ) VALUES (
      NEW.id,
      'sistema',
      'prospecção',
      format('Vendedor responsável alterado'),
      auth.uid(),
      jsonb_build_object(
        'old_vendedor_id', OLD.vendedor_responsavel,
        'new_vendedor_id', NEW.vendedor_responsavel
      )
    );
  END IF;

  -- Mudança de tier
  IF OLD.tier IS DISTINCT FROM NEW.tier THEN
    INSERT INTO tendenci_prospec_arq_logs (
      architect_id,
      tipo,
      canal,
      mensagem,
      enviado_por
    ) VALUES (
      NEW.id,
      'sistema',
      'prospecção',
      format('Tier alterado de "%s" para "%s"', 
        COALESCE(OLD.tier, 'sem tier'), 
        COALESCE(NEW.tier, 'sem tier')
      ),
      auth.uid()
    );
  END IF;

  -- Arquiteto reativado
  IF OLD.active = false AND NEW.active = true THEN
    INSERT INTO tendenci_prospec_arq_logs (
      architect_id,
      tipo,
      canal,
      mensagem,
      enviado_por
    ) VALUES (
      NEW.id,
      'sistema',
      'prospecção',
      '✅ Arquiteto reativado',
      auth.uid()
    );
  END IF;

  -- Arquiteto marcado como inativo
  IF OLD.active = true AND NEW.active = false THEN
    INSERT INTO tendenci_prospec_arq_logs (
      architect_id,
      tipo,
      canal,
      mensagem,
      enviado_por
    ) VALUES (
      NEW.id,
      'sistema',
      'prospecção',
      '⚠️ Arquiteto marcado como inativo (45 dias sem projeto)',
      auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$$;