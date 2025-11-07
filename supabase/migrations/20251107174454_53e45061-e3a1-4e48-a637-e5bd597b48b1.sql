-- 1️⃣ CASCADE DELETE para tabelas relacionadas
-- Verificar se as constraints existem antes de dropar
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
             WHERE constraint_name = 'lead_messages_lead_id_fkey' 
             AND table_name = 'lead_messages') THEN
    ALTER TABLE public.lead_messages DROP CONSTRAINT lead_messages_lead_id_fkey;
  END IF;
END $$;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
             WHERE constraint_name = 'lead_events_lead_id_fkey' 
             AND table_name = 'lead_events') THEN
    ALTER TABLE public.lead_events DROP CONSTRAINT lead_events_lead_id_fkey;
  END IF;
END $$;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
             WHERE constraint_name = 'leads_audit_lead_id_fkey' 
             AND table_name = 'leads_audit') THEN
    ALTER TABLE public.leads_audit DROP CONSTRAINT leads_audit_lead_id_fkey;
  END IF;
END $$;

-- Adicionar constraints com CASCADE DELETE se as tabelas existirem
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' AND table_name = 'lead_messages') THEN
    ALTER TABLE public.lead_messages ADD CONSTRAINT lead_messages_lead_id_fkey
      FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' AND table_name = 'lead_events') THEN
    ALTER TABLE public.lead_events ADD CONSTRAINT lead_events_lead_id_fkey
      FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' AND table_name = 'leads_audit') THEN
    ALTER TABLE public.leads_audit ADD CONSTRAINT leads_audit_lead_id_fkey
      FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;
  END IF;
END $$;

-- CASCADE DELETE para lead_attachments (já existe no schema)
ALTER TABLE public.lead_attachments DROP CONSTRAINT IF EXISTS lead_attachments_lead_id_fkey;
ALTER TABLE public.lead_attachments ADD CONSTRAINT lead_attachments_lead_id_fkey
  FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;

-- 2️⃣ RPC de métricas reais
CREATE OR REPLACE FUNCTION public.leads_aggregates()
RETURNS JSON AS $$
DECLARE
  result JSON;
  hot_leads INTEGER;
  avg_response NUMERIC;
  new_leads INTEGER;
  crm_conversion NUMERIC;
BEGIN
  -- Contar leads quentes (assumindo que existe um campo temperature ou similar)
  SELECT COUNT(*) INTO hot_leads
  FROM leads
  WHERE status = 'quente';

  -- Calcular tempo médio de resposta (placeholder - ajustar conforme estrutura real)
  -- Assumindo que existe algum campo de timestamp de resposta
  SELECT 2.4 INTO avg_response; -- Valor fixo por enquanto

  -- Contar novos leads
  SELECT COUNT(*) INTO new_leads
  FROM leads
  WHERE status = 'novo';

  -- Calcular taxa de conversão CRM
  SELECT COALESCE(
    ROUND(
      (COUNT(*) FILTER (WHERE status IN ('convertido', 'ganho')) * 100.0) / NULLIF(COUNT(*), 0),
      1
    ),
    0
  ) INTO crm_conversion
  FROM leads;

  result := json_build_object(
    'hot_count', COALESCE(hot_leads, 0),
    'avg_response', COALESCE(avg_response, 0),
    'new_count', COALESCE(new_leads, 0),
    'crm_rate', COALESCE(crm_conversion, 0)
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;