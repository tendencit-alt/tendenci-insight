-- Adicionar constraint foreign key correta para vincular projects com crm_deals
-- Primeiro, verificar se já existe uma coluna crm_deal_id, se não, adicionar

-- Adicionar coluna crm_deal_id se não existir
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS crm_deal_id uuid;

-- Adicionar foreign key constraint
ALTER TABLE public.projects
DROP CONSTRAINT IF EXISTS projects_crm_deal_id_fkey;

ALTER TABLE public.projects
ADD CONSTRAINT projects_crm_deal_id_fkey 
FOREIGN KEY (crm_deal_id) 
REFERENCES public.crm_deals(id) 
ON DELETE SET NULL;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_projects_crm_deal_id 
ON public.projects(crm_deal_id);

-- Comentário explicativo
COMMENT ON COLUMN public.projects.crm_deal_id IS 'Referência ao negócio no CRM (crm_deals)';