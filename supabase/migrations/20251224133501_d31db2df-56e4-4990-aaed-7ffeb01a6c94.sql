
-- Melhorar trigger para usar fallback por position quando is_start_phase não encontrar fase
CREATE OR REPLACE FUNCTION public.create_production_phases_on_op_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  v_template RECORD;
  v_first_phase_id uuid;
  v_created_phase_id uuid;
BEGIN
  -- Criar fases baseadas nos templates do tipo de produção
  FOR v_template IN 
    SELECT id, name, position, is_start_phase, estimated_hours
    FROM production_phase_templates 
    WHERE production_type_id = NEW.production_type_id 
      AND active = true
    ORDER BY position
  LOOP
    INSERT INTO production_phases (
      production_order_id,
      phase_template_id,
      name,
      position,
      status,
      started_at
    ) VALUES (
      NEW.id,
      v_template.id,
      v_template.name,
      v_template.position,
      CASE WHEN v_template.is_start_phase THEN 'em_andamento' ELSE 'pendente' END,
      CASE WHEN v_template.is_start_phase THEN NOW() ELSE NULL END
    )
    RETURNING id INTO v_created_phase_id;

    -- Capturar a fase inicial pelo is_start_phase
    IF v_template.is_start_phase AND v_first_phase_id IS NULL THEN
      v_first_phase_id := v_created_phase_id;
    END IF;
  END LOOP;

  -- Fallback: se nenhuma fase tem is_start_phase = true, usar a de menor position
  IF v_first_phase_id IS NULL THEN
    SELECT id INTO v_first_phase_id 
    FROM production_phases 
    WHERE production_order_id = NEW.id 
    ORDER BY position 
    LIMIT 1;
    
    -- Marcar essa fase como em_andamento
    IF v_first_phase_id IS NOT NULL THEN
      UPDATE production_phases 
      SET status = 'em_andamento', started_at = NOW()
      WHERE id = v_first_phase_id;
    END IF;
  END IF;

  -- Atualizar a OP com a fase inicial
  IF v_first_phase_id IS NOT NULL THEN
    UPDATE production_orders SET current_phase_id = v_first_phase_id WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$function$;
