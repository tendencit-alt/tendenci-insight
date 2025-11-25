-- Recriar trigger log_deal_changes com correções para exibir nomes ao invés de UUIDs
-- Usar CASCADE para dropar triggers dependentes

DROP FUNCTION IF EXISTS log_deal_changes() CASCADE;

CREATE OR REPLACE FUNCTION public.log_deal_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_id UUID;
  old_owner_name TEXT;
  new_owner_name TEXT;
  old_architect_name TEXT;
  new_architect_name TEXT;
BEGIN
  user_id := auth.uid();

  -- Mudança de título
  IF OLD.title IS DISTINCT FROM NEW.title THEN
    INSERT INTO crm_deal_history (deal_id, action_type, field_name, old_value, new_value, description, moved_by, to_stage_id)
    VALUES (NEW.id, 'field_change', 'title', OLD.title, NEW.title, 'Título alterado', user_id, NEW.stage_id);
  END IF;

  -- Mudança de valor
  IF OLD.value IS DISTINCT FROM NEW.value THEN
    INSERT INTO crm_deal_history (deal_id, action_type, field_name, old_value, new_value, description, moved_by, to_stage_id)
    VALUES (NEW.id, 'field_change', 'value', OLD.value::TEXT, NEW.value::TEXT, 'Valor alterado', user_id, NEW.stage_id);
  END IF;

  -- Mudança de tipo de produto
  IF OLD.product_type IS DISTINCT FROM NEW.product_type THEN
    INSERT INTO crm_deal_history (deal_id, action_type, field_name, old_value, new_value, description, moved_by, to_stage_id)
    VALUES (NEW.id, 'field_change', 'product_type', OLD.product_type, NEW.product_type, 'Tipo de produto alterado', user_id, NEW.stage_id);
  END IF;

  -- Mudança de responsável (com lookup de nome)
  IF OLD.owner_id IS DISTINCT FROM NEW.owner_id THEN
    SELECT full_name INTO old_owner_name FROM profiles WHERE id = OLD.owner_id;
    SELECT full_name INTO new_owner_name FROM profiles WHERE id = NEW.owner_id;
    
    INSERT INTO crm_deal_history (deal_id, action_type, field_name, old_value, new_value, description, moved_by, to_stage_id)
    VALUES (NEW.id, 'field_change', 'owner_id', 
            COALESCE(old_owner_name, OLD.owner_id::TEXT, '(não definido)'), 
            COALESCE(new_owner_name, NEW.owner_id::TEXT, '(não definido)'), 
            'Responsável alterado', user_id, NEW.stage_id);
  END IF;

  -- Mudança de arquiteto (com lookup de nome)
  IF OLD.architect_id IS DISTINCT FROM NEW.architect_id THEN
    SELECT name INTO old_architect_name FROM architects WHERE id = OLD.architect_id;
    SELECT name INTO new_architect_name FROM architects WHERE id = NEW.architect_id;
    
    INSERT INTO crm_deal_history (deal_id, action_type, field_name, old_value, new_value, description, moved_by, to_stage_id)
    VALUES (NEW.id, 'field_change', 'architect_id', 
            COALESCE(old_architect_name, OLD.architect_id::TEXT, '(sem arquiteto)'), 
            COALESCE(new_architect_name, NEW.architect_id::TEXT, '(sem arquiteto)'), 
            'Arquiteto alterado', user_id, NEW.stage_id);
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

  -- Mudança de estágio
  IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
    INSERT INTO crm_deal_history (deal_id, action_type, from_stage_id, to_stage_id, description, moved_by)
    VALUES (NEW.id, 'stage_change', OLD.stage_id, NEW.stage_id, 'Negócio movido de etapa', user_id);
  END IF;

  -- Mudança de nota/observações (COM conteúdo old_value e new_value)
  IF OLD.note IS DISTINCT FROM NEW.note AND (OLD.note IS NOT NULL OR NEW.note IS NOT NULL) THEN
    INSERT INTO crm_deal_history (deal_id, action_type, field_name, old_value, new_value, description, moved_by, to_stage_id)
    VALUES (NEW.id, 'note_change', 'note', OLD.note, NEW.note, 'Observações atualizadas', user_id, NEW.stage_id);
  END IF;

  -- Agendamento de ligação
  IF OLD.scheduled_call IS DISTINCT FROM NEW.scheduled_call THEN
    INSERT INTO crm_deal_history (deal_id, action_type, field_name, new_value, description, moved_by, to_stage_id)
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
      user_id,
      NEW.stage_id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Recriar trigger
CREATE TRIGGER log_deal_changes_trigger
AFTER UPDATE ON crm_deals
FOR EACH ROW
EXECUTE FUNCTION log_deal_changes();