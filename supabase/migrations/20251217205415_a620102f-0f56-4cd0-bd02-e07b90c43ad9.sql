-- Adicionar campos de deduplicação na tabela system_errors
ALTER TABLE public.system_errors 
ADD COLUMN IF NOT EXISTS occurrence_count integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS last_occurrence_at timestamptz DEFAULT now();

-- Criar índice para deduplicação por título e módulo
CREATE INDEX IF NOT EXISTS idx_system_errors_dedup ON public.system_errors (title, module, status);

-- Criar função de deduplicação
CREATE OR REPLACE FUNCTION handle_duplicate_error()
RETURNS TRIGGER AS $$
DECLARE
  existing_error_id uuid;
BEGIN
  -- Procurar erro similar aberto nas últimas 24h
  SELECT id INTO existing_error_id
  FROM public.system_errors
  WHERE title = NEW.title
    AND module = NEW.module
    AND status = 'open'
    AND created_at > now() - interval '24 hours'
  LIMIT 1;
  
  IF existing_error_id IS NOT NULL THEN
    -- Atualizar ocorrência existente
    UPDATE public.system_errors
    SET occurrence_count = occurrence_count + 1,
        last_occurrence_at = now(),
        updated_at = now()
    WHERE id = existing_error_id;
    
    -- Cancelar insert
    RETURN NULL;
  END IF;
  
  -- Garantir valores default
  NEW.occurrence_count := 1;
  NEW.last_occurrence_at := now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger de deduplicação
DROP TRIGGER IF EXISTS trigger_deduplicate_errors ON public.system_errors;
CREATE TRIGGER trigger_deduplicate_errors
  BEFORE INSERT ON public.system_errors
  FOR EACH ROW
  EXECUTE FUNCTION handle_duplicate_error();