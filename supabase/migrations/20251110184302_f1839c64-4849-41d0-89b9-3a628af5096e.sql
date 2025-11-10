-- Adicionar campo temperatura na tabela leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS temperature TEXT DEFAULT 'frio' CHECK (temperature IN ('frio', 'quente'));

-- Criar tabela para histórico de movimentação dos deals
CREATE TABLE IF NOT EXISTS crm_deal_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES crm_deals(id) ON DELETE CASCADE,
  from_stage_id UUID REFERENCES crm_stages(id),
  to_stage_id UUID NOT NULL REFERENCES crm_stages(id),
  moved_by UUID REFERENCES auth.users(id),
  moved_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE crm_deal_history ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para histórico
CREATE POLICY "Autenticados leem histórico"
  ON crm_deal_history FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados criam histórico"
  ON crm_deal_history FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Criar trigger para registrar mudanças de estágio automaticamente
CREATE OR REPLACE FUNCTION log_deal_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Se mudou o stage_id, registrar no histórico
  IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
    INSERT INTO crm_deal_history (deal_id, from_stage_id, to_stage_id, moved_by)
    VALUES (NEW.id, OLD.stage_id, NEW.stage_id, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_log_deal_stage_change
  AFTER UPDATE ON crm_deals
  FOR EACH ROW
  EXECUTE FUNCTION log_deal_stage_change();

-- Habilitar realtime para histórico
ALTER PUBLICATION supabase_realtime ADD TABLE crm_deal_history;