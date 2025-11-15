-- Função para registrar histórico de mudanças no arquiteto
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
  END IF;

  -- Primeiro contato registrado
  IF OLD.data_primeiro_contato IS NULL AND NEW.data_primeiro_contato IS NOT NULL THEN
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
      '🎯 Primeiro contato realizado',
      auth.uid()
    );
  END IF;

  -- Contato atualizado
  IF OLD.data_ultimo_contato IS DISTINCT FROM NEW.data_ultimo_contato AND NEW.data_ultimo_contato IS NOT NULL THEN
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
      '📞 Contato realizado',
      auth.uid()
    );
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

-- Criar trigger para mudanças no arquiteto
DROP TRIGGER IF EXISTS trigger_log_architect_prospeccao_changes ON architects;
CREATE TRIGGER trigger_log_architect_prospeccao_changes
  AFTER UPDATE ON architects
  FOR EACH ROW
  EXECUTE FUNCTION log_architect_prospeccao_changes();

-- Função para registrar criação de arquiteto
CREATE OR REPLACE FUNCTION log_architect_prospeccao_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
    '🆕 Arquiteto cadastrado no sistema',
    auth.uid()
  );

  RETURN NEW;
END;
$$;

-- Criar trigger para criação de arquiteto
DROP TRIGGER IF EXISTS trigger_log_architect_prospeccao_creation ON architects;
CREATE TRIGGER trigger_log_architect_prospeccao_creation
  AFTER INSERT ON architects
  FOR EACH ROW
  EXECUTE FUNCTION log_architect_prospeccao_creation();

-- Função para registrar quando agendamento é criado
CREATE OR REPLACE FUNCTION log_agendamento_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO tendenci_prospec_arq_logs (
    architect_id,
    tipo,
    canal,
    mensagem,
    enviado_por,
    campanha_id,
    metadata
  ) VALUES (
    NEW.architect_id,
    'agendamento',
    COALESCE(NEW.canal, 'sistema'),
    format('📅 Agendamento criado para %s', 
      to_char(NEW.data_agendamento, 'DD/MM/YYYY HH24:MI')
    ),
    COALESCE(NEW.vendedor_id, auth.uid()),
    NEW.campanha_id,
    jsonb_build_object(
      'agendamento_id', NEW.id,
      'data_agendamento', NEW.data_agendamento,
      'status', NEW.status
    )
  );

  RETURN NEW;
END;
$$;

-- Criar trigger para criação de agendamento
DROP TRIGGER IF EXISTS trigger_log_agendamento_creation ON tendenci_prospec_arq_agendamentos;
CREATE TRIGGER trigger_log_agendamento_creation
  AFTER INSERT ON tendenci_prospec_arq_agendamentos
  FOR EACH ROW
  EXECUTE FUNCTION log_agendamento_creation();

-- Função para registrar mudanças em agendamento
CREATE OR REPLACE FUNCTION log_agendamento_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mudança de status
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO tendenci_prospec_arq_logs (
      architect_id,
      tipo,
      canal,
      mensagem,
      enviado_por,
      campanha_id,
      metadata
    ) VALUES (
      NEW.architect_id,
      'agendamento',
      COALESCE(NEW.canal, 'sistema'),
      format('Status do agendamento alterado para "%s"', NEW.status),
      auth.uid(),
      NEW.campanha_id,
      jsonb_build_object(
        'agendamento_id', NEW.id,
        'old_status', OLD.status,
        'new_status', NEW.status
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Criar trigger para mudanças em agendamento
DROP TRIGGER IF EXISTS trigger_log_agendamento_changes ON tendenci_prospec_arq_agendamentos;
CREATE TRIGGER trigger_log_agendamento_changes
  AFTER UPDATE ON tendenci_prospec_arq_agendamentos
  FOR EACH ROW
  EXECUTE FUNCTION log_agendamento_changes();