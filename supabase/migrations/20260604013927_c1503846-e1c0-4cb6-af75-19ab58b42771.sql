CREATE OR REPLACE FUNCTION public.create_production_from_order_item()
RETURNS TRIGGER AS $$
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

  SELECT id, status, order_number, client_id, tenant_id, data_entrega_prevista INTO v_order
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
    order_id, 
    order_item_id, 
    production_type_id, 
    client_id, 
    title, 
    status, 
    priority, 
    tenant_id,
    planned_end_date -- Adicionado para herdar o prazo do pedido
  ) VALUES (
    v_order.id, 
    NEW.id, 
    v_type, 
    v_order.client_id,
    'Pedido #'||v_order.order_number||' - '||COALESCE(NEW.descricao,COALESCE(v_client,'Cliente')),
    'aguardando',
    'normal', 
    v_order.tenant_id,
    v_order.data_entrega_prevista::timestamp with time zone -- Define o prazo da OP
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
$$ LANGUAGE plpgsql SET search_path = public;
