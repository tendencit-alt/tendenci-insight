-- Desabilitar trigger temporariamente
DROP TRIGGER IF EXISTS trigger_log_production_order_changes ON production_orders;

-- 1. Deletar fases que não pertencem ao tipo correto da OP
DELETE FROM production_phases pp
WHERE pp.id IN (
  SELECT pp2.id 
  FROM production_phases pp2
  JOIN production_phase_templates ppt ON ppt.id = pp2.phase_template_id
  JOIN production_orders po ON po.id = pp2.production_order_id
  WHERE ppt.production_type_id != po.production_type_id
);

-- 2. Resetar current_phase_id para NULL quando aponta para fase incorreta ou inexistente
UPDATE production_orders po
SET current_phase_id = NULL
WHERE po.current_phase_id IS NOT NULL
  AND (
    NOT EXISTS (
      SELECT 1 FROM production_phases pp WHERE pp.id = po.current_phase_id
    )
    OR EXISTS (
      SELECT 1 
      FROM production_phases pp
      JOIN production_phase_templates ppt ON ppt.id = pp.phase_template_id
      WHERE pp.id = po.current_phase_id
        AND ppt.production_type_id != po.production_type_id
    )
  );

-- 3. Corrigir função do trigger para usar phase_template_id ao invés de phase_id
CREATE OR REPLACE FUNCTION public.log_production_order_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_old_template_id UUID;
  v_new_template_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  -- Log mudança de fase
  IF OLD.current_phase_id IS DISTINCT FROM NEW.current_phase_id THEN
    -- Buscar template_ids das fases
    SELECT phase_template_id INTO v_old_template_id FROM production_phases WHERE id = OLD.current_phase_id;
    SELECT phase_template_id INTO v_new_template_id FROM production_phases WHERE id = NEW.current_phase_id;
    
    INSERT INTO production_logs (production_order_id, action_type, from_phase_id, to_phase_id, description, created_by)
    VALUES (NEW.id, 'phase_change', v_old_template_id, v_new_template_id, 'Fase de produção atualizada', v_user_id);
  END IF;
  
  -- Log mudança de status
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO production_logs (production_order_id, action_type, from_status, to_status, description, created_by)
    VALUES (NEW.id, 'status_change', OLD.status, NEW.status, 'Status de produção atualizado', v_user_id);
  END IF;
  
  -- Log mudança de responsável
  IF OLD.responsible_id IS DISTINCT FROM NEW.responsible_id THEN
    INSERT INTO production_logs (production_order_id, action_type, description, created_by, metadata)
    VALUES (NEW.id, 'responsible_change', 'Responsável de produção alterado', v_user_id, 
      jsonb_build_object('old_responsible', OLD.responsible_id, 'new_responsible', NEW.responsible_id));
  END IF;
  
  -- Log mudança de prioridade
  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    INSERT INTO production_logs (production_order_id, action_type, description, created_by, metadata)
    VALUES (NEW.id, 'priority_change', 'Prioridade de produção alterada', v_user_id,
      jsonb_build_object('old_priority', OLD.priority, 'new_priority', NEW.priority));
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4. Recriar trigger
CREATE TRIGGER trigger_log_production_order_changes
  AFTER UPDATE ON production_orders
  FOR EACH ROW
  EXECUTE FUNCTION log_production_order_changes();