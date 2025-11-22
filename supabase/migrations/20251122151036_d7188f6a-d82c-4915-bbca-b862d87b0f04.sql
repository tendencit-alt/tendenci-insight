-- Criar tabela de indicações de arquitetos
CREATE TABLE IF NOT EXISTS public.architect_indications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.crm_deals(id) ON DELETE CASCADE,
  architect_id UUID NOT NULL REFERENCES public.architects(id) ON DELETE CASCADE,
  product_type TEXT NOT NULL,
  categoria TEXT,
  centro_custo TEXT,
  value NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Índices para performance
CREATE INDEX idx_architect_indications_deal ON public.architect_indications(deal_id);
CREATE INDEX idx_architect_indications_architect ON public.architect_indications(architect_id);
CREATE INDEX idx_architect_indications_created_at ON public.architect_indications(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.architect_indications ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Autenticados podem ler indicações"
ON public.architect_indications
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem criar indicações"
ON public.architect_indications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem atualizar indicações"
ON public.architect_indications
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins podem deletar indicações"
ON public.architect_indications
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Função RPC para obter estatísticas de indicações por arquiteto
CREATE OR REPLACE FUNCTION public.get_architect_indication_stats(p_architect_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'total_indicacoes', COUNT(ai.id),
    'produtos_indicados', COALESCE(
      json_agg(DISTINCT ai.product_type) FILTER (WHERE ai.product_type IS NOT NULL),
      '[]'::json
    ),
    'valor_total_indicacoes', COALESCE(SUM(ai.value), 0),
    'total_projetos', (
      SELECT COUNT(*)::bigint 
      FROM projects p 
      WHERE p.architect_id = p_architect_id
    ) + (
      SELECT COUNT(*)::bigint 
      FROM architect_projects ap 
      WHERE ap.architect_id = p_architect_id
    )
  ) INTO v_result
  FROM architect_indications ai
  WHERE ai.architect_id = p_architect_id;
  
  RETURN v_result;
END;
$$;

-- Trigger para registrar no histórico do arquiteto quando uma indicação é criada
CREATE OR REPLACE FUNCTION public.log_architect_indication()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deal_title TEXT;
BEGIN
  -- Buscar título do deal
  SELECT title INTO v_deal_title
  FROM crm_deals
  WHERE id = NEW.deal_id;
  
  -- Registrar no histórico do arquiteto
  INSERT INTO architect_history (
    architect_id,
    event_type,
    description,
    created_by
  ) VALUES (
    NEW.architect_id,
    'indication',
    format('🎯 Indicação registrada para o negócio "%s" - Produto: %s', 
      COALESCE(v_deal_title, 'Sem título'), 
      NEW.product_type
    ),
    NEW.created_by
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_architect_indication
AFTER INSERT ON public.architect_indications
FOR EACH ROW
EXECUTE FUNCTION public.log_architect_indication();

COMMENT ON TABLE public.architect_indications IS 'Tabela para rastrear indicações de arquitetos em negócios do CRM';
COMMENT ON FUNCTION public.get_architect_indication_stats IS 'Retorna estatísticas de indicações, produtos indicados e projetos de um arquiteto';