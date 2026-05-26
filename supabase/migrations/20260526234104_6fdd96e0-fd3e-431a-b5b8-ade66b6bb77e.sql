
ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS material_request_id uuid REFERENCES public.material_requests(id);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_material_request_id
  ON public.purchase_orders(material_request_id)
  WHERE material_request_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.convert_material_request_to_po(_request_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_req record;
  v_po_id uuid;
  v_existing_po uuid;
BEGIN
  IF _request_id IS NULL THEN
    RAISE EXCEPTION 'request_id obrigatório';
  END IF;

  SELECT * INTO v_req
    FROM public.material_requests
   WHERE id = _request_id
   FOR UPDATE;

  IF v_req IS NULL THEN
    RAISE EXCEPTION 'Solicitação não encontrada';
  END IF;

  IF v_req.tenant_id IS NULL THEN
    RAISE EXCEPTION 'Solicitação sem tenant';
  END IF;

  IF NOT public.is_tenant_admin(v_req.tenant_id) THEN
    RAISE EXCEPTION 'Sem permissão para converter em pedido de compra';
  END IF;

  -- Idempotência: usa material_request_id (FK correta)
  SELECT id INTO v_existing_po
    FROM public.purchase_orders
   WHERE material_request_id = _request_id
     AND tenant_id  = v_req.tenant_id
   LIMIT 1;

  IF v_existing_po IS NOT NULL THEN
    UPDATE public.material_requests
       SET status = 'convertida_em_pedido', updated_at = now()
     WHERE id = _request_id
       AND status <> 'convertida_em_pedido';
    RETURN v_existing_po;
  END IF;

  IF v_req.status <> 'aprovada' THEN
    RAISE EXCEPTION 'Apenas solicitações aprovadas podem ser convertidas';
  END IF;

  INSERT INTO public.purchase_orders (
    tenant_id, status, issue_date, material_request_id, created_by,
    subtotal, discount_value, shipping_cost, total, notes
  ) VALUES (
    v_req.tenant_id,
    'rascunho',
    now(),
    _request_id,
    auth.uid(),
    0, 0, 0, 0,
    'Gerado a partir da Solicitação de Material #' || v_req.request_number::text
  )
  RETURNING id INTO v_po_id;

  IF v_req.product_id IS NOT NULL THEN
    INSERT INTO public.purchase_order_items (
      purchase_order_id, product_id, quantity, unit_price, discount_percent, total, position
    ) VALUES (
      v_po_id, v_req.product_id, COALESCE(v_req.quantity, 0), 0, 0, 0, 1
    );
  END IF;

  UPDATE public.material_requests
     SET status = 'convertida_em_pedido',
         updated_at = now()
   WHERE id = _request_id;

  RETURN v_po_id;
END;
$function$;
