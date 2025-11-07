-- Corrigir search_path nas funções
CREATE OR REPLACE FUNCTION public.update_architect_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_architect_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.architect_history (architect_id, event_type, description, created_by)
  VALUES (
    NEW.id,
    'sistema',
    'Arquiteto cadastrado no sistema',
    auth.uid()
  );
  RETURN NEW;
END;
$$;