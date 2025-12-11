-- Trigger para registrar automaticamente mudanças de status em order_history
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS trigger AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_history (
      order_id, 
      action_type, 
      field_name, 
      old_value, 
      new_value, 
      created_by,
      description
    )
    VALUES (
      NEW.id, 
      'status_change', 
      'status', 
      OLD.status, 
      NEW.status, 
      COALESCE(NEW.approved_by, auth.uid()),
      'Status alterado de "' || COALESCE(OLD.status, 'N/A') || '" para "' || COALESCE(NEW.status, 'N/A') || '"'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Remover trigger existente se houver
DROP TRIGGER IF EXISTS order_status_history ON orders;

-- Criar trigger
CREATE TRIGGER order_status_history
AFTER UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION log_order_status_change();