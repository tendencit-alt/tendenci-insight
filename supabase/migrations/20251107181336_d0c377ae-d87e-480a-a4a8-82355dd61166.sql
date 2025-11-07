-- Função RPC para alertas detalhados de prazos
CREATE OR REPLACE FUNCTION public.project_deadline_alerts_detailed()
RETURNS TABLE (
  id uuid,
  name text,
  client_name text,
  architect_name text,
  deadline timestamp with time zone,
  days_remaining integer,
  status text,
  stage text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    p.id,
    p.name,
    c.name as client_name,
    a.name as architect_name,
    p.deadline,
    EXTRACT(DAY FROM (p.deadline - NOW()))::integer as days_remaining,
    CASE 
      WHEN p.deadline < NOW() THEN 'vencido'
      WHEN p.deadline <= NOW() + INTERVAL '3 days' THEN 'proximo'
      ELSE 'ok'
    END as status,
    p.stage
  FROM projects p
  LEFT JOIN clients c ON c.id = p.client_id
  LEFT JOIN architects a ON a.id = p.architect_id
  WHERE p.deadline IS NOT NULL
    AND p.stage IN ('captado', 'orçamento')
  ORDER BY p.deadline ASC;
$$;