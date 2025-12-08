-- Adicionar campo audio_url às tabelas de tarefas
ALTER TABLE crm_tasks ADD COLUMN IF NOT EXISTS audio_url TEXT;
ALTER TABLE tendenci_prospec_arq_agendamentos ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- Criar tabela project_notes para observações de projetos
CREATE TABLE IF NOT EXISTS project_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  message TEXT,
  audio_url TEXT,
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  mentioned_users TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_project_notes_project_id ON project_notes(project_id);

-- Enable RLS
ALTER TABLE project_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies para project_notes
CREATE POLICY "Autenticados podem ler notas de projetos"
ON project_notes FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem criar notas de projetos"
ON project_notes FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Autores podem atualizar próprias notas"
ON project_notes FOR UPDATE
USING (auth.uid() = author_id);

CREATE POLICY "Admins podem deletar notas"
ON project_notes FOR DELETE
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid()
  AND profiles.role = 'admin'
));