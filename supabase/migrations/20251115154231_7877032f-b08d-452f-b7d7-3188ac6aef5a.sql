-- Atualizar função para mover arquiteto para parceiro_ativo ao criar projeto
CREATE OR REPLACE FUNCTION update_architect_on_project_create()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Atualizar arquiteto para ativo, registrar data do projeto E mover para parceiro_ativo
  UPDATE architects
  SET 
    active = true,
    ultimo_projeto_data = COALESCE(NEW.sent_date, NEW.created_at),
    data_marcado_inativo = NULL,
    status_funil = 'parceiro_ativo'
  WHERE id = NEW.architect_id;
  
  RETURN NEW;
END;
$$;

-- Atualizar função para architect_projects também
CREATE OR REPLACE FUNCTION update_architect_on_architect_project_create()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Atualizar arquiteto para ativo, registrar data do projeto E mover para parceiro_ativo
  UPDATE architects
  SET 
    active = true,
    ultimo_projeto_data = NEW.data_projeto,
    data_marcado_inativo = NULL,
    status_funil = 'parceiro_ativo'
  WHERE id = NEW.architect_id;
  
  RETURN NEW;
END;
$$;