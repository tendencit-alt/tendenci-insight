
-- Idempotência: 1 folha por colaborador/mês, 1 contrato PJ por prestador/mês
CREATE UNIQUE INDEX IF NOT EXISTS uq_fin_payables_rh_folha
  ON public.fin_payables (document_number)
  WHERE origem = 'RH_FOLHA';

CREATE UNIQUE INDEX IF NOT EXISTS uq_fin_payables_pj_contrato
  ON public.fin_payables (document_number)
  WHERE origem = 'PJ_CONTRATO';

-- Função: gerar folha do mês (idempotente)
CREATE OR REPLACE FUNCTION public.generate_hr_payroll_payables(_month date DEFAULT date_trunc('month', now())::date)
RETURNS TABLE(created int, updated int, skipped int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant uuid := public.get_user_tenant_id();
  _month_start date := date_trunc('month', _month)::date;
  _due date := (date_trunc('month', _month) + interval '1 month - 1 day')::date;
  _created int := 0; _updated int := 0; _skipped int := 0;
  r record;
  _docnum text;
  _existing uuid;
BEGIN
  IF _tenant IS NULL THEN RAISE EXCEPTION 'no tenant'; END IF;
  IF NOT public.can_view_hr_pii(_tenant) THEN RAISE EXCEPTION 'forbidden'; END IF;

  FOR r IN
    SELECT id, name, COALESCE(base_salary, 0) AS salary
    FROM public.hr_employees
    WHERE tenant_id = _tenant
      AND status = 'active'
      AND COALESCE(base_salary, 0) > 0
      AND (admission_date IS NULL OR admission_date <= _due)
      AND (termination_date IS NULL OR termination_date >= _month_start)
  LOOP
    _docnum := 'RH-FOLHA-' || r.id::text || '-' || to_char(_month_start, 'YYYY-MM');
    SELECT id INTO _existing FROM public.fin_payables
      WHERE document_number = _docnum AND origem = 'RH_FOLHA' LIMIT 1;
    IF _existing IS NULL THEN
      INSERT INTO public.fin_payables
        (tenant_id, amount, due_date, competence_date, status, description, document_number, origem, notes)
      VALUES
        (_tenant, r.salary, _due, _month_start, 'ABERTO',
         'Folha de pagamento — ' || r.name || ' (' || to_char(_month_start, 'MM/YYYY') || ')',
         _docnum, 'RH_FOLHA', 'Gerado automaticamente a partir do cadastro de RH');
      _created := _created + 1;
    ELSE
      UPDATE public.fin_payables
         SET amount = r.salary,
             due_date = _due,
             competence_date = _month_start,
             description = 'Folha de pagamento — ' || r.name || ' (' || to_char(_month_start, 'MM/YYYY') || ')',
             updated_at = now()
       WHERE id = _existing AND status IN ('ABERTO','PARCIAL','VENCIDO');
      IF FOUND THEN _updated := _updated + 1; ELSE _skipped := _skipped + 1; END IF;
    END IF;
  END LOOP;

  RETURN QUERY SELECT _created, _updated, _skipped;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_hr_payroll_payables(date) FROM public;
GRANT EXECUTE ON FUNCTION public.generate_hr_payroll_payables(date) TO authenticated, service_role;

-- Função: gerar parcela mensal de contratos PJ (idempotente)
CREATE OR REPLACE FUNCTION public.generate_pj_contract_payables(_month date DEFAULT date_trunc('month', now())::date)
RETURNS TABLE(created int, updated int, skipped int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant uuid := public.get_user_tenant_id();
  _month_start date := date_trunc('month', _month)::date;
  _due date := (date_trunc('month', _month) + interval '1 month - 1 day')::date;
  _created int := 0; _updated int := 0; _skipped int := 0;
  r record;
  _docnum text;
  _existing uuid;
BEGIN
  IF _tenant IS NULL THEN RAISE EXCEPTION 'no tenant'; END IF;
  IF NOT public.can_view_hr_pii(_tenant) THEN RAISE EXCEPTION 'forbidden'; END IF;

  FOR r IN
    SELECT id, legal_name, COALESCE(contract_value, 0) AS amount
    FROM public.service_providers
    WHERE tenant_id = _tenant
      AND status = 'active'
      AND COALESCE(contract_value, 0) > 0
      AND (start_date IS NULL OR start_date <= _due)
      AND (end_date IS NULL OR end_date >= _month_start)
  LOOP
    _docnum := 'PJ-CONTRATO-' || r.id::text || '-' || to_char(_month_start, 'YYYY-MM');
    SELECT id INTO _existing FROM public.fin_payables
      WHERE document_number = _docnum AND origem = 'PJ_CONTRATO' LIMIT 1;
    IF _existing IS NULL THEN
      INSERT INTO public.fin_payables
        (tenant_id, amount, due_date, competence_date, status, description, document_number, origem, notes)
      VALUES
        (_tenant, r.amount, _due, _month_start, 'ABERTO',
         'Contrato PJ — ' || r.legal_name || ' (' || to_char(_month_start, 'MM/YYYY') || ')',
         _docnum, 'PJ_CONTRATO', 'Gerado automaticamente a partir do cadastro de PJ');
      _created := _created + 1;
    ELSE
      UPDATE public.fin_payables
         SET amount = r.amount,
             due_date = _due,
             competence_date = _month_start,
             description = 'Contrato PJ — ' || r.legal_name || ' (' || to_char(_month_start, 'MM/YYYY') || ')',
             updated_at = now()
       WHERE id = _existing AND status IN ('ABERTO','PARCIAL','VENCIDO');
      IF FOUND THEN _updated := _updated + 1; ELSE _skipped := _skipped + 1; END IF;
    END IF;
  END LOOP;

  RETURN QUERY SELECT _created, _updated, _skipped;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_pj_contract_payables(date) FROM public;
GRANT EXECUTE ON FUNCTION public.generate_pj_contract_payables(date) TO authenticated, service_role;
