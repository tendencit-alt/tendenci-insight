
-- 1. Atualizar set_tenant_id para não sobrescrever quando já definido
-- e não falhar quando auth.uid() é NULL (dentro de triggers SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.set_tenant_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se tenant_id já foi definido, manter
  IF NEW.tenant_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Tentar buscar tenant_id do usuário logado
  -- Em contexto de trigger SECURITY DEFINER, auth.uid() pode ser NULL
  IF auth.uid() IS NOT NULL THEN
    NEW.tenant_id := public.get_user_tenant_id();
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. Atualizar create_receivable_from_order para propagar tenant_id
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
BEGIN
  IF (
    (TG_OP = 'INSERT' AND NEW.status IN ('ativo', 'faturado', 'em_producao'))
    OR
    (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status
      AND NEW.status IN ('ativo', 'faturado', 'em_producao')
      AND (OLD.status NOT IN ('ativo', 'faturado', 'em_producao') OR OLD.status IS NULL))
  ) THEN
    IF EXISTS (SELECT 1 FROM public.fin_receivables WHERE order_id = NEW.id) THEN
      RETURN NEW;
    END IF;

    SELECT oi.centro_custo INTO v_centro_custo_name
    FROM public.order_items oi WHERE oi.order_id = NEW.id LIMIT 1;

    IF v_centro_custo_name IS NOT NULL THEN
      SELECT id INTO v_cost_center_id FROM public.fin_cost_centers
      WHERE LOWER(name) = LOWER(v_centro_custo_name)
         OR LOWER(name) = LOWER(
           CASE v_centro_custo_name
             WHEN 'moveis_planejados' THEN 'Planejados'
             WHEN 'producao_tendenci' THEN 'Produção Tendenci'
             WHEN 'revenda' THEN 'Revenda'
             ELSE v_centro_custo_name
           END
         )
      LIMIT 1;
    END IF;

    v_chart_account_id := COALESCE(
      NEW.chart_account_id,
      (SELECT id FROM public.fin_chart_accounts WHERE code = '1.1' LIMIT 1)
    );

    IF NEW.valor_total IS NOT NULL AND NEW.valor_total > 0 THEN
      INSERT INTO public.fin_ledger_entries (
        description, amount, type, competence_date, cash_date,
        document_number, party_id, party_type, status, notes, created_by,
        cost_center_id, project_id, chart_account_id, tenant_id
      ) VALUES (
        'Pedido #' || NEW.order_number || ' - Receita',
        NEW.valor_total, 'RECEITA',
        COALESCE(NEW.data_pedido, now()::date),
        COALESCE(NEW.data_pedido, now()::date),
        'PED-' || NEW.order_number, NEW.client_id, 'cliente',
        'A_RECEBER', NULL, NULL,
        v_cost_center_id, NULL, v_chart_account_id,
        NEW.tenant_id
      )
      RETURNING id INTO v_ledger_id;

      INSERT INTO public.fin_receivables (
        description, total_amount, due_date, status, client_id,
        order_id, document_number, ledger_entry_id, cost_center_id,
        chart_account_id, tenant_id
      ) VALUES (
        'Pedido #' || NEW.order_number,
        NEW.valor_total,
        COALESCE(NEW.data_pedido, now()::date),
        'ABERTO', NEW.client_id, NEW.id,
        'PED-' || NEW.order_number, v_ledger_id, v_cost_center_id,
        v_chart_account_id,
        NEW.tenant_id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- 3. Atualizar create_production_on_order_approval para propagar tenant_id
CREATE OR REPLACE FUNCTION public.create_production_on_order_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_production_type_id UUID;
  v_first_phase_id UUID;
  v_client_name TEXT;
  v_new_op_id UUID;
  v_item RECORD;
BEGIN
  IF NEW.status = 'ativo' AND (TG_OP = 'INSERT' OR OLD.status IS NULL OR OLD.status != 'ativo') THEN
    IF EXISTS (SELECT 1 FROM production_orders WHERE order_id = NEW.id) THEN
      RETURN NEW;
    END IF;

    SELECT name INTO v_client_name FROM clients WHERE id = NEW.client_id;

    FOR v_item IN
      SELECT id, descricao, centro_custo
      FROM order_items
      WHERE order_id = NEW.id AND centro_custo IS NOT NULL AND centro_custo != ''
    LOOP
      SELECT id INTO v_production_type_id
      FROM production_types
      WHERE active = true AND (
        name = v_item.centro_custo
        OR name ILIKE '%' || v_item.centro_custo || '%'
        OR v_item.centro_custo ILIKE '%' || name || '%'
      )
      LIMIT 1;

      IF v_production_type_id IS NULL THEN CONTINUE; END IF;

      INSERT INTO production_orders (
        order_id, order_item_id, production_type_id, client_id,
        title, status, priority, tenant_id
      )
      VALUES (
        NEW.id, v_item.id, v_production_type_id, NEW.client_id,
        'Pedido #' || NEW.order_number || ' - ' || COALESCE(v_item.descricao, COALESCE(v_client_name, 'Cliente')),
        'aguardando', 'normal', NEW.tenant_id
      )
      RETURNING id INTO v_new_op_id;

      SELECT id INTO v_first_phase_id
      FROM production_phases
      WHERE production_order_id = v_new_op_id
      ORDER BY position ASC
      LIMIT 1;

      IF v_first_phase_id IS NOT NULL THEN
        UPDATE production_orders SET current_phase_id = v_first_phase_id WHERE id = v_new_op_id;
        UPDATE production_phases SET status = 'em_andamento', started_at = now() WHERE id = v_first_phase_id;
      END IF;

      UPDATE order_items SET production_order_id = v_new_op_id WHERE id = v_item.id;
    END LOOP;

    IF EXISTS (SELECT 1 FROM production_orders WHERE order_id = NEW.id) THEN
      NEW.status := 'em_producao';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
