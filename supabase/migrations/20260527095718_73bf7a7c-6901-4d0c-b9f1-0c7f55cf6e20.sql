
ALTER TABLE public.fin_strategic_resource_account_configs
  ADD COLUMN IF NOT EXISTS cost_center_id uuid REFERENCES public.fin_cost_centers(id) ON DELETE SET NULL;

-- Backfill cost_center_id = Comercial do tenant
UPDATE public.fin_strategic_resource_account_configs c
SET cost_center_id = cc.id
FROM public.fin_cost_centers cc
WHERE c.tenant_id IS NOT NULL
  AND c.cost_center_id IS NULL
  AND cc.tenant_id = c.tenant_id
  AND LOWER(cc.name) = 'comercial'
  AND cc.active = true;

-- Helper upsert sem precisar de unique parcial
CREATE OR REPLACE FUNCTION public._upsert_strategic_config(
  _tenant_id uuid, _chart_account_id uuid, _active boolean,
  _pct numeric, _cc_id uuid, _display_name text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.fin_strategic_resource_account_configs
    WHERE tenant_id = _tenant_id AND chart_account_id = _chart_account_id
  ) THEN
    UPDATE public.fin_strategic_resource_account_configs
       SET active = _active,
           default_percentage = _pct,
           cost_center_id = COALESCE(cost_center_id, _cc_id),
           display_name = COALESCE(display_name, _display_name),
           updated_at = now()
     WHERE tenant_id = _tenant_id AND chart_account_id = _chart_account_id;
  ELSE
    INSERT INTO public.fin_strategic_resource_account_configs
      (tenant_id, chart_account_id, active, default_percentage, cost_center_id, display_name)
    VALUES (_tenant_id, _chart_account_id, _active, _pct, _cc_id, _display_name);
  END IF;
END $$;

-- Seed Owner master config se faltar
DO $$
DECLARE
  v_owner uuid := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid;
  v_cc uuid; r record;
BEGIN
  SELECT id INTO v_cc FROM public.fin_cost_centers
    WHERE tenant_id = v_owner AND LOWER(name)='comercial' AND active=true LIMIT 1;
  FOR r IN
    SELECT id, code, name FROM public.fin_chart_accounts
    WHERE tenant_id = v_owner AND code LIKE '2.2.%' AND code <> '2.2' AND active = true
    ORDER BY code
  LOOP
    PERFORM public._upsert_strategic_config(v_owner, r.id, true, 1.00, v_cc, r.name);
  END LOOP;
END $$;

-- Mirror function
CREATE OR REPLACE FUNCTION public.mirror_owner_strategic_configs_to_tenant(_tenant_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid;
  v_cc uuid; v_count integer := 0; r record; v_local uuid;
BEGIN
  IF _tenant_id IS NULL OR _tenant_id = v_owner THEN RETURN 0; END IF;
  SELECT id INTO v_cc FROM public.fin_cost_centers
    WHERE tenant_id = _tenant_id AND LOWER(name)='comercial' AND active=true LIMIT 1;
  FOR r IN
    SELECT oc.code, oc.name, sc.active, sc.default_percentage
    FROM public.fin_chart_accounts oc
    JOIN public.fin_strategic_resource_account_configs sc
      ON sc.chart_account_id = oc.id AND sc.tenant_id = v_owner
    WHERE oc.tenant_id = v_owner AND oc.code LIKE '2.2.%' AND oc.code <> '2.2'
  LOOP
    SELECT id INTO v_local FROM public.fin_chart_accounts
      WHERE tenant_id = _tenant_id AND code = r.code AND active = true LIMIT 1;
    IF v_local IS NULL THEN CONTINUE; END IF;
    PERFORM public._upsert_strategic_config(_tenant_id, v_local, COALESCE(r.active,true), COALESCE(r.default_percentage,0), v_cc, r.name);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END $$;

-- Espelha para tenants existentes
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.tenants WHERE id <> 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid LOOP
    PERFORM public.mirror_owner_strategic_configs_to_tenant(r.id);
  END LOOP;
END $$;

-- Estende seed para tenant novo
CREATE OR REPLACE FUNCTION public.trg_seed_tenant_defaults()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.seed_default_cost_centers(NEW.id);
  PERFORM public.seed_chart_of_accounts_from_owner(NEW.id);
  PERFORM public.mirror_owner_strategic_configs_to_tenant(NEW.id);
  RETURN NEW;
END $$;

-- Idempotência para payables vindos de compromissos
CREATE UNIQUE INDEX IF NOT EXISTS uq_fin_payables_compromisso_doc
  ON public.fin_payables(document_number)
  WHERE origem = 'order_strategic_commitment';

-- Atualiza sync para também gerar a Conta a Pagar (sem duplicar DRE)
CREATE OR REPLACE FUNCTION public.sync_strategic_commitment_ledger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order RECORD;
  v_cost_center_id uuid;
  v_centro_custo_name text;
  v_account_name text;
  v_doc text;
  v_ledger_id uuid;
  v_cfg_cc_id uuid;
  v_due date;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.fin_payables
      WHERE document_number = 'COMP-' || OLD.id::text
        AND origem = 'order_strategic_commitment'
        AND COALESCE(status,'ABERTO') = 'ABERTO';
    DELETE FROM public.fin_ledger_entries
      WHERE document_number = 'COMP-' || OLD.id::text
        AND status IN ('ABERTO','PROVISIONADO');
    RETURN OLD;
  END IF;

  v_doc := 'COMP-' || NEW.id::text;

  SELECT id, status, order_number, data_emissao, project_id, client_id, centro_custo, tenant_id
    INTO v_order FROM public.orders WHERE id = NEW.order_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  IF NOT COALESCE(NEW.habilitado, false) OR COALESCE(NEW.valor, 0) <= 0 THEN
    DELETE FROM public.fin_payables
      WHERE document_number = v_doc AND origem = 'order_strategic_commitment'
        AND COALESCE(status,'ABERTO') = 'ABERTO';
    DELETE FROM public.fin_ledger_entries
      WHERE document_number = v_doc AND status IN ('ABERTO','PROVISIONADO');
    RETURN NEW;
  END IF;

  IF v_order.status::text NOT IN ('ativo','aprovado','faturado','em_producao') THEN
    RETURN NEW;
  END IF;

  SELECT oi.centro_custo INTO v_centro_custo_name
    FROM public.order_items oi WHERE oi.order_id = v_order.id LIMIT 1;
  IF v_centro_custo_name IS NULL THEN v_centro_custo_name := v_order.centro_custo; END IF;
  IF v_centro_custo_name IS NOT NULL THEN
    SELECT id INTO v_cost_center_id FROM public.fin_cost_centers
    WHERE tenant_id = NEW.tenant_id
      AND (LOWER(name) = LOWER(v_centro_custo_name)
        OR LOWER(name) = LOWER(CASE v_centro_custo_name
            WHEN 'moveis_planejados' THEN 'Planejados'
            WHEN 'producao_tendenci' THEN 'Produção Tendenci'
            WHEN 'revenda' THEN 'Revenda'
            ELSE v_centro_custo_name END))
    LIMIT 1;
  END IF;

  SELECT name INTO v_account_name FROM public.fin_chart_accounts WHERE id = NEW.chart_account_id;

  SELECT cost_center_id INTO v_cfg_cc_id
    FROM public.fin_strategic_resource_account_configs
   WHERE tenant_id = NEW.tenant_id AND chart_account_id = NEW.chart_account_id LIMIT 1;
  IF v_cfg_cc_id IS NULL THEN
    SELECT id INTO v_cfg_cc_id FROM public.fin_cost_centers
      WHERE tenant_id = NEW.tenant_id AND LOWER(name)='comercial' AND active=true LIMIT 1;
  END IF;

  IF EXISTS (SELECT 1 FROM public.fin_ledger_entries WHERE document_number = v_doc) THEN
    UPDATE public.fin_ledger_entries
    SET amount = NEW.valor,
        description = 'PED #' || v_order.order_number || ' - ' || COALESCE(v_account_name, 'Compromisso'),
        chart_account_id = NEW.chart_account_id,
        cost_center_id = v_cost_center_id,
        project_id = v_order.project_id,
        client_id = v_order.client_id,
        competence_date = COALESCE(v_order.data_emissao::date, NOW()::date),
        updated_at = now()
    WHERE document_number = v_doc AND status IN ('ABERTO','PROVISIONADO')
    RETURNING id INTO v_ledger_id;
  ELSE
    INSERT INTO public.fin_ledger_entries (
      description, amount, type, competence_date, cash_date, status,
      cost_center_id, project_id, chart_account_id, tenant_id,
      order_id, client_id, document_number, origem
    ) VALUES (
      'PED #' || v_order.order_number || ' - ' || COALESCE(v_account_name, 'Compromisso'),
      NEW.valor, 'DESPESA',
      COALESCE(v_order.data_emissao::date, NOW()::date), NULL, 'ABERTO',
      v_cost_center_id, v_order.project_id, NEW.chart_account_id, NEW.tenant_id,
      v_order.id, v_order.client_id, v_doc, 'order_strategic_commitment'
    ) RETURNING id INTO v_ledger_id;
  END IF;

  v_due := COALESCE(v_order.data_emissao::date, NOW()::date) + INTERVAL '30 days';

  IF EXISTS (SELECT 1 FROM public.fin_payables WHERE document_number = v_doc AND origem='order_strategic_commitment') THEN
    UPDATE public.fin_payables
       SET amount = NEW.valor,
           chart_account_id = NEW.chart_account_id,
           cost_center_id = v_cfg_cc_id,
           project_id = v_order.project_id,
           description = 'PED #' || v_order.order_number || ' - ' || COALESCE(v_account_name, 'Compromisso'),
           tenant_id = NEW.tenant_id,
           order_id = v_order.id,
           ledger_entry_id = v_ledger_id,
           updated_at = now()
     WHERE document_number = v_doc
       AND origem = 'order_strategic_commitment'
       AND COALESCE(status,'ABERTO') = 'ABERTO';
  ELSE
    INSERT INTO public.fin_payables (
      amount, due_date, competence_date, status, chart_account_id, cost_center_id,
      project_id, description, document_number, tenant_id, order_id,
      ledger_entry_id, origem
    ) VALUES (
      NEW.valor, v_due, COALESCE(v_order.data_emissao::date, NOW()::date), 'ABERTO',
      NEW.chart_account_id, v_cfg_cc_id, v_order.project_id,
      'PED #' || v_order.order_number || ' - ' || COALESCE(v_account_name, 'Compromisso'),
      v_doc, NEW.tenant_id, v_order.id, v_ledger_id, 'order_strategic_commitment'
    );
  END IF;

  RETURN NEW;
END $$;

-- Backfill payables para compromissos já existentes
DO $$
DECLARE r record; v_due date; v_acct_name text; v_cfg_cc uuid; v_ledger_id uuid; v_doc text;
BEGIN
  FOR r IN
    SELECT osc.*, o.order_number, o.data_emissao, o.project_id
    FROM public.order_strategic_commitments osc
    JOIN public.orders o ON o.id = osc.order_id
    WHERE COALESCE(osc.habilitado,false) = true
      AND COALESCE(osc.valor,0) > 0
      AND o.status::text IN ('ativo','aprovado','faturado','em_producao','entregue','concluido')
  LOOP
    v_doc := 'COMP-' || r.id::text;
    IF EXISTS (SELECT 1 FROM public.fin_payables WHERE document_number = v_doc AND origem='order_strategic_commitment') THEN
      CONTINUE;
    END IF;
    SELECT name INTO v_acct_name FROM public.fin_chart_accounts WHERE id = r.chart_account_id;
    SELECT cost_center_id INTO v_cfg_cc
      FROM public.fin_strategic_resource_account_configs
      WHERE tenant_id = r.tenant_id AND chart_account_id = r.chart_account_id LIMIT 1;
    IF v_cfg_cc IS NULL THEN
      SELECT id INTO v_cfg_cc FROM public.fin_cost_centers
        WHERE tenant_id = r.tenant_id AND LOWER(name)='comercial' AND active=true LIMIT 1;
    END IF;
    SELECT id INTO v_ledger_id FROM public.fin_ledger_entries WHERE document_number = v_doc LIMIT 1;
    v_due := COALESCE(r.data_emissao::date, NOW()::date) + INTERVAL '30 days';
    INSERT INTO public.fin_payables (
      amount, due_date, competence_date, status, chart_account_id, cost_center_id,
      project_id, description, document_number, tenant_id, order_id, ledger_entry_id, origem
    ) VALUES (
      r.valor, v_due, COALESCE(r.data_emissao::date, NOW()::date), 'ABERTO',
      r.chart_account_id, v_cfg_cc, r.project_id,
      'PED #' || r.order_number || ' - ' || COALESCE(v_acct_name,'Compromisso'),
      v_doc, r.tenant_id, r.order_id, v_ledger_id, 'order_strategic_commitment'
    );
  END LOOP;
END $$;
