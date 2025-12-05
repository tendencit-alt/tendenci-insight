-- Fase 1: Corrigir especialização de todos os projetistas (incluindo Renato)
UPDATE profiles 
SET especializacao = NULL 
WHERE role = 'projetista';

-- Fase 2: Atualizar RPC crm_sla_alerts para bloquear projetistas
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
    SELECT especializacao, role, (role = 'admin') as is_admin
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
    AND ui.role != 'projetista'
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

-- Fase 3: Atualizar RPC crm_agg para bloquear projetistas
CREATE OR REPLACE FUNCTION public.crm_agg(p_pipeline_id uuid)
RETURNS TABLE(
  new_value numeric,
  won_value numeric,
  lost_value numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH user_info AS (
    SELECT especializacao, role, (role = 'admin') as is_admin
    FROM profiles
    WHERE id = auth.uid()
  )
  SELECT
    COALESCE(SUM(CASE WHEN d.status = 'aberto' THEN d.value ELSE 0 END), 0) as new_value,
    COALESCE(SUM(CASE WHEN d.status = 'won' THEN d.value ELSE 0 END), 0) as won_value,
    COALESCE(SUM(CASE WHEN d.status = 'lost' THEN d.value ELSE 0 END), 0) as lost_value
  FROM crm_deals d
  CROSS JOIN user_info ui
  WHERE d.pipeline_id = p_pipeline_id
    AND ui.role != 'projetista'
    AND (
      ui.is_admin = TRUE
      OR ui.especializacao = 'todos'
      OR (ui.especializacao = 'moveis_soltos' AND d.categoria = 'Móveis Soltos')
      OR (ui.especializacao = 'moveis_planejados' AND d.categoria = 'Planejados')
    );
$$;

-- Fase 4: Atualizar trigger para novos projetistas terem especializacao NULL
CREATE OR REPLACE FUNCTION public.handle_projetista_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o role for projetista, garantir especialização NULL e criar permissões
  IF NEW.role = 'projetista' THEN
    -- Forçar especialização como NULL (não aplicável para projetistas)
    NEW.especializacao := NULL;
    
    -- Criar permissão apenas para o módulo de projetos
    INSERT INTO public.user_permissions (user_id, module, can_view, can_create, can_edit, can_delete)
    VALUES (NEW.id, 'projetos', true, false, true, false)
    ON CONFLICT (user_id, module) DO UPDATE
    SET can_view = true, can_create = false, can_edit = true, can_delete = false;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Dropar trigger antigo se existir e recriar
DROP TRIGGER IF EXISTS on_projetista_created ON profiles;
CREATE TRIGGER on_projetista_created
  BEFORE INSERT OR UPDATE OF role ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_projetista_creation();