-- PARTE 1: Corrigir função de criação de fases para criar TODAS as fases
CREATE OR REPLACE FUNCTION public.create_production_phases_on_op_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_phase_template RECORD;
  v_new_phase_id uuid;
  v_first_phase_id uuid := NULL;
  v_is_first boolean := true;
BEGIN
  IF NEW.production_type_id IS NOT NULL AND NEW.current_phase_id IS NULL THEN
    -- Criar TODAS as fases do tipo de produção
    FOR v_phase_template IN
      SELECT id, name, position, sla_dias_uteis
      FROM production_phase_templates
      WHERE production_type_id = NEW.production_type_id
        AND active = true
      ORDER BY position ASC
    LOOP
      INSERT INTO production_phases (
        production_order_id,
        phase_template_id,
        status,
        position,
        started_at,
        sla_dias_uteis_custom
      ) VALUES (
        NEW.id,
        v_phase_template.id,
        CASE WHEN v_is_first THEN 'em_andamento' ELSE 'pendente' END,
        v_phase_template.position,
        CASE WHEN v_is_first THEN NOW() ELSE NULL END,
        v_phase_template.sla_dias_uteis
      )
      RETURNING id INTO v_new_phase_id;
      
      IF v_is_first THEN
        v_first_phase_id := v_new_phase_id;
        v_is_first := false;
      END IF;
    END LOOP;
    
    -- Atualizar current_phase_id para primeira fase
    IF v_first_phase_id IS NOT NULL THEN
      UPDATE production_orders 
      SET current_phase_id = v_first_phase_id
      WHERE id = NEW.id;
    END IF;
  END IF;
  
  -- Calcular prazo se não definido
  IF NEW.planned_end_date IS NULL AND NEW.production_type_id IS NOT NULL THEN
    UPDATE production_orders 
    SET planned_end_date = calculate_production_deadline(NEW.production_type_id, NEW.created_at)
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- PARTE 2.1: Remover fases duplicadas (manter apenas a mais antiga por template)
WITH duplicates AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY production_order_id, phase_template_id 
    ORDER BY created_at
  ) as rn
  FROM production_phases
)
DELETE FROM production_phases
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- PARTE 2.2: Inserir fases faltantes para cada OP
INSERT INTO production_phases (
  production_order_id,
  phase_template_id,
  status,
  position,
  sla_dias_uteis_custom
)
SELECT 
  po.id,
  ppt.id,
  CASE 
    WHEN ppt.position = 1 THEN 'em_andamento'
    ELSE 'pendente'
  END,
  ppt.position,
  ppt.sla_dias_uteis
FROM production_orders po
CROSS JOIN production_phase_templates ppt
WHERE ppt.production_type_id = po.production_type_id
  AND ppt.active = true
  AND NOT EXISTS (
    SELECT 1 FROM production_phases pp 
    WHERE pp.production_order_id = po.id 
      AND pp.phase_template_id = ppt.id
  );

-- PARTE 2.3: Corrigir position e SLA das fases existentes
UPDATE production_phases pp
SET 
  position = ppt.position,
  sla_dias_uteis_custom = COALESCE(pp.sla_dias_uteis_custom, ppt.sla_dias_uteis)
FROM production_phase_templates ppt
WHERE pp.phase_template_id = ppt.id
  AND (pp.position IS NULL OR pp.position = 0 OR pp.position != ppt.position OR pp.sla_dias_uteis_custom IS NULL);

-- PARTE 3: Adicionar constraint para prevenir duplicatas futuras
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_phase_per_order_template'
  ) THEN
    ALTER TABLE production_phases 
    ADD CONSTRAINT unique_phase_per_order_template 
    UNIQUE (production_order_id, phase_template_id);
  END IF;
EXCEPTION WHEN others THEN
  -- Ignora se já existe ou se há duplicatas
  RAISE NOTICE 'Constraint já existe ou há duplicatas restantes';
END $$;