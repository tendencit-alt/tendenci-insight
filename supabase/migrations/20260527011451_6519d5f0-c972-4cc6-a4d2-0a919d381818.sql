
-- ============================================================================
-- Fix 1: create_receivable_from_order — fully idempotent, also creates RECEITA
--         ledger entry independently of receivable existence. Fires on any
--         transition into qualifying status set (rascunho->ativo, ativo->faturado, etc.)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_receivable_from_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ledger_id uuid;
  v_cost_center_id uuid;
  v_centro_custo_name text;
  v_chart_account_id uuid;
  v_competence date;
  v_qualifying boolean;
BEGIN
  v_qualifying := NEW.status IN ('ativo','faturado','em_producao','entregue','aprovado','approved');

  IF NOT v_qualifying THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.valor_total IS NULL OR NEW.valor_total <= 0 THEN
    RETURN NEW;
  END IF;

  -- Resolve cost center
  SELECT oi.centro_custo INTO v_centro_custo_name
  FROM public.order_items oi WHERE oi.order_id = NEW.id LIMIT 1;
  v_centro_custo_name := COALESCE(v_centro_custo_name, NEW.centro_custo);

  IF v_centro_custo_name IS NOT NULL THEN
    SELECT id INTO v_cost_center_id FROM public.fin_cost_centers
    WHERE tenant_id = NEW.tenant_id
      AND (LOWER(name) = LOWER(v_centro_custo_name)
        OR LOWER(name) = LOWER(CASE v_centro_custo_name
             WHEN 'moveis_planejados' THEN 'Planejados'
             WHEN 'producao_tendenci' THEN 'Produção Tendenci'
             WHEN 'revenda' THEN 'Revenda'
             ELSE v_centro_custo_name
           END))
    LIMIT 1;
  END IF;

  v_chart_account_id := COALESCE(
    NEW.chart_account_id,
    (SELECT id FROM public.fin_chart_accounts WHERE tenant_id = NEW.tenant_id AND code = '1.1' LIMIT 1),
    (SELECT id FROM public.fin_chart_accounts WHERE code = '1.1' LIMIT 1)
  );

  v_competence := COALESCE(NEW.data_emissao::date, now()::date);

  -- 1) Idempotently create RECEITA ledger entry (per pedido)
  SELECT id INTO v_ledger_id
  FROM public.fin_ledger_entries
  WHERE order_id = NEW.id AND type = 'RECEITA' AND tenant_id = NEW.tenant_id
  LIMIT 1;

  IF v_ledger_id IS NULL THEN
    INSERT INTO public.fin_ledger_entries (
      description, amount, type, competence_date, cash_date,
      document_number, party_id, party_type, status,
      cost_center_id, chart_account_id, tenant_id, order_id, client_id
    ) VALUES (
      'Pedido #' || NEW.order_number || ' - Receita',
      NEW.valor_total, 'RECEITA',
      v_competence, NULL,
      'PED-' || NEW.order_number, NEW.client_id, 'client', 'ABERTO',
      v_cost_center_id, v_chart_account_id,
      NEW.tenant_id, NEW.id, NEW.client_id
    )
    RETURNING id INTO v_ledger_id;
  END IF;

  -- 2) Idempotently create fin_receivable bound to the ledger
  IF NOT EXISTS (SELECT 1 FROM public.fin_receivables WHERE order_id = NEW.id AND tenant_id = NEW.tenant_id) THEN
    INSERT INTO public.fin_receivables (
      description, amount, due_date, competence_date, status, customer_id,
      order_id, document_number, ledger_entry_id, cost_center_id,
      chart_account_id, tenant_id
    ) VALUES (
      'Pedido #' || NEW.order_number,
      NEW.valor_total,
      COALESCE(NEW.data_primeiro_vencimento, v_competence),
      v_competence,
      'ABERTO', NEW.client_id, NEW.id,
      'PED-' || NEW.order_number, v_ledger_id, v_cost_center_id,
      v_chart_account_id, NEW.tenant_id
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- ============================================================================
-- Fix 2: Backfill production orders when pedido advances to active status,
--         using item.centro_custo OR order.centro_custo as fallback.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.backfill_production_orders_on_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_item RECORD;
  v_type uuid;
  v_op uuid;
  v_phase uuid;
  v_client text;
  v_cc text;
  v_slug text;
BEGIN
  IF NEW.status NOT IN ('ativo','aprovado','approved','em_producao','faturado') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_client FROM public.clients WHERE id = NEW.client_id;

  FOR v_item IN
    SELECT id, descricao, centro_custo
    FROM public.order_items
    WHERE order_id = NEW.id
      AND production_order_id IS NULL
  LOOP
    v_cc := COALESCE(NULLIF(trim(v_item.centro_custo),''), NULLIF(trim(NEW.centro_custo),''));
    IF v_cc IS NULL THEN CONTINUE; END IF;

    SELECT id INTO v_type FROM public.production_types
    WHERE tenant_id = NEW.tenant_id AND active = true
      AND (name = v_cc OR name ILIKE '%'||v_cc||'%' OR v_cc ILIKE '%'||name||'%')
    LIMIT 1;

    IF v_type IS NULL THEN
      v_slug := lower(regexp_replace(v_cc, '[^a-zA-Z0-9]+', '-', 'g'));
      INSERT INTO public.production_types (tenant_id, name, slug, active)
      VALUES (NEW.tenant_id, v_cc, v_slug, true)
      RETURNING id INTO v_type;
    END IF;

    INSERT INTO public.production_orders (
      order_id, order_item_id, production_type_id, client_id, title, status, priority, tenant_id
    ) VALUES (
      NEW.id, v_item.id, v_type, NEW.client_id,
      'Pedido #'||NEW.order_number||' - '||COALESCE(v_item.descricao, COALESCE(v_client,'Cliente')),
      'aguardando','normal', NEW.tenant_id
    ) RETURNING id INTO v_op;

    SELECT id INTO v_phase FROM public.production_phases
    WHERE production_order_id = v_op ORDER BY position ASC LIMIT 1;
    IF v_phase IS NOT NULL THEN
      UPDATE public.production_orders SET current_phase_id = v_phase WHERE id = v_op;
      UPDATE public.production_phases SET status='em_andamento', started_at=now() WHERE id = v_phase;
    END IF;

    UPDATE public.order_items SET production_order_id = v_op WHERE id = v_item.id;
  END LOOP;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_backfill_production_on_status ON public.orders;
CREATE TRIGGER trg_backfill_production_on_status
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.backfill_production_orders_on_status();

-- ============================================================================
-- Fix 3: Consolidate single operational_project per order.
--         on_order_status_change must NOT create a second project if one exists.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.on_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_op_id uuid;
BEGIN
  IF NEW.status = 'aprovado' AND OLD.status IS DISTINCT FROM 'aprovado' THEN
    PERFORM register_cross_module_event(
      'pedido_aprovado', 'comercial', 'financeiro',
      'orders', NEW.id, NULL, NULL,
      jsonb_build_object(
        'order_number', NEW.order_number,
        'total_value', NEW.valor_total,
        'gerar_provisoes', true,
        'gerar_contas_receber_previstas', true,
        'gerar_custos_variaveis_previstos', true
      )
    );

    -- Reuse existing operational_project if present, otherwise create one
    SELECT id INTO v_op_id
    FROM public.operational_projects
    WHERE order_id = NEW.id AND tenant_id = NEW.tenant_id
    LIMIT 1;

    IF v_op_id IS NULL THEN
      INSERT INTO public.operational_projects (
        tenant_id, name, client_id, order_id, responsible_id, status, created_by
      ) VALUES (
        NEW.tenant_id,
        'Projeto - Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text),
        NEW.client_id, NEW.id, NEW.vendedor_id,
        'aguardando_liberacao', auth.uid()
      ) RETURNING id INTO v_op_id;
    END IF;

    IF NEW.operational_project_id IS DISTINCT FROM v_op_id THEN
      UPDATE public.orders SET operational_project_id = v_op_id WHERE id = NEW.id;
    END IF;
  END IF;

  IF NEW.status = 'liberado_producao' AND OLD.status IS DISTINCT FROM 'liberado_producao' THEN
    UPDATE public.operational_projects
    SET status = 'em_producao', updated_at = now()
    WHERE order_id = NEW.id AND status = 'aguardando_liberacao';

    PERFORM register_cross_module_event(
      'pedido_liberado_producao', 'comercial', 'operacional',
      'orders', NEW.id, NULL, NULL,
      jsonb_build_object('order_number', NEW.order_number)
    );
  END IF;

  IF NEW.status = 'em_producao' AND OLD.status NOT IN ('em_producao', 'liberado_producao') THEN
    UPDATE public.operational_projects
    SET status = 'em_producao', updated_at = now()
    WHERE order_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$function$;

-- ============================================================================
-- Fix 4: Emit cross_module_events on rascunho -> ativo / aprovado UPDATE path
-- ============================================================================
CREATE OR REPLACE FUNCTION public.emit_order_active_event_on_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status IN ('ativo','aprovado','approved')
     AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.cross_module_events
      WHERE source_entity = 'orders'
        AND source_entity_id = NEW.id
        AND event_type IN ('pedido_aprovado','pedido_ativo')
    ) THEN
      INSERT INTO public.cross_module_events (
        tenant_id, event_type, source_module, target_module,
        source_entity, source_entity_id, payload, status, created_by
      ) VALUES (
        NEW.tenant_id,
        CASE WHEN NEW.status IN ('aprovado','approved') THEN 'pedido_aprovado' ELSE 'pedido_ativo' END,
        'comercial', 'financeiro',
        'orders', NEW.id,
        jsonb_build_object(
          'order_number', NEW.order_number,
          'total_value', NEW.valor_total,
          'client_id', NEW.client_id,
          'gerar_provisoes', true,
          'gerar_contas_receber_previstas', true,
          'gerar_custos_variaveis_previstos', true,
          'origin', 'status_update'
        ),
        'pending',
        COALESCE(NEW.created_by, auth.uid())
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_emit_order_active_event_on_status ON public.orders;
CREATE TRIGGER trg_emit_order_active_event_on_status
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.emit_order_active_event_on_status();
