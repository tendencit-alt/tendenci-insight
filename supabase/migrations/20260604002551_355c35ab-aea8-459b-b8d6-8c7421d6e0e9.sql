CREATE OR REPLACE FUNCTION public.sync_project_status_with_ops()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_project_id uuid;
  v_all_completed boolean;
  v_any_in_production boolean;
  v_all_waiting boolean;
  v_new_status text;
BEGIN
  -- Identificar o project_id afetado
  IF TG_OP = 'DELETE' THEN
    v_project_id := OLD.project_id;
  ELSE
    v_project_id := NEW.project_id;
  END IF;

  IF v_project_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Verificar estados das OPs do projeto
  SELECT 
    bool_and(status = 'concluido'),
    bool_or(status NOT IN ('aguardando', 'concluido', 'cancelado')),
    bool_and(status = 'aguardando')
  INTO v_all_completed, v_any_in_production, v_all_waiting
  FROM public.production_orders
  WHERE project_id = v_project_id AND status != 'cancelado';

  -- Definir novo status do projeto
  IF v_all_completed THEN
    v_new_status := 'concluido';
  ELSIF v_any_in_production THEN
    v_new_status := 'em_producao';
  ELSIF v_all_waiting THEN
    v_new_status := 'aguardando';
  ELSE
    v_new_status := 'em_producao'; -- Default caso misto
  END IF;

  -- Atualizar o projeto
  UPDATE public.projects
  SET stage = v_new_status,
      updated_at = now()
  WHERE id = v_project_id AND stage IS DISTINCT FROM v_new_status;

  RETURN NULL;
END;
$function$;

-- Trigger para manter a consistência ao alterar status de uma OP
DROP TRIGGER IF EXISTS trigger_sync_project_status ON public.production_orders;
CREATE TRIGGER trigger_sync_project_status
AFTER INSERT OR UPDATE OF status OR DELETE ON public.production_orders
FOR EACH ROW EXECUTE FUNCTION public.sync_project_status_with_ops();