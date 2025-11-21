
-- Remover trigger incorreto de tendenci_prospec_arq_agendamentos
DROP TRIGGER IF EXISTS ensure_agendamento_vendedor ON tendenci_prospec_arq_agendamentos;

-- Criar função específica para preencher vendedor_id em agendamentos
CREATE OR REPLACE FUNCTION public.set_agendamento_vendedor_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se vendedor_id não foi fornecido, usar auth.uid()
  IF NEW.vendedor_id IS NULL THEN
    NEW.vendedor_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

-- Criar trigger correto para tendenci_prospec_arq_agendamentos
CREATE TRIGGER ensure_agendamento_vendedor
  BEFORE INSERT ON tendenci_prospec_arq_agendamentos
  FOR EACH ROW
  EXECUTE FUNCTION set_agendamento_vendedor_id();
