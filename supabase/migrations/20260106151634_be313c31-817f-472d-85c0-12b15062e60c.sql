-- Atualizar prazo_customizado_dias baseado na soma das etapas para Móveis Planejados
UPDATE production_orders po
SET prazo_customizado_dias = subquery.total_dias
FROM (
  SELECT 
    pp.production_order_id,
    SUM(COALESCE(pp.sla_dias_uteis_custom, ppt.sla_dias_uteis, 0)) as total_dias
  FROM production_phases pp
  LEFT JOIN production_phase_templates ppt ON pp.phase_template_id = ppt.id
  GROUP BY pp.production_order_id
) subquery
WHERE po.id = subquery.production_order_id
  AND po.production_type_id = (
    SELECT id FROM production_types WHERE name = 'Móveis Planejados' LIMIT 1
  );

-- Criar função para calcular dias úteis em SQL
CREATE OR REPLACE FUNCTION add_business_days_sql(start_date DATE, num_days INTEGER)
RETURNS DATE AS $$
DECLARE
  result_date DATE := start_date;
  days_added INTEGER := 0;
BEGIN
  WHILE days_added < num_days LOOP
    result_date := result_date + INTERVAL '1 day';
    -- Skip weekends (0 = Sunday, 6 = Saturday)
    IF EXTRACT(DOW FROM result_date) NOT IN (0, 6) THEN
      days_added := days_added + 1;
    END IF;
  END LOOP;
  RETURN result_date;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Atualizar planned_end_date baseado no prazo_customizado_dias recém calculado
UPDATE production_orders po
SET planned_end_date = add_business_days_sql(
  (po.created_at AT TIME ZONE 'America/Sao_Paulo')::DATE, 
  COALESCE(po.prazo_customizado_dias, 0)
)::TIMESTAMP WITH TIME ZONE
WHERE po.production_type_id = (
  SELECT id FROM production_types WHERE name = 'Móveis Planejados' LIMIT 1
)
AND po.prazo_customizado_dias IS NOT NULL
AND po.prazo_customizado_dias > 0;