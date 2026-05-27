CREATE OR REPLACE FUNCTION public.get_hr_pj_kpis(_month date DEFAULT (date_trunc('month', now()))::date)
RETURNS TABLE (
  employees_active integer,
  providers_active integer,
  payroll_cost_month numeric,
  pj_cost_month numeric,
  vacation_provision_total numeric,
  absences_month integer,
  pending_certificates integer,
  punches_today integer,
  punches_outside_today integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant uuid := public.get_user_tenant_id();
  _start  date := date_trunc('month', _month)::date;
  _end    date := (date_trunc('month', _month) + interval '1 month - 1 day')::date;
  _today  date := current_date;
BEGIN
  IF _tenant IS NULL THEN
    RAISE EXCEPTION 'no tenant';
  END IF;
  IF NOT public.can_view_hr_pii(_tenant) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT count(*)::int
       FROM public.hr_employees
      WHERE tenant_id = _tenant AND status = 'active'),

    (SELECT count(*)::int
       FROM public.service_providers
      WHERE tenant_id = _tenant AND status = 'active'),

    (SELECT COALESCE(SUM(base_salary),0)::numeric
       FROM public.hr_employees
      WHERE tenant_id = _tenant
        AND status = 'active'
        AND (admission_date IS NULL OR admission_date <= _end)
        AND (termination_date IS NULL OR termination_date >= _start)),

    (SELECT COALESCE(SUM(contract_value),0)::numeric
       FROM public.service_providers
      WHERE tenant_id = _tenant
        AND status = 'active'
        AND (start_date IS NULL OR start_date <= _end)
        AND (end_date IS NULL OR end_date >= _start)),

    -- Provisão de férias: (salário/12)*(4/3) * meses_no_período_aquisitivo
    (SELECT COALESCE(SUM(
        CASE
          WHEN COALESCE(base_salary,0) > 0 AND admission_date IS NOT NULL THEN
            (base_salary / 12.0 * (4.0/3.0))
            * ((
                (EXTRACT(YEAR  FROM age(current_date, admission_date))::int) * 12
              +  EXTRACT(MONTH FROM age(current_date, admission_date))::int
              ) % 12)
          ELSE 0
        END
      ), 0)::numeric
       FROM public.hr_employees
      WHERE tenant_id = _tenant AND status = 'active'),

    (SELECT count(*)::int
       FROM public.hr_absences a
       JOIN public.hr_employees e ON e.id = a.employee_id
      WHERE e.tenant_id = _tenant
        AND a.absence_date BETWEEN _start AND _end
        AND a.absence_type = 'falta'),

    (SELECT count(*)::int
       FROM public.hr_medical_certificates c
       JOIN public.hr_employees e ON e.id = c.employee_id
      WHERE e.tenant_id = _tenant
        AND c.end_date >= current_date),

    (SELECT count(*)::int
       FROM public.hr_time_records
      WHERE tenant_id = _tenant
        AND work_date = _today
        AND (time_in IS NOT NULL OR time_out IS NOT NULL)),

    (SELECT count(*)::int
       FROM public.hr_time_records
      WHERE tenant_id = _tenant
        AND work_date = _today
        AND (time_in_within_fence = false OR time_out_within_fence = false));
END;
$$;

REVOKE ALL ON FUNCTION public.get_hr_pj_kpis(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_hr_pj_kpis(date) TO authenticated, service_role;