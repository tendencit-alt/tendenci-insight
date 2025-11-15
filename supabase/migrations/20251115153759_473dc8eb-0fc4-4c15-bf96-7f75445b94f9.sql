-- Função para marcar arquitetos como inativos após 45 dias sem projeto
CREATE OR REPLACE FUNCTION check_and_update_inactive_architects()
RETURNS void AS $$
BEGIN
  -- Marcar como inativos arquitetos que:
  -- 1. Estão ativos
  -- 2. Têm mais de 45 dias desde o último projeto (ou desde criação se nunca enviaram)
  -- 3. Foram criados há mais de 45 dias (para não marcar novos cadastros)
  UPDATE architects
  SET 
    active = false,
    data_marcado_inativo = NOW()
  WHERE 
    active = true
    AND created_at < NOW() - INTERVAL '45 days'
    AND (
      (ultimo_projeto_data IS NOT NULL AND ultimo_projeto_data < NOW() - INTERVAL '45 days')
      OR (ultimo_projeto_data IS NULL AND created_at < NOW() - INTERVAL '45 days')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para atualizar arquiteto quando criar projeto
CREATE OR REPLACE FUNCTION update_architect_on_project_create()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar arquiteto para ativo e registrar data do projeto
  UPDATE architects
  SET 
    active = true,
    ultimo_projeto_data = COALESCE(NEW.sent_date, NEW.created_at),
    data_marcado_inativo = NULL
  WHERE id = NEW.architect_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para quando um projeto for criado
DROP TRIGGER IF EXISTS trigger_update_architect_on_project ON projects;
CREATE TRIGGER trigger_update_architect_on_project
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_architect_on_project_create();

-- Função similar para architect_projects (projetos históricos)
CREATE OR REPLACE FUNCTION update_architect_on_architect_project_create()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar arquiteto para ativo e registrar data do projeto
  UPDATE architects
  SET 
    active = true,
    ultimo_projeto_data = NEW.data_projeto,
    data_marcado_inativo = NULL
  WHERE id = NEW.architect_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para architect_projects
DROP TRIGGER IF EXISTS trigger_update_architect_on_architect_project ON architect_projects;
CREATE TRIGGER trigger_update_architect_on_architect_project
  AFTER INSERT ON architect_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_architect_on_architect_project_create();

-- Comentário: Para executar a verificação periodicamente, use o seguinte comando no SQL editor:
-- SELECT cron.schedule(
--   'check-inactive-architects',
--   '0 2 * * *', -- Executa todo dia às 2AM
--   $$ SELECT check_and_update_inactive_architects(); $$
-- );