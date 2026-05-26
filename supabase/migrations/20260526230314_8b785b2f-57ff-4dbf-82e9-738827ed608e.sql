
-- Allow purchase orders in 'rascunho' without supplier
ALTER TABLE public.purchase_orders
  ALTER COLUMN supplier_id DROP NOT NULL;

-- RPC: convert an approved material_request into a draft purchase_order
CREATE OR REPLACE FUNCTION public.convert_material_request_to_po(_request_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

  -- Authorization: tenant admin OR owner
  IF NOT public.is_tenant_admin(v_req.tenant_id) THEN
    RAISE EXCEPTION 'Sem permissão para converter em pedido de compra';
  END IF;

  -- Idempotência: se já existe PO para essa solicitação, retorna o existente
  SELECT id INTO v_existing_po
    FROM public.purchase_orders
   WHERE request_id = _request_id
     AND tenant_id  = v_req.tenant_id
   LIMIT 1;

  IF v_existing_po IS NOT NULL THEN
    -- garante status consistente da solicitação
    UPDATE public.material_requests
       SET status = 'convertida_em_pedido', updated_at = now()
     WHERE id = _request_id
       AND status <> 'convertida_em_pedido';
    RETURN v_existing_po;
  END IF;

  IF v_req.status <> 'aprovada' THEN
    RAISE EXCEPTION 'Apenas solicitações aprovadas podem ser convertidas';
  END IF;

  -- Cria PO em rascunho
  INSERT INTO public.purchase_orders (
    tenant_id, status, issue_date, request_id, created_by,
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

  -- Copia o item (material_requests é por produto único)
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
$$;

REVOKE ALL ON FUNCTION public.convert_material_request_to_po(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.convert_material_request_to_po(uuid) TO authenticated;
