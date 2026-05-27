
-- =========================================================
-- 1) Helper: quem pode ver/editar salário e CPF de RH
-- =========================================================
CREATE OR REPLACE FUNCTION public.can_view_hr_pii(_tenant uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_owner()
    OR public.is_tenant_admin(_tenant)
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN public.profile_types pt ON pt.id = p.profile_type_id
      JOIN public.profile_type_permissions ptp ON ptp.profile_type_id = pt.id
      WHERE p.id = auth.uid()
        AND p.tenant_id = _tenant
        AND ptp.module = 'financeiro'
        AND (ptp.can_admin = true OR ptp.can_edit = true)
    );
$$;

REVOKE ALL ON FUNCTION public.can_view_hr_pii(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.can_view_hr_pii(uuid) TO authenticated, service_role;

-- =========================================================
-- 2) Extensão de hr_employees (compatível com o existente)
-- =========================================================
ALTER TABLE public.hr_employees
  ADD COLUMN IF NOT EXISTS contract_type    text DEFAULT 'CLT',
  ADD COLUMN IF NOT EXISTS dependents_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes            text;

-- Trava de escrita: somente admin+financeiro pode alterar salário/CPF
CREATE OR REPLACE FUNCTION public.hr_employees_guard_pii()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _t uuid := COALESCE(NEW.tenant_id, OLD.tenant_id);
BEGIN
  -- Apenas usuários habilitados podem definir/alterar salário e CPF
  IF TG_OP = 'INSERT' THEN
    IF (NEW.base_salary IS DISTINCT FROM 0 OR NEW.cpf IS NOT NULL)
       AND NOT public.can_view_hr_pii(_t) THEN
      -- Zera campos sensíveis se quem está inserindo não pode geri-los
      NEW.base_salary := 0;
      NEW.cpf := NULL;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF (NEW.base_salary IS DISTINCT FROM OLD.base_salary
        OR NEW.cpf IS DISTINCT FROM OLD.cpf)
       AND NOT public.can_view_hr_pii(_t) THEN
      RAISE EXCEPTION 'Sem permissão para alterar salário ou CPF (somente administradores e Financeiro/RH/PJ).'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hr_employees_guard_pii_trg ON public.hr_employees;
CREATE TRIGGER hr_employees_guard_pii_trg
BEFORE INSERT OR UPDATE ON public.hr_employees
FOR EACH ROW EXECUTE FUNCTION public.hr_employees_guard_pii();

-- =========================================================
-- 3) hr_time_records (ponto)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.hr_time_records (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL DEFAULT public.get_user_tenant_id() REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  work_date   date NOT NULL,
  time_in     time,
  time_out    time,
  worked_hours numeric GENERATED ALWAYS AS (
    CASE
      WHEN time_in IS NOT NULL AND time_out IS NOT NULL
        THEN EXTRACT(EPOCH FROM (time_out - time_in))/3600.0
      ELSE 0
    END
  ) STORED,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hr_time_records_tenant ON public.hr_time_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hr_time_records_emp_date ON public.hr_time_records(employee_id, work_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_time_records TO authenticated;
GRANT ALL ON public.hr_time_records TO service_role;
ALTER TABLE public.hr_time_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_select_hr_time_records ON public.hr_time_records FOR SELECT TO authenticated
  USING (public.tenant_rls_check(tenant_id));
CREATE POLICY tenant_insert_hr_time_records ON public.hr_time_records FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id());
CREATE POLICY tenant_update_hr_time_records ON public.hr_time_records FOR UPDATE TO authenticated
  USING (public.tenant_rls_check(tenant_id));
CREATE POLICY admin_only_delete_hr_time_records ON public.hr_time_records FOR DELETE TO authenticated
  USING (public.is_tenant_admin(tenant_id));

-- =========================================================
-- 4) hr_medical_certificates (atestados)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.hr_medical_certificates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL DEFAULT public.get_user_tenant_id() REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  start_date  date NOT NULL,
  end_date    date NOT NULL,
  days_count  integer GENERATED ALWAYS AS ((end_date - start_date) + 1) STORED,
  cid         text,
  file_path   text,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hr_med_cert_tenant ON public.hr_medical_certificates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hr_med_cert_emp ON public.hr_medical_certificates(employee_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_medical_certificates TO authenticated;
GRANT ALL ON public.hr_medical_certificates TO service_role;
ALTER TABLE public.hr_medical_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_select_hr_med_cert ON public.hr_medical_certificates FOR SELECT TO authenticated
  USING (public.tenant_rls_check(tenant_id));
CREATE POLICY tenant_insert_hr_med_cert ON public.hr_medical_certificates FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id());
CREATE POLICY tenant_update_hr_med_cert ON public.hr_medical_certificates FOR UPDATE TO authenticated
  USING (public.tenant_rls_check(tenant_id));
CREATE POLICY admin_only_delete_hr_med_cert ON public.hr_medical_certificates FOR DELETE TO authenticated
  USING (public.is_tenant_admin(tenant_id));

-- =========================================================
-- 5) hr_absences (faltas)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.hr_absences (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL DEFAULT public.get_user_tenant_id() REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id     uuid NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  absence_date    date NOT NULL,
  absence_type    text NOT NULL DEFAULT 'falta', -- falta | atraso | atestado | folga
  justified       boolean NOT NULL DEFAULT false,
  certificate_id  uuid REFERENCES public.hr_medical_certificates(id) ON DELETE SET NULL,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hr_absences_tenant ON public.hr_absences(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hr_absences_emp_date ON public.hr_absences(employee_id, absence_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_absences TO authenticated;
GRANT ALL ON public.hr_absences TO service_role;
ALTER TABLE public.hr_absences ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_select_hr_absences ON public.hr_absences FOR SELECT TO authenticated
  USING (public.tenant_rls_check(tenant_id));
CREATE POLICY tenant_insert_hr_absences ON public.hr_absences FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id());
CREATE POLICY tenant_update_hr_absences ON public.hr_absences FOR UPDATE TO authenticated
  USING (public.tenant_rls_check(tenant_id));
CREATE POLICY admin_only_delete_hr_absences ON public.hr_absences FOR DELETE TO authenticated
  USING (public.is_tenant_admin(tenant_id));

-- =========================================================
-- 6) service_providers (PJ)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.service_providers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL DEFAULT public.get_user_tenant_id() REFERENCES public.tenants(id) ON DELETE CASCADE,
  legal_name      text NOT NULL,
  cnpj            text,
  service_type    text,
  contract_value  numeric NOT NULL DEFAULT 0,
  start_date      date,
  end_date        date,
  status          text NOT NULL DEFAULT 'active', -- active | inactive | terminated
  responsible_id  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_service_providers_tenant ON public.service_providers(tenant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_providers TO authenticated;
GRANT ALL ON public.service_providers TO service_role;
ALTER TABLE public.service_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_select_service_providers ON public.service_providers FOR SELECT TO authenticated
  USING (public.tenant_rls_check(tenant_id));
CREATE POLICY tenant_insert_service_providers ON public.service_providers FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id());
CREATE POLICY tenant_update_service_providers ON public.service_providers FOR UPDATE TO authenticated
  USING (public.tenant_rls_check(tenant_id));
CREATE POLICY admin_only_delete_service_providers ON public.service_providers FOR DELETE TO authenticated
  USING (public.is_tenant_admin(tenant_id));

-- =========================================================
-- 7) service_provider_documents
-- =========================================================
CREATE TABLE IF NOT EXISTS public.service_provider_documents (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL DEFAULT public.get_user_tenant_id() REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  doc_type    text NOT NULL DEFAULT 'contrato', -- contrato | aditivo | nota | outro
  description text,
  file_path   text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_service_provider_docs_tenant ON public.service_provider_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_service_provider_docs_provider ON public.service_provider_documents(provider_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_provider_documents TO authenticated;
GRANT ALL ON public.service_provider_documents TO service_role;
ALTER TABLE public.service_provider_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_select_sp_docs ON public.service_provider_documents FOR SELECT TO authenticated
  USING (public.tenant_rls_check(tenant_id));
CREATE POLICY tenant_insert_sp_docs ON public.service_provider_documents FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id());
CREATE POLICY tenant_update_sp_docs ON public.service_provider_documents FOR UPDATE TO authenticated
  USING (public.tenant_rls_check(tenant_id));
CREATE POLICY admin_only_delete_sp_docs ON public.service_provider_documents FOR DELETE TO authenticated
  USING (public.is_tenant_admin(tenant_id));

-- =========================================================
-- 8) updated_at triggers
-- =========================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname='update_updated_at_column') THEN
    CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql AS $f$
    BEGIN NEW.updated_at = now(); RETURN NEW; END;
    $f$;
  END IF;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'hr_time_records','hr_medical_certificates','hr_absences','service_providers'
  ] LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS set_updated_at_%1$s ON public.%1$s;
       CREATE TRIGGER set_updated_at_%1$s BEFORE UPDATE ON public.%1$s
       FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();', t);
  END LOOP;
END $$;

-- =========================================================
-- 9) Storage: buckets privados por inquilino
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('hr-medical-certificates','hr-medical-certificates', false)
ON CONFLICT (id) DO UPDATE SET public = false;

INSERT INTO storage.buckets (id, name, public)
VALUES ('service-provider-documents','service-provider-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Resolver de tenant baseado no caminho do arquivo (primeiro segmento = tenant_id)
-- Já existe public.storage_tenant_for em outras migrações; aqui usamos o padrão de
-- foldername(name)[1] = tenant_id::text, mesmo padrão das outras políticas seguras.

DO $$
DECLARE b text;
BEGIN
  FOREACH b IN ARRAY ARRAY['hr-medical-certificates','service-provider-documents'] LOOP
    EXECUTE format($p$DROP POLICY IF EXISTS "select_%1$s_tenant" ON storage.objects;$p$, b);
    EXECUTE format($p$DROP POLICY IF EXISTS "insert_%1$s_tenant" ON storage.objects;$p$, b);
    EXECUTE format($p$DROP POLICY IF EXISTS "update_%1$s_tenant" ON storage.objects;$p$, b);
    EXECUTE format($p$DROP POLICY IF EXISTS "delete_%1$s_admin"  ON storage.objects;$p$, b);

    EXECUTE format($p$
      CREATE POLICY "select_%1$s_tenant" ON storage.objects FOR SELECT TO authenticated
      USING (
        bucket_id = %1$L AND (
          public.is_owner()
          OR (storage.foldername(name))[1] = public.get_user_tenant_id()::text
        )
      );$p$, b);

    EXECUTE format($p$
      CREATE POLICY "insert_%1$s_tenant" ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = %1$L AND (
          public.is_owner()
          OR (storage.foldername(name))[1] = public.get_user_tenant_id()::text
        )
      );$p$, b);

    EXECUTE format($p$
      CREATE POLICY "update_%1$s_tenant" ON storage.objects FOR UPDATE TO authenticated
      USING (
        bucket_id = %1$L AND (
          public.is_owner()
          OR (storage.foldername(name))[1] = public.get_user_tenant_id()::text
        )
      );$p$, b);

    EXECUTE format($p$
      CREATE POLICY "delete_%1$s_admin" ON storage.objects FOR DELETE TO authenticated
      USING (
        bucket_id = %1$L AND (
          public.is_owner()
          OR (
            (storage.foldername(name))[1] = public.get_user_tenant_id()::text
            AND public.is_tenant_admin(public.get_user_tenant_id())
          )
        )
      );$p$, b);
  END LOOP;
END $$;
