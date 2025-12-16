-- SEIRI: Migrar OP órfã para production_type ativo
UPDATE production_orders 
SET production_type_id = '0a6645f5-54c6-4715-a44b-9d8189577f11'
WHERE production_type_id NOT IN (
  SELECT id FROM production_types WHERE active = true
);

-- SEISO: RLS policy para permitir exclusão por admins
DROP POLICY IF EXISTS "Admins can delete production orders" ON production_orders;
CREATE POLICY "Admins can delete production orders" ON production_orders
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- SHITSUKE: Trigger para logging automático de alterações
CREATE OR REPLACE FUNCTION log_production_order_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_description TEXT;
BEGIN
  v_user_id := auth.uid();
  
  IF TG_OP = 'UPDATE' THEN
    -- Log de mudança de status
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_description := 'Status alterado de ' || COALESCE(OLD.status, 'N/A') || ' para ' || COALESCE(NEW.status, 'N/A');
      INSERT INTO production_logs (production_order_id, action, description, created_by)
      VALUES (NEW.id, 'status_change', v_description, v_user_id);
    END IF;
    
    -- Log de mudança de fase atual
    IF OLD.current_phase_id IS DISTINCT FROM NEW.current_phase_id THEN
      INSERT INTO production_logs (production_order_id, action, description, created_by)
      VALUES (NEW.id, 'phase_change', 'Fase de produção atualizada', v_user_id);
    END IF;
    
    -- Log de mudança de responsável
    IF OLD.responsible_id IS DISTINCT FROM NEW.responsible_id THEN
      INSERT INTO production_logs (production_order_id, action, description, created_by)
      VALUES (NEW.id, 'assignment_change', 'Responsável alterado', v_user_id);
    END IF;
    
    -- Log de mudança de prioridade  
    IF OLD.priority IS DISTINCT FROM NEW.priority THEN
      v_description := 'Prioridade alterada de ' || COALESCE(OLD.priority, 'N/A') || ' para ' || COALESCE(NEW.priority, 'N/A');
      INSERT INTO production_logs (production_order_id, action, description, created_by)
      VALUES (NEW.id, 'priority_change', v_description, v_user_id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger se não existir
DROP TRIGGER IF EXISTS trigger_log_production_order_changes ON production_orders;
CREATE TRIGGER trigger_log_production_order_changes
  AFTER UPDATE ON production_orders
  FOR EACH ROW
  EXECUTE FUNCTION log_production_order_changes();