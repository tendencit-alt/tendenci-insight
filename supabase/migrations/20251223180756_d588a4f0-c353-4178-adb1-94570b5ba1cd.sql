-- Adicionar coluna order_item_id na tabela production_orders
ALTER TABLE public.production_orders 
ADD COLUMN IF NOT EXISTS order_item_id UUID REFERENCES order_items(id) ON DELETE SET NULL;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_production_orders_order_item_id ON public.production_orders(order_item_id);

-- Dropar a função antiga e recriar com novos campos
DROP FUNCTION IF EXISTS orders_metrics(TEXT, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT);

-- Recriar função orders_metrics com status "ativo"
CREATE FUNCTION orders_metrics(
  p_status TEXT DEFAULT NULL,
  p_vendedor_id UUID DEFAULT NULL,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL,
  p_date_field TEXT DEFAULT 'data_emissao'
)
RETURNS TABLE (
  total_pedidos BIGINT,
  valor_total NUMERIC,
  ticket_medio NUMERIC,
  rascunho BIGINT,
  ativo BIGINT,
  aguardando_aprovacao BIGINT,
  aprovado BIGINT,
  em_producao BIGINT,
  faturado BIGINT,
  entregue BIGINT,
  cancelado BIGINT,
  valor_aprovado NUMERIC,
  valor_em_producao NUMERIC,
  valor_ativo NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_pedidos,
    COALESCE(SUM(o.valor_total), 0)::NUMERIC AS valor_total,
    CASE WHEN COUNT(*) > 0 THEN (COALESCE(SUM(o.valor_total), 0) / COUNT(*))::NUMERIC ELSE 0::NUMERIC END AS ticket_medio,
    COUNT(*) FILTER (WHERE o.status = 'rascunho')::BIGINT AS rascunho,
    COUNT(*) FILTER (WHERE o.status = 'ativo')::BIGINT AS ativo,
    COUNT(*) FILTER (WHERE o.status = 'aguardando_aprovacao')::BIGINT AS aguardando_aprovacao,
    COUNT(*) FILTER (WHERE o.status = 'aprovado')::BIGINT AS aprovado,
    COUNT(*) FILTER (WHERE o.status = 'em_producao')::BIGINT AS em_producao,
    COUNT(*) FILTER (WHERE o.status = 'faturado')::BIGINT AS faturado,
    COUNT(*) FILTER (WHERE o.status = 'entregue')::BIGINT AS entregue,
    COUNT(*) FILTER (WHERE o.status = 'cancelado')::BIGINT AS cancelado,
    COALESCE(SUM(o.valor_total) FILTER (WHERE o.status = 'aprovado'), 0)::NUMERIC AS valor_aprovado,
    COALESCE(SUM(o.valor_total) FILTER (WHERE o.status = 'em_producao'), 0)::NUMERIC AS valor_em_producao,
    COALESCE(SUM(o.valor_total) FILTER (WHERE o.status = 'ativo'), 0)::NUMERIC AS valor_ativo
  FROM orders o
  WHERE 
    (p_status IS NULL OR o.status = p_status)
    AND (p_vendedor_id IS NULL OR o.vendedor_id = p_vendedor_id)
    AND (
      p_date_from IS NULL OR (
        CASE 
          WHEN p_date_field = 'created_at' THEN o.created_at
          ELSE o.data_emissao
        END >= p_date_from
      )
    )
    AND (
      p_date_to IS NULL OR (
        CASE 
          WHEN p_date_field = 'created_at' THEN o.created_at
          ELSE o.data_emissao
        END <= p_date_to
      )
    );
END;
$$;