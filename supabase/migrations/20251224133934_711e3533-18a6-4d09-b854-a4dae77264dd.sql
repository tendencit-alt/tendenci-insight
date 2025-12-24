-- Criar função para sincronizar fases quando status da OP muda
CREATE OR REPLACE FUNCTION public.sync_phases_on_op_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Se OP foi marcada como concluída
  IF NEW.status = 'concluido' AND (OLD.status IS NULL OR OLD.status != 'concluido') THEN
    UPDATE production_phases 
    SET status = 'concluido', 
        completed_at = COALESCE(completed_at, NOW())
    WHERE production_order_id = NEW.id 
      AND status != 'concluido';
  END IF;

  -- Se OP foi marcada como cancelada
  IF NEW.status = 'cancelado' AND (OLD.status IS NULL OR OLD.status != 'cancelado') THEN
    UPDATE production_phases 
    SET status = 'cancelado'
    WHERE production_order_id = NEW.id 
      AND status IN ('pendente', 'em_andamento');
  END IF;

  RETURN NEW;
END;
$function$;

-- Criar trigger para sincronização automática
DROP TRIGGER IF EXISTS trigger_sync_phases_on_op_status ON production_orders;
CREATE TRIGGER trigger_sync_phases_on_op_status
AFTER UPDATE ON production_orders
FOR EACH ROW
EXECUTE FUNCTION sync_phases_on_op_status_change();