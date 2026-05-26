
-- ============================================================
-- PROPAGAÇÃO E2E — triggers idempotentes e tenant-safe
-- ============================================================

-- =========== 0. Colunas mínimas para idempotência ==========
ALTER TABLE public.crm_timeline
  ADD COLUMN IF NOT EXISTS source_history_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS uq_crm_timeline_source_history
  ON public.crm_timeline(source_history_id) WHERE source_history_id IS NOT NULL;

ALTER TABLE public.inv_stock_reservations
  ADD COLUMN IF NOT EXISTS source_order_item_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS uq_inv_reservation_source_order_item
  ON public.inv_stock_reservations(source_order_item_id) WHERE source_order_item_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_osc_order_chart_account
  ON public.order_strategic_commitments(order_id, chart_account_id);

-- ============================================================
-- 1. crm_timeline a partir de crm_deal_history
-- ============================================================
CREATE OR REPLACE FUNCTION public.propagate_deal_history_to_timeline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_msg text;
BEGIN
  v_msg := COALESCE(
    NEW.description,
    CASE
      WHEN NEW.action_type = 'stage_change' THEN 'Etapa alterada'
      WHEN NEW.field_name IS NOT NULL THEN
        'Campo "' || NEW.field_name || '" alterado de "' || COALESCE(NEW.old_value,'∅') || '" para "' || COALESCE(NEW.new_value,'∅') || '"'
      ELSE COALESCE(NEW.action_type, 'Atualização')
    END
  );

  INSERT INTO public.crm_timeline (deal_id, author_id, message, update_type, created_at, source_history_id)
  VALUES (
    NEW.deal_id,
    NEW.moved_by,
    v_msg,
    COALESCE(NEW.action_type, 'history'),
    COALESCE(NEW.moved_at, NEW.created_at, now()),
    NEW.id
  )
  ON CONFLICT (source_history_id) WHERE source_history_id IS NOT NULL DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_propagate_deal_history_to_timeline ON public.crm_deal_history;
CREATE TRIGGER trg_propagate_deal_history_to_timeline
  AFTER INSERT ON public.crm_deal_history
  FOR EACH ROW EXECUTE FUNCTION public.propagate_deal_history_to_timeline();

-- ============================================================
-- 2. cross_module_events quando pedido nasce 'ativo'
-- ============================================================
CREATE OR REPLACE FUNCTION public.emit_order_active_event_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('ativo','aprovado','approved') THEN
    -- Idempotência: só emite se ainda não há evento para esse pedido
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
        'pedido_ativo',
        'comercial',
        'financeiro',
        'orders',
        NEW.id,
        jsonb_build_object(
          'order_number', NEW.order_number,
          'total_value', NEW.valor_total,
          'client_id', NEW.client_id,
          'gerar_provisoes', true,
          'gerar_contas_receber_previstas', true,
          'gerar_custos_variaveis_previstos', true,
          'origin', 'insert_active'
        ),
        'pending',
        NEW.created_by
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_emit_order_active_event_on_insert ON public.orders;
CREATE TRIGGER trg_emit_order_active_event_on_insert
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.emit_order_active_event_on_insert();

-- ============================================================
-- 3. order_strategic_commitments automáticos
-- ============================================================
CREATE OR REPLACE FUNCTION public.auto_create_strategic_commitments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cfg record;
  v_total numeric;
BEGIN
  v_total := COALESCE(NEW.valor_total, 0);
  IF NEW.tenant_id IS NULL THEN
    RETURN NEW;
  END IF;

  FOR v_cfg IN
    SELECT chart_account_id, COALESCE(default_percentage, 0) AS pct
    FROM public.fin_strategic_resource_account_configs
    WHERE tenant_id = NEW.tenant_id
      AND active = true
      AND chart_account_id IS NOT NULL
      AND COALESCE(default_percentage, 0) > 0
  LOOP
    INSERT INTO public.order_strategic_commitments (
      tenant_id, order_id, chart_account_id, percentual, valor, habilitado
    ) VALUES (
      NEW.tenant_id,
      NEW.id,
      v_cfg.chart_account_id,
      v_cfg.pct,
      v_total * (v_cfg.pct / 100.0),
      true
    )
    ON CONFLICT (order_id, chart_account_id) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_create_strategic_commitments ON public.orders;
CREATE TRIGGER trg_auto_create_strategic_commitments
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_strategic_commitments();

-- ============================================================
-- 4. inv_stock_reservations quando pedido vira ativo/aprovado
-- ============================================================
CREATE OR REPLACE FUNCTION public.auto_reserve_stock_for_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item record;
BEGIN
  IF NEW.status NOT IN ('ativo','aprovado','approved') THEN
    RETURN NEW;
  END IF;
  IF NEW.tenant_id IS NULL THEN
    RETURN NEW;
  END IF;

  FOR v_item IN
    SELECT oi.id, oi.produto_id, oi.quantidade, p.location_id
    FROM public.order_items oi
    JOIN public.products p ON p.id = oi.produto_id
    WHERE oi.order_id = NEW.id
      AND oi.produto_id IS NOT NULL
      AND p.location_id IS NOT NULL  -- só se houver stock_location resolvível
  LOOP
    INSERT INTO public.inv_stock_reservations (
      tenant_id, product_id, project_id, quantity, status, source_order_item_id, notes
    ) VALUES (
      NEW.tenant_id,
      v_item.produto_id,
      NEW.project_id,
      v_item.quantidade,
      'active',
      v_item.id,
      'Reserva automática — Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text)
    )
    ON CONFLICT (source_order_item_id) WHERE source_order_item_id IS NOT NULL DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_reserve_stock_on_insert ON public.orders;
CREATE TRIGGER trg_auto_reserve_stock_on_insert
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.auto_reserve_stock_for_order();

DROP TRIGGER IF EXISTS trg_auto_reserve_stock_on_status ON public.orders;
CREATE TRIGGER trg_auto_reserve_stock_on_status
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  WHEN (NEW.status IN ('ativo','aprovado','approved') AND OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.auto_reserve_stock_for_order();

-- ============================================================
-- 5. delivery_orders + installation_orders ao faturar
-- ============================================================
CREATE OR REPLACE FUNCTION public.auto_create_fulfillment_on_invoice()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_endereco text;
  v_delivery_id uuid;
BEGIN
  IF NEW.status <> 'faturado' THEN RETURN NEW; END IF;
  IF OLD.status = 'faturado' THEN RETURN NEW; END IF;
  IF NEW.tenant_id IS NULL THEN RETURN NEW; END IF;

  v_endereco := NULLIF(trim(concat_ws(', ',
    NEW.entrega_logradouro,
    NEW.entrega_numero,
    NEW.entrega_bairro,
    NEW.entrega_cidade,
    NEW.entrega_uf
  )), '');

  -- Delivery (idempotente: só cria se não existir nenhum para o pedido)
  IF NOT EXISTS (SELECT 1 FROM public.delivery_orders WHERE order_id = NEW.id) THEN
    INSERT INTO public.delivery_orders (
      tenant_id, order_id, status, endereco, created_by
    ) VALUES (
      NEW.tenant_id, NEW.id, 'pendente', v_endereco, NEW.created_by
    ) RETURNING id INTO v_delivery_id;
  ELSE
    SELECT id INTO v_delivery_id FROM public.delivery_orders WHERE order_id = NEW.id LIMIT 1;
  END IF;

  -- Installation (idempotente)
  IF NOT EXISTS (SELECT 1 FROM public.installation_orders WHERE order_id = NEW.id) THEN
    INSERT INTO public.installation_orders (
      tenant_id, order_id, delivery_order_id, status, endereco, created_by
    ) VALUES (
      NEW.tenant_id, NEW.id, v_delivery_id, 'pendente', v_endereco, NEW.created_by
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_create_fulfillment_on_invoice ON public.orders;
CREATE TRIGGER trg_auto_create_fulfillment_on_invoice
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  WHEN (NEW.status = 'faturado' AND OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.auto_create_fulfillment_on_invoice();
