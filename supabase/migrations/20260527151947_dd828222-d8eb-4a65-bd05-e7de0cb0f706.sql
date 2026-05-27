
-- 1. Add cost_center_id and chart_account_id to hr_employees
ALTER TABLE public.hr_employees
  ADD COLUMN IF NOT EXISTS cost_center_id uuid REFERENCES public.fin_cost_centers(id),
  ADD COLUMN IF NOT EXISTS chart_account_id uuid REFERENCES public.fin_chart_accounts(id);

CREATE INDEX IF NOT EXISTS idx_hr_employees_cc ON public.hr_employees(cost_center_id);
CREATE INDEX IF NOT EXISTS idx_hr_employees_ca ON public.hr_employees(chart_account_id);

-- 2. Extend hr_time_records with punch-in/out photo + geolocation
ALTER TABLE public.hr_time_records
  ADD COLUMN IF NOT EXISTS time_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS time_in_photo_path text,
  ADD COLUMN IF NOT EXISTS time_in_lat numeric(10,6),
  ADD COLUMN IF NOT EXISTS time_in_lng numeric(10,6),
  ADD COLUMN IF NOT EXISTS time_in_accuracy numeric,
  ADD COLUMN IF NOT EXISTS time_out_at timestamptz,
  ADD COLUMN IF NOT EXISTS time_out_photo_path text,
  ADD COLUMN IF NOT EXISTS time_out_lat numeric(10,6),
  ADD COLUMN IF NOT EXISTS time_out_lng numeric(10,6),
  ADD COLUMN IF NOT EXISTS time_out_accuracy numeric;

-- 3. Private storage bucket for time-clock photos (tenant-scoped via path prefix)
INSERT INTO storage.buckets (id, name, public)
VALUES ('hr-time-photos', 'hr-time-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if rerun
DROP POLICY IF EXISTS "hr_time_photos_select" ON storage.objects;
DROP POLICY IF EXISTS "hr_time_photos_insert" ON storage.objects;
DROP POLICY IF EXISTS "hr_time_photos_update" ON storage.objects;
DROP POLICY IF EXISTS "hr_time_photos_delete" ON storage.objects;

-- Path convention: {tenant_id}/{employee_id}/{yyyy-mm-dd}_{in|out}_{ts}.jpg
CREATE POLICY "hr_time_photos_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'hr-time-photos'
         AND (storage.foldername(name))[1] = public.get_user_tenant_id()::text);

CREATE POLICY "hr_time_photos_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'hr-time-photos'
              AND (storage.foldername(name))[1] = public.get_user_tenant_id()::text);

CREATE POLICY "hr_time_photos_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'hr-time-photos'
         AND (storage.foldername(name))[1] = public.get_user_tenant_id()::text);

CREATE POLICY "hr_time_photos_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'hr-time-photos'
         AND (storage.foldername(name))[1] = public.get_user_tenant_id()::text
         AND public.is_tenant_admin(public.get_user_tenant_id()));

-- 4. Update payroll generator to propagate employee CC + chart account
CREATE OR REPLACE FUNCTION public.generate_hr_payroll_payables(_month date DEFAULT (date_trunc('month'::text, now()))::date)
 RETURNS TABLE(created integer, updated integer, skipped integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    SELECT id, name, COALESCE(base_salary, 0) AS salary,
           cost_center_id, chart_account_id
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
        (tenant_id, amount, due_date, competence_date, status, description, document_number, origem, notes,
         cost_center_id, chart_account_id)
      VALUES
        (_tenant, r.salary, _due, _month_start, 'ABERTO',
         'Folha de pagamento — ' || r.name || ' (' || to_char(_month_start, 'MM/YYYY') || ')',
         _docnum, 'RH_FOLHA', 'Gerado automaticamente a partir do cadastro de RH',
         r.cost_center_id, r.chart_account_id);
      _created := _created + 1;
    ELSE
      UPDATE public.fin_payables
         SET amount = r.salary,
             due_date = _due,
             competence_date = _month_start,
             description = 'Folha de pagamento — ' || r.name || ' (' || to_char(_month_start, 'MM/YYYY') || ')',
             cost_center_id = COALESCE(cost_center_id, r.cost_center_id),
             chart_account_id = COALESCE(chart_account_id, r.chart_account_id),
             updated_at = now()
       WHERE id = _existing AND status IN ('ABERTO','PARCIAL','VENCIDO');
      IF FOUND THEN _updated := _updated + 1; ELSE _skipped := _skipped + 1; END IF;
    END IF;
  END LOOP;

  RETURN QUERY SELECT _created, _updated, _skipped;
END;
$function$;
