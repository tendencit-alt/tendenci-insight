-- Corrigir search_path nas funções para segurança

-- Função para marcar arquitetos como inativos (com search_path definido)
CREATE OR REPLACE FUNCTION check_and_update_inactive_architects()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
$$;

-- Função para atualizar arquiteto quando criar projeto (com search_path definido)
CREATE OR REPLACE FUNCTION update_architect_on_project_create()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE architects
  SET 
    active = true,
    ultimo_projeto_data = COALESCE(NEW.sent_date, NEW.created_at),
    data_marcado_inativo = NULL
  WHERE id = NEW.architect_id;
  
  RETURN NEW;
END;
$$;

-- Função para architect_projects (com search_path definido)
CREATE OR REPLACE FUNCTION update_architect_on_architect_project_create()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE architects
  SET 
    active = true,
    ultimo_projeto_data = NEW.data_projeto,
    data_marcado_inativo = NULL
  WHERE id = NEW.architect_id;
  
  RETURN NEW;
END;
$$;