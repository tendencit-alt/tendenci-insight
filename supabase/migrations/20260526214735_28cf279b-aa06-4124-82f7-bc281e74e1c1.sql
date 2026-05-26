-- ============================================
-- FIX 1: trigger de produção por item (FK violation)
-- Era BEFORE INSERT mas referenciava order_items.id antes da row existir.
-- Reescrever como AFTER INSERT e atualizar production_order_id depois.
-- ============================================
DROP TRIGGER IF EXISTS trg_create_production_from_order_item ON public.order_items;

CREATE OR REPLACE FUNCTION public.create_production_from_order_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_type uuid;
  v_client text;
  v_new uuid;
  v_phase uuid;
  v_slug text;
BEGIN
  IF NEW.centro_custo IS NULL OR NEW.centro_custo = '' THEN RETURN NEW; END IF;
  IF NEW.production_order_id IS NOT NULL THEN RETURN NEW; END IF;

  SELECT id, status, order_number, client_id, tenant_id INTO v_order
  FROM public.orders WHERE id = NEW.order_id;
  IF v_order.id IS NULL THEN RETURN NEW; END IF;
  IF v_order.status NOT IN ('ativo','em_producao','aprovado','approved') THEN RETURN NEW; END IF;

  SELECT id INTO v_type FROM public.production_types
  WHERE tenant_id = v_order.tenant_id AND active = true AND (
    name = NEW.centro_custo OR name ILIKE '%'||NEW.centro_custo||'%' OR NEW.centro_custo ILIKE '%'||name||'%'
  ) LIMIT 1;

  IF v_type IS NULL THEN
    v_slug := lower(regexp_replace(NEW.centro_custo, '[^a-zA-Z0-9]+', '-', 'g'));
    INSERT INTO public.production_types (tenant_id, name, slug, active)
    VALUES (v_order.tenant_id, NEW.centro_custo, v_slug, true)
    RETURNING id INTO v_type;
  END IF;

  SELECT name INTO v_client FROM public.clients WHERE id = v_order.client_id;

  INSERT INTO public.production_orders (
    order_id, order_item_id, production_type_id, client_id, title, status, priority, tenant_id
  ) VALUES (
    v_order.id, NEW.id, v_type, v_order.client_id,
    'Pedido #'||v_order.order_number||' - '||COALESCE(NEW.descricao,COALESCE(v_client,'Cliente')),
    'aguardando','normal', v_order.tenant_id
  ) RETURNING id INTO v_new;

  SELECT id INTO v_phase FROM public.production_phases
  WHERE production_order_id = v_new ORDER BY position ASC LIMIT 1;
  IF v_phase IS NOT NULL THEN
    UPDATE public.production_orders SET current_phase_id = v_phase WHERE id = v_new;
    UPDATE public.production_phases SET status='em_andamento', started_at=now() WHERE id = v_phase;
  END IF;

  -- AFTER trigger: atualiza item já gravado
  UPDATE public.order_items SET production_order_id = v_new WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_create_production_from_order_item
AFTER INSERT ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.create_production_from_order_item();

-- ============================================
-- FIX 2: conectar create_order_commission_entries aos pedidos
-- Função existia mas sem trigger; também não passava tenant_id/order_id
-- (faria leak entre tenants via set_tenant_id sem auth.uid()).
-- ============================================
CREATE OR REPLACE FUNCTION public.create_order_commission_entries()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cost_center_id uuid;
  v_centro_custo_name text;
  v_chart_3_2 uuid;
  v_chart_3_1_1 uuid;
  v_chart_3_1_2 uuid;
BEGIN
  IF (
    (TG_OP = 'INSERT' AND NEW.status IN ('ativo', 'faturado', 'em_producao'))
    OR
    (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status
      AND NEW.status IN ('ativo', 'faturado', 'em_producao')
      AND (OLD.status NOT IN ('ativo', 'faturado', 'em_producao') OR OLD.status IS NULL))
  ) THEN
    IF EXISTS (
      SELECT 1 FROM public.fin_ledger_entries
      WHERE order_id = NEW.id AND type = 'DESPESA'
        AND description LIKE 'PED #' || NEW.order_number || ' -%'
    ) THEN
      RETURN NEW;
    END IF;

    SELECT oi.centro_custo INTO v_centro_custo_name
    FROM public.order_items oi WHERE oi.order_id = NEW.id LIMIT 1;
    IF v_centro_custo_name IS NULL THEN v_centro_custo_name := NEW.centro_custo; END IF;

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

    SELECT id INTO v_chart_3_2   FROM public.fin_chart_accounts WHERE code = '3.2'   AND tenant_id = NEW.tenant_id LIMIT 1;
    SELECT id INTO v_chart_3_1_1 FROM public.fin_chart_accounts WHERE code = '3.1.1' AND tenant_id = NEW.tenant_id LIMIT 1;
    SELECT id INTO v_chart_3_1_2 FROM public.fin_chart_accounts WHERE code = '3.1.2' AND tenant_id = NEW.tenant_id LIMIT 1;

    IF NEW.taxa_cartao_valor IS NOT NULL AND NEW.taxa_cartao_valor > 0 THEN
      INSERT INTO public.fin_ledger_entries (
        description, amount, type, competence_date, cash_date, status,
        cost_center_id, project_id, chart_account_id, tenant_id, order_id, client_id
      ) VALUES (
        'PED #' || NEW.order_number || ' - Taxa Cartão',
        NEW.taxa_cartao_valor, 'DESPESA',
        COALESCE(NEW.data_emissao::date, NOW()::date), NULL, 'ABERTO',
        v_cost_center_id, NEW.project_id, v_chart_3_2,
        NEW.tenant_id, NEW.id, NEW.client_id
      );
    END IF;

    IF NEW.taxa_boleto_valor IS NOT NULL AND NEW.taxa_boleto_valor > 0 THEN
      INSERT INTO public.fin_ledger_entries (
        description, amount, type, competence_date, cash_date, status,
        cost_center_id, project_id, chart_account_id, tenant_id, order_id, client_id
      ) VALUES (
        'PED #' || NEW.order_number || ' - Taxa Boleto',
        NEW.taxa_boleto_valor, 'DESPESA',
        COALESCE(NEW.data_emissao::date, NOW()::date), NULL, 'ABERTO',
        v_cost_center_id, NEW.project_id, v_chart_3_2,
        NEW.tenant_id, NEW.id, NEW.client_id
      );
    END IF;

    IF NEW.rt_valor IS NOT NULL AND NEW.rt_valor > 0 THEN
      INSERT INTO public.fin_ledger_entries (
        description, amount, type, competence_date, cash_date, status,
        cost_center_id, project_id, chart_account_id, tenant_id, order_id, client_id
      ) VALUES (
        'PED #' || NEW.order_number || ' - RT',
        NEW.rt_valor, 'DESPESA',
        COALESCE(NEW.data_emissao::date, NOW()::date), NULL, 'ABERTO',
        v_cost_center_id, NEW.project_id, v_chart_3_1_1,
        NEW.tenant_id, NEW.id, NEW.client_id
      );
    END IF;

    IF NEW.comissao_vendedor_valor IS NOT NULL AND NEW.comissao_vendedor_valor > 0 THEN
      INSERT INTO public.fin_ledger_entries (
        description, amount, type, competence_date, cash_date, status,
        cost_center_id, project_id, chart_account_id, tenant_id, order_id, client_id
      ) VALUES (
        'PED #' || NEW.order_number || ' - Comissão Vendedor',
        NEW.comissao_vendedor_valor, 'DESPESA',
        COALESCE(NEW.data_emissao::date, NOW()::date), NULL, 'ABERTO',
        v_cost_center_id, NEW.project_id, v_chart_3_1_2,
        NEW.tenant_id, NEW.id, NEW.client_id
      );
    END IF;

    IF NEW.comissao_orcamentista_valor IS NOT NULL AND NEW.comissao_orcamentista_valor > 0 THEN
      INSERT INTO public.fin_ledger_entries (
        description, amount, type, competence_date, cash_date, status,
        cost_center_id, project_id, chart_account_id, tenant_id, order_id, client_id
      ) VALUES (
        'PED #' || NEW.order_number || ' - Comissão Orçamentista',
        NEW.comissao_orcamentista_valor, 'DESPESA',
        COALESCE(NEW.data_emissao::date, NOW()::date), NULL, 'ABERTO',
        v_cost_center_id, NEW.project_id, v_chart_3_1_2,
        NEW.tenant_id, NEW.id, NEW.client_id
      );
    END IF;

    IF NEW.comissao_projetista_valor IS NOT NULL AND NEW.comissao_projetista_valor > 0 THEN
      INSERT INTO public.fin_ledger_entries (
        description, amount, type, competence_date, cash_date, status,
        cost_center_id, project_id, chart_account_id, tenant_id, order_id, client_id
      ) VALUES (
        'PED #' || NEW.order_number || ' - Comissão Projetista',
        NEW.comissao_projetista_valor, 'DESPESA',
        COALESCE(NEW.data_emissao::date, NOW()::date), NULL, 'ABERTO',
        v_cost_center_id, NEW.project_id, v_chart_3_1_2,
        NEW.tenant_id, NEW.id, NEW.client_id
      );
    END IF;

    IF NEW.comissao_montador_valor IS NOT NULL AND NEW.comissao_montador_valor > 0 THEN
      INSERT INTO public.fin_ledger_entries (
        description, amount, type, competence_date, cash_date, status,
        cost_center_id, project_id, chart_account_id, tenant_id, order_id, client_id
      ) VALUES (
        'PED #' || NEW.order_number || ' - Comissão Montador',
        NEW.comissao_montador_valor, 'DESPESA',
        COALESCE(NEW.data_emissao::date, NOW()::date), NULL, 'ABERTO',
        v_cost_center_id, NEW.project_id, v_chart_3_1_2,
        NEW.tenant_id, NEW.id, NEW.client_id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_order_commission_entries ON public.orders;
CREATE TRIGGER trg_create_order_commission_entries
AFTER INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.create_order_commission_entries();