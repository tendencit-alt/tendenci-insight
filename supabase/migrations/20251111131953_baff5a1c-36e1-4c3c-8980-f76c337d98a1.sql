-- Expandir tabela crm_deal_history para registrar todos os tipos de ações
ALTER TABLE crm_deal_history 
ADD COLUMN IF NOT EXISTS action_type TEXT DEFAULT 'stage_change',
ADD COLUMN IF NOT EXISTS field_name TEXT,
ADD COLUMN IF NOT EXISTS old_value TEXT,
ADD COLUMN IF NOT EXISTS new_value TEXT,
ADD COLUMN IF NOT EXISTS description TEXT;

-- Criar trigger para registrar mudanças em campos importantes
CREATE OR REPLACE FUNCTION log_deal_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_id UUID;
BEGIN
  user_id := auth.uid();

  -- Mudança de título
  IF OLD.title IS DISTINCT FROM NEW.title THEN
    INSERT INTO crm_deal_history (deal_id, action_type, field_name, old_value, new_value, description, moved_by)
    VALUES (NEW.id, 'field_change', 'title', OLD.title, NEW.title, 'Título alterado', user_id);
  END IF;

  -- Mudança de valor
  IF OLD.value IS DISTINCT FROM NEW.value THEN
    INSERT INTO crm_deal_history (deal_id, action_type, field_name, old_value, new_value, description, moved_by)
    VALUES (NEW.id, 'field_change', 'value', OLD.value::TEXT, NEW.value::TEXT, 'Valor alterado', user_id);
  END IF;

  -- Mudança de tipo de produto
  IF OLD.product_type IS DISTINCT FROM NEW.product_type THEN
    INSERT INTO crm_deal_history (deal_id, action_type, field_name, old_value, new_value, description, moved_by)
    VALUES (NEW.id, 'field_change', 'product_type', OLD.product_type, NEW.product_type, 'Tipo de produto alterado', user_id);
  END IF;

  -- Mudança de responsável
  IF OLD.owner_id IS DISTINCT FROM NEW.owner_id THEN
    INSERT INTO crm_deal_history (deal_id, action_type, field_name, old_value, new_value, description, moved_by)
    VALUES (NEW.id, 'field_change', 'owner_id', OLD.owner_id::TEXT, NEW.owner_id::TEXT, 'Responsável alterado', user_id);
  END IF;

  -- Mudança de arquiteto
  IF OLD.architect_id IS DISTINCT FROM NEW.architect_id THEN
    INSERT INTO crm_deal_history (deal_id, action_type, field_name, old_value, new_value, description, moved_by)
    VALUES (NEW.id, 'field_change', 'architect_id', OLD.architect_id::TEXT, NEW.architect_id::TEXT, 'Arquiteto alterado', user_id);
  END IF;

  -- Mudança de status (Won/Lost)
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO crm_deal_history (deal_id, action_type, field_name, old_value, new_value, description, moved_by, to_stage_id)
    VALUES (
      NEW.id, 
      CASE 
        WHEN NEW.status = 'won' THEN 'won'
        WHEN NEW.status = 'lost' THEN 'lost'
        ELSE 'status_change'
      END,
      'status', 
      OLD.status, 
      NEW.status, 
      CASE 
        WHEN NEW.status = 'won' THEN 'Negócio marcado como ganho'
        WHEN NEW.status = 'lost' THEN 'Negócio marcado como perdido: ' || COALESCE(NEW.lost_reason, 'Sem motivo')
        WHEN NEW.status = 'aberto' THEN 'Negócio reaberto'
        ELSE 'Status alterado'
      END,
      user_id,
      NEW.stage_id
    );
  END IF;

  -- Mudança de estágio (já tratado pelo trigger existente, mas vamos melhorar)
  IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
    INSERT INTO crm_deal_history (deal_id, action_type, from_stage_id, to_stage_id, description, moved_by)
    VALUES (NEW.id, 'stage_change', OLD.stage_id, NEW.stage_id, 'Negócio movido de etapa', user_id);
  END IF;

  -- Mudança de nota/observações
  IF OLD.note IS DISTINCT FROM NEW.note AND (OLD.note IS NOT NULL OR NEW.note IS NOT NULL) THEN
    INSERT INTO crm_deal_history (deal_id, action_type, field_name, description, moved_by)
    VALUES (NEW.id, 'note_change', 'note', 'Observações atualizadas', user_id);
  END IF;

  -- Agendamento de ligação
  IF OLD.scheduled_call IS DISTINCT FROM NEW.scheduled_call THEN
    INSERT INTO crm_deal_history (deal_id, action_type, field_name, new_value, description, moved_by)
    VALUES (
      NEW.id, 
      'schedule_change', 
      'scheduled_call', 
      NEW.scheduled_call::TEXT,
      CASE 
        WHEN NEW.scheduled_call IS NULL THEN 'Agendamento de ligação removido'
        WHEN OLD.scheduled_call IS NULL THEN 'Ligação agendada'
        ELSE 'Agendamento de ligação alterado'
      END,
      user_id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Remover trigger antigo se existir e criar novo
DROP TRIGGER IF EXISTS log_deal_stage_change ON crm_deals;
DROP TRIGGER IF EXISTS log_all_deal_changes ON crm_deals;

CREATE TRIGGER log_all_deal_changes
AFTER UPDATE ON crm_deals
FOR EACH ROW
EXECUTE FUNCTION log_deal_changes();

-- Criar trigger para registrar criação de negócio
CREATE OR REPLACE FUNCTION log_deal_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO crm_deal_history (deal_id, action_type, to_stage_id, description, moved_by)
  VALUES (NEW.id, 'created', NEW.stage_id, 'Negócio criado', auth.uid());
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER log_deal_creation_trigger
AFTER INSERT ON crm_deals
FOR EACH ROW
EXECUTE FUNCTION log_deal_creation();