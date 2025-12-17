-- Criar função para atribuir owner automaticamente quando deal é movido para Qualificação
CREATE OR REPLACE FUNCTION public.auto_assign_owner_on_qualification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_stage_name TEXT;
  v_user_id UUID;
BEGIN
  -- Buscar nome da nova etapa
  SELECT name INTO v_stage_name
  FROM crm_stages
  WHERE id = NEW.stage_id;
  
  -- Verificar se está movendo para Qualificação e não tem owner
  IF v_stage_name ILIKE '%qualificação%' 
     AND NEW.owner_id IS NULL 
     AND (OLD.stage_id IS NULL OR OLD.stage_id IS DISTINCT FROM NEW.stage_id) THEN
    
    -- Obter usuário atual
    v_user_id := auth.uid();
    
    -- Atribuir o usuário atual como owner se existir
    IF v_user_id IS NOT NULL THEN
      NEW.owner_id := v_user_id;
      
      -- Registrar no histórico
      INSERT INTO crm_deal_history (deal_id, action_type, field_name, old_value, new_value, description, moved_by, to_stage_id)
      VALUES (
        NEW.id, 
        'field_change', 
        'owner_id', 
        NULL, 
        (SELECT full_name FROM profiles WHERE id = v_user_id),
        'Responsável atribuído automaticamente ao mover para Qualificação',
        v_user_id,
        NEW.stage_id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger que executa ANTES do update (para modificar NEW.owner_id)
DROP TRIGGER IF EXISTS trigger_auto_assign_owner_on_qualification ON crm_deals;
CREATE TRIGGER trigger_auto_assign_owner_on_qualification
  BEFORE UPDATE ON crm_deals
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_owner_on_qualification();