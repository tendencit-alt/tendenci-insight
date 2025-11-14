-- Adicionar campos necessários na tabela architects para suportar novas funcionalidades
ALTER TABLE architects ADD COLUMN IF NOT EXISTS ultimo_projeto_data timestamp with time zone;
ALTER TABLE architects ADD COLUMN IF NOT EXISTS data_marcado_inativo timestamp with time zone;

-- Criar função para marcar arquitetos inativos após 45 dias sem contato
CREATE OR REPLACE FUNCTION mark_inactive_architects()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Marcar como inativo arquitetos que não têm contato há 45 dias
  UPDATE architects
  SET 
    active = false,
    data_marcado_inativo = now(),
    tag_prospeccao = COALESCE(tag_prospeccao || ',', '') || 'inativo_45dias'
  WHERE active = true
    AND (
      data_ultimo_contato IS NULL 
      OR data_ultimo_contato < now() - interval '45 days'
    )
    AND (
      tag_prospeccao IS NULL 
      OR tag_prospeccao NOT LIKE '%inativo_45dias%'
    );
    
  -- Criar tarefas de reativação para arquitetos recém-marcados como inativos
  INSERT INTO crm_tasks (
    deal_id,
    title,
    note,
    due_at,
    status,
    created_by
  )
  SELECT
    -- Criar um deal temporário ou usar sistema de tarefas independente
    (SELECT id FROM crm_deals LIMIT 1), -- Placeholder, ajustar conforme necessário
    'Reativar Arquiteto – 45 dias sem contato: ' || a.name,
    'Arquiteto ' || a.name || ' está inativo há 45 dias. Entrar em contato para reativar.',
    now() + interval '1 day',
    'open',
    a.vendedor_responsavel
  FROM architects a
  WHERE a.data_marcado_inativo = now()::date;
END;
$$;

-- Criar função para atualizar automaticamente data do último projeto
CREATE OR REPLACE FUNCTION update_architect_last_project()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Atualizar data do último projeto quando um novo projeto é criado
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.architect_id IS DISTINCT FROM NEW.architect_id) THEN
    UPDATE architects
    SET 
      ultimo_projeto_data = NEW.created_at,
      active = true,
      tag_prospeccao = REPLACE(COALESCE(tag_prospeccao, ''), 'inativo_45dias', '')
    WHERE id = NEW.architect_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para atualizar data do último projeto automaticamente
DROP TRIGGER IF EXISTS trigger_update_architect_last_project ON projects;
CREATE TRIGGER trigger_update_architect_last_project
  AFTER INSERT OR UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_architect_last_project();

-- Criar tabela para armazenar projetos específicos de arquitetos (caso necessário)
CREATE TABLE IF NOT EXISTS architect_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  architect_id uuid NOT NULL REFERENCES architects(id) ON DELETE CASCADE,
  nome_projeto text NOT NULL,
  tipo text CHECK (tipo IN ('planejado', 'mobiliario_solto')),
  data_projeto timestamp with time zone NOT NULL DEFAULT now(),
  valor numeric DEFAULT 0,
  observacoes text,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

-- Habilitar RLS
ALTER TABLE architect_projects ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para architect_projects
CREATE POLICY "Autenticados podem criar projetos de arquitetos"
  ON architect_projects FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem ler projetos de arquitetos"
  ON architect_projects FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem atualizar projetos de arquitetos"
  ON architect_projects FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins podem deletar projetos de arquitetos"
  ON architect_projects FOR DELETE
  TO authenticated
  USING (is_admin());

-- Criar função para obter estatísticas de projetos por tipo
CREATE OR REPLACE FUNCTION get_project_stats_by_type()
RETURNS TABLE(
  tipo text,
  quantidade bigint,
  valor_total numeric,
  ticket_medio numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    COALESCE(tipo, 'não_especificado') as tipo,
    COUNT(*) as quantidade,
    COALESCE(SUM(valor), 0) as valor_total,
    CASE 
      WHEN COUNT(*) > 0 THEN COALESCE(SUM(valor), 0) / COUNT(*)
      ELSE 0
    END as ticket_medio
  FROM architect_projects
  GROUP BY tipo
  ORDER BY valor_total DESC;
$$;

-- Criar função para ranking de arquitetos por tipo de projeto
CREATE OR REPLACE FUNCTION get_architect_ranking_by_type(p_tipo text DEFAULT NULL)
RETURNS TABLE(
  architect_id uuid,
  architect_name text,
  quantidade_projetos bigint,
  valor_total numeric,
  ticket_medio numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    a.id as architect_id,
    a.name as architect_name,
    COUNT(ap.id) as quantidade_projetos,
    COALESCE(SUM(ap.valor), 0) as valor_total,
    CASE 
      WHEN COUNT(ap.id) > 0 THEN COALESCE(SUM(ap.valor), 0) / COUNT(ap.id)
      ELSE 0
    END as ticket_medio
  FROM architects a
  LEFT JOIN architect_projects ap ON ap.architect_id = a.id
  WHERE (p_tipo IS NULL OR ap.tipo = p_tipo)
  GROUP BY a.id, a.name
  HAVING COUNT(ap.id) > 0
  ORDER BY valor_total DESC;
$$;