
CREATE OR REPLACE FUNCTION public.fn_default_project_budget_percent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.budget_percent IS NULL THEN
    SELECT cs.default_project_budget_percent INTO NEW.budget_percent
    FROM public.company_settings cs
    WHERE cs.tenant_id = NEW.tenant_id
    LIMIT 1;
    IF NEW.budget_percent IS NULL THEN
      NEW.budget_percent := 50;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_default_project_budget_percent ON public.fin_projects;
CREATE TRIGGER trg_default_project_budget_percent
BEFORE INSERT ON public.fin_projects
FOR EACH ROW
EXECUTE FUNCTION public.fn_default_project_budget_percent();
