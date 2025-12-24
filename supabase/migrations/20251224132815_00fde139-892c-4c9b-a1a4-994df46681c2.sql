-- 1. Remover trigger duplicado que causa criação de fases duplicadas
DROP TRIGGER IF EXISTS trigger_create_phases_for_order ON production_orders;
DROP FUNCTION IF EXISTS create_phases_for_production_order();

-- 2. Limpar fases duplicadas da OP-0009
DELETE FROM production_phases WHERE production_order_id = '1626f70f-7ee7-4b48-90a2-f3fb196d35cf';

-- 3. Recriar as fases corretamente (apenas 5, uma por template)
INSERT INTO production_phases (production_order_id, phase_template_id, position, status, started_at)
SELECT 
  '1626f70f-7ee7-4b48-90a2-f3fb196d35cf',
  pt.id,
  pt.position,
  CASE WHEN pt.position = 1 THEN 'em_andamento' ELSE 'pendente' END,
  CASE WHEN pt.position = 1 THEN NOW() ELSE NULL END
FROM production_phase_templates pt
WHERE pt.production_type_id = '0a6645f5-54c6-4715-a44b-9d8189577f11' 
  AND pt.active = true
ORDER BY pt.position;

-- 4. Atualizar current_phase_id da OP-0009
UPDATE production_orders 
SET current_phase_id = (
  SELECT pf.id 
  FROM production_phases pf
  JOIN production_phase_templates pt ON pf.phase_template_id = pt.id
  WHERE pf.production_order_id = '1626f70f-7ee7-4b48-90a2-f3fb196d35cf'
    AND pt.position = 1
  LIMIT 1
),
status = 'em_producao',
actual_start_date = COALESCE(actual_start_date, NOW())
WHERE id = '1626f70f-7ee7-4b48-90a2-f3fb196d35cf';

-- 5. Corrigir fases de TODAS as OPs que tenham position = 0 incorretamente
UPDATE production_phases pf
SET position = pt.position
FROM production_phase_templates pt
WHERE pf.phase_template_id = pt.id
  AND (pf.position IS NULL OR pf.position = 0);