
-- Atualizar RPC orders_metrics para aceitar parâmetro de tipo de data
CREATE OR REPLACE FUNCTION public.orders_metrics(
  p_status text DEFAULT NULL,
  p_vendedor_id uuid DEFAULT NULL,
  p_date_from timestamp with time zone DEFAULT NULL,
  p_date_to timestamp with time zone DEFAULT NULL,
  p_date_field text DEFAULT 'data_emissao' -- 'data_emissao' ou 'created_at'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'total_pedidos', COUNT(*),
    'valor_total', COALESCE(SUM(valor_total), 0),
    'ticket_medio', CASE WHEN COUNT(*) > 0 THEN COALESCE(SUM(valor_total), 0) / COUNT(*) ELSE 0 END,
    'rascunho', COUNT(*) FILTER (WHERE status = 'rascunho'),
    'aguardando_aprovacao', COUNT(*) FILTER (WHERE status = 'aguardando_aprovacao'),
    'aprovado', COUNT(*) FILTER (WHERE status = 'aprovado'),
    'em_producao', COUNT(*) FILTER (WHERE status = 'em_producao'),
    'faturado', COUNT(*) FILTER (WHERE status = 'faturado'),
    'entregue', COUNT(*) FILTER (WHERE status = 'entregue'),
    'cancelado', COUNT(*) FILTER (WHERE status = 'cancelado'),
    'valor_aprovado', COALESCE(SUM(valor_total) FILTER (WHERE status = 'aprovado'), 0),
    'valor_em_producao', COALESCE(SUM(valor_total) FILTER (WHERE status = 'em_producao'), 0)
  ) INTO result
  FROM orders o
  WHERE (p_status IS NULL OR o.status = p_status)
    AND (p_vendedor_id IS NULL OR o.vendedor_id = p_vendedor_id)
    AND (
      CASE 
        WHEN p_date_field = 'created_at' THEN
          (p_date_from IS NULL OR o.created_at >= p_date_from)
          AND (p_date_to IS NULL OR o.created_at <= p_date_to)
        ELSE
          (p_date_from IS NULL OR o.data_emissao >= p_date_from)
          AND (p_date_to IS NULL OR o.data_emissao <= p_date_to)
      END
    );

  RETURN result;
END;
$function$;
