-- 1. Criar função para calcular prazo baseado nos SLAs das etapas
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
    (COALESCE(SUM(COALESCE(sla_hours, COALESCE(sla_dias_uteis, 0) * 8)), 0) || ' hours')::interval
  FROM production_phase_templates
  WHERE production_type_id = p_production_type_id 
    AND active = true;
$$;

-- 2. Atualizar o trigger create_production_phases_on_op_insert para calcular prazo automaticamente
CREATE OR REPLACE FUNCTION public.create_production_phases_on_op_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template RECORD;
  v_first_phase_id UUID := NULL;
BEGIN
  -- Criar fases baseadas nos templates do tipo de produção
  FOR v_template IN
    SELECT id, name, position
    FROM production_phase_templates
    WHERE production_type_id = NEW.production_type_id
      AND active = true
    ORDER BY position ASC
  LOOP
    INSERT INTO production_phases (
      production_order_id,
      phase_template_id,
      status,
      started_at
    )
    VALUES (
      NEW.id,
      v_template.id,
      CASE WHEN v_first_phase_id IS NULL THEN 'em_andamento' ELSE 'pendente' END,
      CASE WHEN v_first_phase_id IS NULL THEN NOW() ELSE NULL END
    )
    RETURNING id INTO v_first_phase_id;
    
    -- Guardar apenas a primeira fase
    IF v_first_phase_id IS NOT NULL AND NEW.current_phase_id IS NULL THEN
      -- Atualizar a ordem com a primeira fase
      UPDATE production_orders 
      SET current_phase_id = v_first_phase_id
      WHERE id = NEW.id;
      
      -- Não sobrescrever v_first_phase_id para não entrar no IF novamente
      v_first_phase_id := 'set';
    END IF;
  END LOOP;
  
  -- Calcular e definir prazo de entrega baseado nos SLAs (apenas se não tiver prazo manual)
  UPDATE production_orders 
  SET planned_end_date = calculate_production_deadline(NEW.production_type_id, NEW.created_at)
  WHERE id = NEW.id
    AND planned_end_date IS NULL;
  
  RETURN NEW;
END;
$$;

-- 3. Popular prazos para OPs existentes que não têm prazo definido
UPDATE production_orders po
SET planned_end_date = calculate_production_deadline(po.production_type_id, po.created_at)
WHERE po.planned_end_date IS NULL
  AND po.production_type_id IS NOT NULL;