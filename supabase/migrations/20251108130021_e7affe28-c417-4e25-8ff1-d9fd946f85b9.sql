-- Função para métricas de mensagens iniciadas Meta
CREATE OR REPLACE FUNCTION public.dashboard_meta_initiated_messages()
RETURNS JSON
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  result JSON;
BEGIN
  -- Placeholder para futuras integrações com Meta API
  -- Por enquanto retorna dados vazios indicando API não conectada
  SELECT json_build_object(
    'total_initiated', 0,
    'period_days', 30,
    'api_connected', false
  ) INTO result;

  RETURN result;
END;
$$;