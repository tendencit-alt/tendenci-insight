-- Corrigir função check_and_move_inactive_architects para verificar data de criação
CREATE OR REPLACE FUNCTION check_and_move_inactive_architects()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  days_threshold INT := 60;
BEGIN
  -- Só marca inativo arquitetos que:
  -- 1. São parceiro_ativo
  -- 2. Foram criados há pelo menos 60 dias (CORREÇÃO DO BUG)
  -- 3. Não têm indicações nos últimos 60 dias
  -- 4. Não têm projetos nos últimos 60 dias
  UPDATE architects
  SET 
    status_funil = 'inativo',
    data_marcado_inativo = NOW(),
    updated_at = NOW()
  WHERE 
    status_funil = 'parceiro_ativo'
    AND active = true
    -- CORREÇÃO: Só marca inativo se foi criado há pelo menos 60 dias
    AND created_at < (CURRENT_DATE - INTERVAL '60 days')
    AND id NOT IN (
      SELECT DISTINCT architect_id 
      FROM architect_indications 
      WHERE created_at >= (CURRENT_DATE - INTERVAL '60 days')
    )
    AND id NOT IN (
      SELECT DISTINCT architect_id 
      FROM architect_projects 
      WHERE created_at >= (CURRENT_DATE - INTERVAL '60 days')
    );
    
  -- Registrar no histórico
  INSERT INTO architect_history (architect_id, event_type, description, created_at)
  SELECT id, 'status_change', 
    'Movido automaticamente para Inativo por falta de indicações ou projetos nos últimos 60 dias',
    NOW()
  FROM architects
  WHERE status_funil = 'inativo'
    AND data_marcado_inativo >= NOW() - INTERVAL '1 minute';
END;
$$;

-- Corrigir função run_inactive_architects_check também
CREATE OR REPLACE FUNCTION run_inactive_architects_check()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_count INT;
  result jsonb;
BEGIN
  -- Contar quantos serão afetados (com a correção)
  SELECT COUNT(*) INTO affected_count
  FROM architects
  WHERE 
    status_funil = 'parceiro_ativo'
    AND active = true
    -- CORREÇÃO: Só conta se foi criado há pelo menos 60 dias
    AND created_at < (CURRENT_DATE - INTERVAL '60 days')
    AND id NOT IN (
      SELECT DISTINCT architect_id 
      FROM architect_indications 
      WHERE created_at >= (CURRENT_DATE - INTERVAL '60 days')
    )
    AND id NOT IN (
      SELECT DISTINCT architect_id 
      FROM architect_projects 
      WHERE created_at >= (CURRENT_DATE - INTERVAL '60 days')
    );

  -- Executar a verificação
  PERFORM check_and_move_inactive_architects();
  
  result := jsonb_build_object(
    'success', true,
    'affected_count', affected_count,
    'message', format('%s arquitetos movidos para inativo', affected_count)
  );
  
  RETURN result;
END;
$$;

-- Corrigir função architect_inactivity para usar 60 dias como padrão
CREATE OR REPLACE FUNCTION architect_inactivity(days_threshold INT DEFAULT 60)
RETURNS TABLE (
  id uuid,
  name text,
  last_project_at timestamptz,
  days_since_last int,
  contact_count bigint,
  phone text,
  email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.name,
    MAX(ap.created_at) as last_project_at,
    COALESCE(EXTRACT(DAY FROM NOW() - MAX(ap.created_at))::int, 999) as days_since_last,
    COUNT(ap.id) as contact_count,
    a.phone,
    a.email
  FROM architects a
  LEFT JOIN architect_projects ap ON ap.architect_id = a.id
  WHERE a.active = true
    AND a.status_funil = 'parceiro_ativo'
    -- CORREÇÃO: Só mostra arquitetos criados há pelo menos X dias
    AND a.created_at < (CURRENT_DATE - (days_threshold || ' days')::interval)
  GROUP BY a.id, a.name, a.phone, a.email
  HAVING MAX(ap.created_at) IS NULL 
     OR MAX(ap.created_at) < NOW() - (days_threshold || ' days')::interval
  ORDER BY days_since_last DESC;
END;
$$;

-- Reverter arquitetos que foram marcados inativos incorretamente
-- (criados há menos de 60 dias no momento que foram marcados)
UPDATE architects
SET 
  status_funil = 'parceiro_ativo',
  data_marcado_inativo = NULL,
  updated_at = NOW()
WHERE 
  status_funil = 'inativo'
  AND data_marcado_inativo IS NOT NULL
  -- Se foi criado há menos de 60 dias antes de ser marcado inativo, foi erro
  AND created_at > (data_marcado_inativo - INTERVAL '60 days');

-- Registrar a correção no histórico
INSERT INTO architect_history (architect_id, event_type, description, created_at)
SELECT id, 'status_change', 
  'Revertido para Parceiro Ativo - marcação inativa anterior foi incorreta (menos de 60 dias de atividade)',
  NOW()
FROM architects
WHERE 
  status_funil = 'parceiro_ativo'
  AND updated_at >= NOW() - INTERVAL '1 minute';