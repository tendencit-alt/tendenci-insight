-- Adicionar etapa "Lead" como primeira em todos os funis existentes
DO $$
DECLARE
  pipeline_record RECORD;
  has_lead_stage BOOLEAN;
BEGIN
  -- Para cada pipeline existente
  FOR pipeline_record IN SELECT id, name FROM crm_pipelines LOOP
    -- Verificar se já existe uma etapa "Lead"
    SELECT EXISTS(
      SELECT 1 FROM crm_stages 
      WHERE pipeline_id = pipeline_record.id 
      AND LOWER(name) = 'lead'
    ) INTO has_lead_stage;
    
    -- Se não existe, criar
    IF NOT has_lead_stage THEN
      -- Incrementar position de todas as etapas existentes
      UPDATE crm_stages 
      SET position = position + 1 
      WHERE pipeline_id = pipeline_record.id;
      
      -- Inserir "Lead" na primeira posição
      INSERT INTO crm_stages (pipeline_id, name, position, sla_hours)
      VALUES (pipeline_record.id, 'Lead', 0, 24);
      
      RAISE NOTICE 'Etapa Lead criada no funil: %', pipeline_record.name;
    ELSE
      RAISE NOTICE 'Funil % já possui etapa Lead', pipeline_record.name;
    END IF;
  END LOOP;
END $$;

-- Criar função para adicionar etapa "Lead" automaticamente quando criar novo funil
CREATE OR REPLACE FUNCTION create_default_lead_stage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Inserir etapa "Lead" como primeira do novo pipeline
  INSERT INTO crm_stages (pipeline_id, name, position, sla_hours)
  VALUES (NEW.id, 'Lead', 0, 24);
  
  RETURN NEW;
END;
$$;

-- Criar trigger para executar após inserção de novo pipeline
DROP TRIGGER IF EXISTS trigger_create_lead_stage ON crm_pipelines;
CREATE TRIGGER trigger_create_lead_stage
AFTER INSERT ON crm_pipelines
FOR EACH ROW
EXECUTE FUNCTION create_default_lead_stage();