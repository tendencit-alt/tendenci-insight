
-- Desabilita gatilhos de proteção/parent durante a consolidação
ALTER TABLE public.fin_cost_centers DISABLE TRIGGER protect_cost_center_defaults;
ALTER TABLE public.fin_cost_centers DISABLE TRIGGER trg_block_delete_parent_cost_center;

CREATE TEMP TABLE cc_remap(old_id uuid PRIMARY KEY, new_id uuid) ON COMMIT DROP;

DO $$
DECLARE
  t_id uuid;
  v_prod uuid; v_com uuid; v_adm uuid; v_log uuid; v_man uuid; v_mkt uuid;
  target_ids uuid[];
BEGIN
  FOR t_id IN SELECT DISTINCT tenant_id FROM public.fin_cost_centers WHERE tenant_id IS NOT NULL LOOP

    -- Garante os 6 padrões planos por tenant (reusa por nome quando já existe)
    SELECT id INTO v_prod FROM public.fin_cost_centers
      WHERE tenant_id=t_id AND is_system_default=true AND name='Produção' LIMIT 1;
    IF v_prod IS NULL THEN
      INSERT INTO public.fin_cost_centers(tenant_id,code,name,active,is_system_default,parent_id)
      VALUES (t_id,'100','Produção',true,true,NULL) RETURNING id INTO v_prod;
    ELSE
      UPDATE public.fin_cost_centers SET code='100', name='Produção', parent_id=NULL, active=true, is_system_default=true WHERE id=v_prod;
    END IF;

    SELECT id INTO v_com FROM public.fin_cost_centers
      WHERE tenant_id=t_id AND is_system_default=true AND name='Comercial' LIMIT 1;
    IF v_com IS NULL THEN
      INSERT INTO public.fin_cost_centers(tenant_id,code,name,active,is_system_default,parent_id)
      VALUES (t_id,'200','Comercial',true,true,NULL) RETURNING id INTO v_com;
    ELSE
      UPDATE public.fin_cost_centers SET code='200', name='Comercial', parent_id=NULL, active=true, is_system_default=true WHERE id=v_com;
    END IF;

    SELECT id INTO v_adm FROM public.fin_cost_centers
      WHERE tenant_id=t_id AND is_system_default=true AND name='Administrativo' LIMIT 1;
    IF v_adm IS NULL THEN
      INSERT INTO public.fin_cost_centers(tenant_id,code,name,active,is_system_default,parent_id)
      VALUES (t_id,'300','Administrativo',true,true,NULL) RETURNING id INTO v_adm;
    ELSE
      UPDATE public.fin_cost_centers SET code='300', name='Administrativo', parent_id=NULL, active=true, is_system_default=true WHERE id=v_adm;
    END IF;

    SELECT id INTO v_log FROM public.fin_cost_centers
      WHERE tenant_id=t_id AND is_system_default=true AND name='Logística' LIMIT 1;
    IF v_log IS NULL THEN
      INSERT INTO public.fin_cost_centers(tenant_id,code,name,active,is_system_default,parent_id)
      VALUES (t_id,'400','Logística',true,true,NULL) RETURNING id INTO v_log;
    ELSE
      UPDATE public.fin_cost_centers SET code='400', name='Logística', parent_id=NULL, active=true, is_system_default=true WHERE id=v_log;
    END IF;

    SELECT id INTO v_man FROM public.fin_cost_centers
      WHERE tenant_id=t_id AND is_system_default=true AND name='Manutenção' LIMIT 1;
    IF v_man IS NULL THEN
      INSERT INTO public.fin_cost_centers(tenant_id,code,name,active,is_system_default,parent_id)
      VALUES (t_id,'500','Manutenção',true,true,NULL) RETURNING id INTO v_man;
    ELSE
      UPDATE public.fin_cost_centers SET code='500', name='Manutenção', parent_id=NULL, active=true, is_system_default=true WHERE id=v_man;
    END IF;

    SELECT id INTO v_mkt FROM public.fin_cost_centers
      WHERE tenant_id=t_id AND is_system_default=true AND name='Marketing' LIMIT 1;
    IF v_mkt IS NULL THEN
      INSERT INTO public.fin_cost_centers(tenant_id,code,name,active,is_system_default,parent_id)
      VALUES (t_id,'600','Marketing',true,true,NULL) RETURNING id INTO v_mkt;
    ELSE
      UPDATE public.fin_cost_centers SET code='600', name='Marketing', parent_id=NULL, active=true, is_system_default=true WHERE id=v_mkt;
    END IF;

    target_ids := ARRAY[v_prod,v_com,v_adm,v_log,v_man,v_mkt];

    -- Mapeia centros system-default antigos -> novo correspondente por categoria
    DELETE FROM cc_remap;
    INSERT INTO cc_remap(old_id, new_id)
    SELECT c.id,
      CASE
        WHEN c.name ILIKE 'Produção%'      THEN v_prod
        WHEN c.name ILIKE 'Comercial%'     THEN v_com
        WHEN c.name ILIKE 'Administrativo%' THEN v_adm
        WHEN c.name ILIKE 'Logística%'     THEN v_log
        WHEN c.name ILIKE 'Manutenção%'    THEN v_man
        WHEN c.name ILIKE 'Marketing%'     THEN v_mkt
        ELSE v_adm
      END
    FROM public.fin_cost_centers c
    WHERE c.tenant_id=t_id AND c.is_system_default=true AND c.id <> ALL(target_ids);

    -- Remapeia todas as FKs conhecidas
    UPDATE public.fin_budgets b               SET cost_center_id=r.new_id FROM cc_remap r WHERE b.cost_center_id=r.old_id;
    UPDATE public.fin_reconciliation_rules b  SET cost_center_id=r.new_id FROM cc_remap r WHERE b.cost_center_id=r.old_id;
    UPDATE public.fin_financial_goals b       SET cost_center_id=r.new_id FROM cc_remap r WHERE b.cost_center_id=r.old_id;
    UPDATE public.fin_ledger_entries b        SET cost_center_id=r.new_id FROM cc_remap r WHERE b.cost_center_id=r.old_id;
    UPDATE public.fin_projects b              SET cost_center_id=r.new_id FROM cc_remap r WHERE b.cost_center_id=r.old_id;
    UPDATE public.fin_payables b              SET cost_center_id=r.new_id FROM cc_remap r WHERE b.cost_center_id=r.old_id;
    UPDATE public.fin_receivables b           SET cost_center_id=r.new_id FROM cc_remap r WHERE b.cost_center_id=r.old_id;
    UPDATE public.fin_ledger_splits b         SET cost_center_id=r.new_id FROM cc_remap r WHERE b.cost_center_id=r.old_id;
    UPDATE public.fin_classification_rules b  SET cost_center_id=r.new_id FROM cc_remap r WHERE b.cost_center_id=r.old_id;
    UPDATE public.fin_classification_history b SET cost_center_id=r.new_id FROM cc_remap r WHERE b.cost_center_id=r.old_id;
    UPDATE public.fin_forecasts b             SET cost_center_id=r.new_id FROM cc_remap r WHERE b.cost_center_id=r.old_id;
    UPDATE public.fin_bank_transactions b     SET suggested_cost_center_id=r.new_id FROM cc_remap r WHERE b.suggested_cost_center_id=r.old_id;
    UPDATE public.fin_event_automation_rules b SET cost_center_id=r.new_id FROM cc_remap r WHERE b.cost_center_id=r.old_id;
    UPDATE public.fin_recurring_contracts b   SET cost_center_id=r.new_id FROM cc_remap r WHERE b.cost_center_id=r.old_id;
    UPDATE public.fin_assets b                SET cost_center_id=r.new_id FROM cc_remap r WHERE b.cost_center_id=r.old_id;
    UPDATE public.operational_projects b      SET cost_center_id=r.new_id FROM cc_remap r WHERE b.cost_center_id=r.old_id;
    UPDATE public.fin_forecast_entries b      SET cost_center_id=r.new_id FROM cc_remap r WHERE b.cost_center_id=r.old_id;
    UPDATE public.hr_departments b            SET cost_center_id=r.new_id FROM cc_remap r WHERE b.cost_center_id=r.old_id;
    UPDATE public.hr_labor_allocations b      SET cost_center_id=r.new_id FROM cc_remap r WHERE b.cost_center_id=r.old_id;
    UPDATE public.ops_orders b                SET cost_center_id=r.new_id FROM cc_remap r WHERE b.cost_center_id=r.old_id;
    UPDATE public.prj_projects b              SET cost_center_id=r.new_id FROM cc_remap r WHERE b.cost_center_id=r.old_id;
    UPDATE public.sup_requests b              SET cost_center_id=r.new_id FROM cc_remap r WHERE b.cost_center_id=r.old_id;
    UPDATE public.purchase_orders b           SET cost_center_id=r.new_id FROM cc_remap r WHERE b.cost_center_id=r.old_id;
    UPDATE public.plan_goals b                SET cost_center_id=r.new_id FROM cc_remap r WHERE b.cost_center_id=r.old_id;
    UPDATE public.plan_budgets b              SET cost_center_id=r.new_id FROM cc_remap r WHERE b.cost_center_id=r.old_id;

    -- Limpa parent_id antes de excluir os antigos (qualquer filho que apontava para eles)
    UPDATE public.fin_cost_centers SET parent_id=NULL WHERE parent_id IN (SELECT old_id FROM cc_remap);
    UPDATE public.fin_cost_centers SET parent_id=NULL WHERE id IN (SELECT old_id FROM cc_remap);

    -- Remove os antigos system-default
    DELETE FROM public.fin_cost_centers WHERE id IN (SELECT old_id FROM cc_remap);

  END LOOP;

  -- Garante lista plana em todos os padrões
  UPDATE public.fin_cost_centers SET parent_id=NULL WHERE is_system_default=true AND parent_id IS NOT NULL;
END $$;

-- Reabilita gatilhos
ALTER TABLE public.fin_cost_centers ENABLE TRIGGER protect_cost_center_defaults;
ALTER TABLE public.fin_cost_centers ENABLE TRIGGER trg_block_delete_parent_cost_center;

-- Atualiza a função de seed para novos tenants (lista plana de 6)
CREATE OR REPLACE FUNCTION public.seed_default_cost_centers(_tenant_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer := 0;
  r record;
BEGIN
  IF _tenant_id IS NULL THEN
    RETURN 0;
  END IF;

  FOR r IN SELECT * FROM (VALUES
    ('100','Produção'),
    ('200','Comercial'),
    ('300','Administrativo'),
    ('400','Logística'),
    ('500','Manutenção'),
    ('600','Marketing')
  ) AS t(code, name)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.fin_cost_centers
      WHERE tenant_id=_tenant_id AND is_system_default=true AND name=r.name
    ) THEN
      INSERT INTO public.fin_cost_centers(tenant_id, code, name, active, is_system_default, parent_id)
      VALUES (_tenant_id, r.code, r.name, true, true, NULL);
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$function$;
