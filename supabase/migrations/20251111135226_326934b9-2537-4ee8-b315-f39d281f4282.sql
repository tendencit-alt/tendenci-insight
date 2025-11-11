-- Recriar tabela crm_deal_history do zero com foreign keys corretas

-- 1. Remover tabela existente
DROP TABLE IF EXISTS public.crm_deal_history CASCADE;

-- 2. Recriar tabela com estrutura correta
CREATE TABLE public.crm_deal_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.crm_deals(id) ON DELETE CASCADE,
  from_stage_id UUID REFERENCES public.crm_stages(id) ON DELETE SET NULL,
  to_stage_id UUID NOT NULL REFERENCES public.crm_stages(id) ON DELETE CASCADE,
  moved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  moved_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  action_type TEXT DEFAULT 'stage_change',
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  description TEXT
);

-- 3. Criar índices para performance
CREATE INDEX idx_crm_deal_history_deal_id ON public.crm_deal_history(deal_id);
CREATE INDEX idx_crm_deal_history_moved_by ON public.crm_deal_history(moved_by);
CREATE INDEX idx_crm_deal_history_created_at ON public.crm_deal_history(created_at DESC);

-- 4. Habilitar RLS
ALTER TABLE public.crm_deal_history ENABLE ROW LEVEL SECURITY;

-- 5. Recriar políticas RLS
CREATE POLICY "Autenticados criam histórico" ON public.crm_deal_history
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Autenticados leem histórico" ON public.crm_deal_history
  FOR SELECT TO authenticated
  USING (true);

-- 6. Recriar trigger de criação de deal
DROP TRIGGER IF EXISTS trigger_log_deal_creation ON public.crm_deals;
CREATE TRIGGER trigger_log_deal_creation
  AFTER INSERT ON public.crm_deals
  FOR EACH ROW
  EXECUTE FUNCTION public.log_deal_creation();

-- 7. Recriar trigger de mudanças no deal
DROP TRIGGER IF EXISTS trigger_log_deal_changes ON public.crm_deals;
CREATE TRIGGER trigger_log_deal_changes
  AFTER UPDATE ON public.crm_deals
  FOR EACH ROW
  EXECUTE FUNCTION public.log_deal_changes();