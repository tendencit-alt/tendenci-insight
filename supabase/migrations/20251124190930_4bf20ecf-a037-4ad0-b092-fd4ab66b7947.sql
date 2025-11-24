
-- Remover a constraint antiga
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_stage_check;

-- Atualizar todos os projetos existentes para os novos valores
-- 'recebido' já está correto, não precisa atualizar
UPDATE projects SET stage = 'em_orcamento' WHERE stage = 'em_desenvolvimento';
UPDATE projects SET stage = 'em_negociacao' WHERE stage = 'aguardando_aprovacao';

-- Adicionar a nova constraint com os 7 estágios corretos
ALTER TABLE projects ADD CONSTRAINT projects_stage_check 
  CHECK (stage IN ('recebido', 'em_orcamento', 'orcado', 'apresentado', 'em_negociacao', 'aprovado', 'perdido'));
