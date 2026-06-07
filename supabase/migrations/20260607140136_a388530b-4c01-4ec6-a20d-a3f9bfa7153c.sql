-- PART 1: drop legacy duplicate seed trigger + function (0 dependencies verified)
DROP TRIGGER IF EXISTS trg_seed_psc_on_tenant ON public.tenants;
DROP FUNCTION IF EXISTS public.seed_production_status_columns();

-- PART 2: recreate universal seed with audit_log entry, preserve idempotency + SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.seed_default_production_status_columns(_tenant_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_existing integer;
BEGIN
  SELECT COUNT(*) INTO v_existing
  FROM public.production_status_columns
  WHERE tenant_id = _tenant_id;

  IF v_existing > 0 THEN
    RETURN 0;
  END IF;

  INSERT INTO public.production_status_columns
    (tenant_id, slug, label, color, sort_order, sla_days, duration_days, sla_unit, is_system, is_seed_default)
  VALUES
    (_tenant_id, 'aguardando',   'Aguardando',   'slate',  1, 1, 1, 'days', false, true),
    (_tenant_id, 'planejamento', 'Planejamento', 'sky',    2, 2, 2, 'days', false, true),
    (_tenant_id, 'em_producao',  'Em Produção',  'orange', 3, 5, 5, 'days', false, true),
    (_tenant_id, 'em_revisao',   'Em Revisão',   'violet', 4, 2, 2, 'days', false, true),
    (_tenant_id, 'finalizacao',  'Finalização',  'yellow', 5, 2, 2, 'days', false, true),
    (_tenant_id, 'concluido',    'Concluído',    'green',  6, 1, 1, 'days', false, true);

  -- Audit trail (best-effort; do not fail the seed if audit insert fails)
  BEGIN
    INSERT INTO public.audit_log
      (tenant_id, table_name, event_type, event_source, metadata, created_at)
    VALUES
      (_tenant_id,
       'production_status_columns',
       'seed_default_phases_universal_v1',
       'trigger_or_manual',
       jsonb_build_object(
         'count', 6,
         'phases_inserted', ARRAY['Aguardando','Planejamento','Em Produção','Em Revisão','Finalização','Concluído']
       ),
       now());
  EXCEPTION WHEN OTHERS THEN
    -- swallow audit errors to keep seed resilient
    NULL;
  END;

  RETURN 6;
END;
$function$;