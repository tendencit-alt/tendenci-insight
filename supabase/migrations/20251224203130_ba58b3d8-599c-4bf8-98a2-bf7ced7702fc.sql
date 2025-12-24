-- Corrigir função para usar sla_dias_uteis como base do cálculo
CREATE OR REPLACE FUNCTION public.calculate_production_deadline(
  p_production_type_id uuid,
  p_start_date timestamptz DEFAULT now()
) 
RETURNS timestamptz 
LANGUAGE sql 
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_start_date + 
    (COALESCE(SUM(COALESCE(sla_dias_uteis, 0)), 0) || ' days')::interval
  FROM production_phase_templates
  WHERE production_type_id = p_production_type_id 
    AND active = true;
$$;

-- Recalcular prazos de todas as OPs existentes com base nos SLAs corretos
UPDATE production_orders po
SET planned_end_date = calculate_production_deadline(po.production_type_id, po.created_at)
WHERE po.production_type_id IS NOT NULL;