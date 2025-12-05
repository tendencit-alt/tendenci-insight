-- Fase 1: Corrigir RPC crm_sla_alerts com filtro de especialização e status correto
CREATE OR REPLACE FUNCTION public.crm_sla_alerts(
  p_pipeline_id uuid,
  p_max_delay_days integer DEFAULT NULL
)
RETURNS TABLE(
  deal_id uuid,
  title text,
  lead_name text,
  stage_name text,
  owner_name text,
  delay_h integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH user_info AS (
    SELECT especializacao, (role = 'admin') as is_admin
    FROM profiles
    WHERE id = auth.uid()
  )
  SELECT 
    d.id as deal_id,
    d.title,
    COALESCE(c.name, 'Sem cliente') as lead_name,
    s.name as stage_name,
    COALESCE(p.full_name, p.username, 'Sem responsável') as owner_name,
    EXTRACT(EPOCH FROM (now() - d.stage_entered_at))::integer / 3600 as delay_h
  FROM crm_deals d
  JOIN crm_stages s ON s.id = d.stage_id
  LEFT JOIN leads l ON l.id = d.lead_id
  LEFT JOIN clients c ON c.id = l.client_id
  LEFT JOIN profiles p ON p.id = d.owner_id
  CROSS JOIN user_info ui
  WHERE d.pipeline_id = p_pipeline_id
    AND d.status = 'aberto'
    AND s.sla_hours IS NOT NULL
    AND s.sla_hours > 0
    AND d.stage_entered_at IS NOT NULL
    AND EXTRACT(EPOCH FROM (now() - d.stage_entered_at)) / 3600 > s.sla_hours
    AND (
      ui.is_admin = TRUE
      OR ui.especializacao = 'todos'
      OR (ui.especializacao = 'moveis_soltos' AND d.categoria = 'Móveis Soltos')
      OR (ui.especializacao = 'moveis_planejados' AND d.categoria = 'Planejados')
    )
    AND (
      p_max_delay_days IS NULL 
      OR EXTRACT(EPOCH FROM (now() - d.stage_entered_at)) / 3600 <= (p_max_delay_days * 24)
    )
  ORDER BY delay_h ASC
  LIMIT 20;
$$;

-- Fase 2: Corrigir RLS de DELETE em crm_deals para apenas admins
DROP POLICY IF EXISTS "Autenticados deletam deals" ON crm_deals;
DROP POLICY IF EXISTS "Apenas admins podem deletar deals" ON crm_deals;

CREATE POLICY "Apenas admins podem deletar deals"
ON crm_deals
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);