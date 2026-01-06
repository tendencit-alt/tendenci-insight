-- Atualizar OPs que não têm current_phase_id para apontar para a primeira fase (position = 1)
UPDATE production_orders po
SET current_phase_id = (
  SELECT pp.id 
  FROM production_phases pp 
  WHERE pp.production_order_id = po.id 
    AND pp.position = 1 
  LIMIT 1
)
WHERE po.current_phase_id IS NULL
  AND EXISTS (
    SELECT 1 FROM production_phases pp 
    WHERE pp.production_order_id = po.id
  );