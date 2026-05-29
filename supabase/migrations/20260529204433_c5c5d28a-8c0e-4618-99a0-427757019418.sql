DO $$
DECLARE
  v_pt RECORD;
  v_phases TEXT[][] := ARRAY[
    ARRAY['Aguardando início','aguardando_inicio','#94a3b8','24'],
    ARRAY['Em produção','em_producao','#3b82f6','72'],
    ARRAY['Revisão / QA','revisao_qa','#f59e0b','24'],
    ARRAY['Pronto','pronto','#10b981','0']
  ];
  v_i INT;
BEGIN
  FOR v_pt IN
    SELECT pt.id, pt.tenant_id
    FROM public.production_types pt
    JOIN public.tenants t ON t.id = pt.tenant_id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.production_phase_templates ppt WHERE ppt.production_type_id = pt.id
    )
  LOOP
    FOR v_i IN 1..array_length(v_phases,1) LOOP
      INSERT INTO public.production_phase_templates
        (production_type_id, tenant_id, name, slug, color, position, sla_hours, is_start_phase, is_end_phase, active)
      VALUES (
        v_pt.id, v_pt.tenant_id,
        v_phases[v_i][1], v_phases[v_i][2], v_phases[v_i][3],
        v_i, v_phases[v_i][4]::int,
        v_i = 1, v_i = array_length(v_phases,1),
        true
      );
    END LOOP;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.seed_default_phase_templates_for_type()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_phases TEXT[][] := ARRAY[
    ARRAY['Aguardando início','aguardando_inicio','#94a3b8','24'],
    ARRAY['Em produção','em_producao','#3b82f6','72'],
    ARRAY['Revisão / QA','revisao_qa','#f59e0b','24'],
    ARRAY['Pronto','pronto','#10b981','0']
  ];
  v_i INT;
BEGIN
  IF NEW.tenant_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = NEW.tenant_id) THEN
    RETURN NEW;
  END IF;
  IF EXISTS (SELECT 1 FROM public.production_phase_templates WHERE production_type_id = NEW.id) THEN
    RETURN NEW;
  END IF;
  FOR v_i IN 1..array_length(v_phases,1) LOOP
    INSERT INTO public.production_phase_templates
      (production_type_id, tenant_id, name, slug, color, position, sla_hours, is_start_phase, is_end_phase, active)
    VALUES (
      NEW.id, NEW.tenant_id,
      v_phases[v_i][1], v_phases[v_i][2], v_phases[v_i][3],
      v_i, v_phases[v_i][4]::int,
      v_i = 1, v_i = array_length(v_phases,1),
      true
    );
  END LOOP;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_seed_phase_templates_on_type ON public.production_types;
CREATE TRIGGER trg_seed_phase_templates_on_type
AFTER INSERT ON public.production_types
FOR EACH ROW EXECUTE FUNCTION public.seed_default_phase_templates_for_type();

DO $$
DECLARE
  v_op RECORD;
  v_first UUID;
BEGIN
  FOR v_op IN
    SELECT po.id, po.production_type_id
    FROM public.production_orders po
    WHERE NOT EXISTS (SELECT 1 FROM public.production_phases pp WHERE pp.production_order_id = po.id)
      AND EXISTS (SELECT 1 FROM public.production_phase_templates ppt WHERE ppt.production_type_id = po.production_type_id)
  LOOP
    INSERT INTO public.production_phases (production_order_id, phase_template_id, status, position)
    SELECT v_op.id, ppt.id, 'pendente', ppt.position
    FROM public.production_phase_templates ppt
    WHERE ppt.production_type_id = v_op.production_type_id
    ORDER BY ppt.position;

    SELECT id INTO v_first FROM public.production_phases
    WHERE production_order_id = v_op.id ORDER BY position ASC LIMIT 1;

    IF v_first IS NOT NULL THEN
      UPDATE public.production_orders SET current_phase_id = v_first WHERE id = v_op.id AND current_phase_id IS NULL;
      UPDATE public.production_phases SET status='em_andamento', started_at=COALESCE(started_at, now()) WHERE id = v_first AND status='pendente';
    END IF;
  END LOOP;
END $$;