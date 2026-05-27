
-- =========================================================
-- RH (CLT) — provisão automática no AP do mês corrente
-- =========================================================
CREATE OR REPLACE FUNCTION public.tg_hr_employee_auto_provision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _month_start date := date_trunc('month', now())::date;
  _due         date := (date_trunc('month', now()) + interval '1 month - 1 day')::date;
  _docnum      text;
  _existing    uuid;
BEGIN
  -- Só provisiona colaboradores ativos, com salário > 0 e tenant_id válido
  IF NEW.tenant_id IS NULL THEN RETURN NEW; END IF;
  IF COALESCE(NEW.status,'') <> 'active' THEN RETURN NEW; END IF;
  IF COALESCE(NEW.base_salary, 0) <= 0 THEN RETURN NEW; END IF;
  -- Respeita janela do contrato
  IF NEW.admission_date IS NOT NULL AND NEW.admission_date > _due THEN RETURN NEW; END IF;
  IF NEW.termination_date IS NOT NULL AND NEW.termination_date < _month_start THEN RETURN NEW; END IF;

  _docnum := 'RH-FOLHA-' || NEW.id::text || '-' || to_char(_month_start, 'YYYY-MM');

  SELECT id INTO _existing
    FROM public.fin_payables
   WHERE document_number = _docnum
     AND origem = 'RH_FOLHA'
   LIMIT 1;

  IF _existing IS NULL THEN
    INSERT INTO public.fin_payables
      (tenant_id, amount, due_date, competence_date, status,
       description, document_number, origem, notes,
       cost_center_id, chart_account_id)
    VALUES
      (NEW.tenant_id, NEW.base_salary, _due, _month_start, 'ABERTO',
       'Folha de pagamento — ' || NEW.name || ' (' || to_char(_month_start, 'MM/YYYY') || ')',
       _docnum, 'RH_FOLHA',
       'Provisão automática gerada pelo cadastro de RH',
       NEW.cost_center_id, NEW.chart_account_id);
  ELSE
    UPDATE public.fin_payables
       SET amount          = NEW.base_salary,
           cost_center_id  = COALESCE(cost_center_id,  NEW.cost_center_id),
           chart_account_id= COALESCE(chart_account_id, NEW.chart_account_id),
           description     = 'Folha de pagamento — ' || NEW.name || ' (' || to_char(_month_start, 'MM/YYYY') || ')',
           updated_at      = now()
     WHERE id = _existing
       AND status IN ('ABERTO','PARCIAL','VENCIDO');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hr_employees_auto_provision ON public.hr_employees;
CREATE TRIGGER hr_employees_auto_provision
AFTER INSERT OR UPDATE OF base_salary, status, cost_center_id, chart_account_id, name, admission_date, termination_date
ON public.hr_employees
FOR EACH ROW
EXECUTE FUNCTION public.tg_hr_employee_auto_provision();

-- =========================================================
-- PJ (Prestadores) — provisão automática no AP do mês corrente
-- =========================================================
CREATE OR REPLACE FUNCTION public.tg_service_provider_auto_provision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _month_start date := date_trunc('month', now())::date;
  _due         date := (date_trunc('month', now()) + interval '1 month - 1 day')::date;
  _docnum      text;
  _existing    uuid;
BEGIN
  IF NEW.tenant_id IS NULL THEN RETURN NEW; END IF;
  IF COALESCE(NEW.status,'') <> 'active' THEN RETURN NEW; END IF;
  IF COALESCE(NEW.contract_value, 0) <= 0 THEN RETURN NEW; END IF;
  IF NEW.start_date IS NOT NULL AND NEW.start_date > _due THEN RETURN NEW; END IF;
  IF NEW.end_date   IS NOT NULL AND NEW.end_date   < _month_start THEN RETURN NEW; END IF;

  _docnum := 'PJ-CONTRATO-' || NEW.id::text || '-' || to_char(_month_start, 'YYYY-MM');

  SELECT id INTO _existing
    FROM public.fin_payables
   WHERE document_number = _docnum
     AND origem = 'PJ_CONTRATO'
   LIMIT 1;

  IF _existing IS NULL THEN
    INSERT INTO public.fin_payables
      (tenant_id, amount, due_date, competence_date, status,
       description, document_number, origem, notes)
    VALUES
      (NEW.tenant_id, NEW.contract_value, _due, _month_start, 'ABERTO',
       'Contrato PJ — ' || NEW.legal_name || ' (' || to_char(_month_start, 'MM/YYYY') || ')',
       _docnum, 'PJ_CONTRATO',
       'Provisão automática gerada pelo cadastro de PJ');
  ELSE
    UPDATE public.fin_payables
       SET amount      = NEW.contract_value,
           description = 'Contrato PJ — ' || NEW.legal_name || ' (' || to_char(_month_start, 'MM/YYYY') || ')',
           updated_at  = now()
     WHERE id = _existing
       AND status IN ('ABERTO','PARCIAL','VENCIDO');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS service_providers_auto_provision ON public.service_providers;
CREATE TRIGGER service_providers_auto_provision
AFTER INSERT OR UPDATE OF contract_value, status, legal_name, start_date, end_date
ON public.service_providers
FOR EACH ROW
EXECUTE FUNCTION public.tg_service_provider_auto_provision();
