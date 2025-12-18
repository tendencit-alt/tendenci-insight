-- Adicionar coluna notes na tabela projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN public.projects.notes IS 'Observações do projeto';