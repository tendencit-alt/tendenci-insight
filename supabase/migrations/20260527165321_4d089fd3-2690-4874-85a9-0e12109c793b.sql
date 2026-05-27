
-- ── 1) hr_settings (one row per tenant) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hr_settings (
  tenant_id uuid PRIMARY KEY,
  fgts_pct numeric(6,3) NOT NULL DEFAULT 8.000,
  inss_cpp_pct numeric(6,3) NOT NULL DEFAULT 20.000,
  rat_pct numeric(6,3) NOT NULL DEFAULT 2.000,
  terceiros_pct numeric(6,3) NOT NULL DEFAULT 5.800,
  simples_optante boolean NOT NULL DEFAULT false,
  geofence_mode text NOT NULL DEFAULT 'warn' CHECK (geofence_mode IN ('off','warn','block')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.hr_settings TO authenticated;
GRANT ALL ON public.hr_settings TO service_role;

ALTER TABLE public.hr_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hr_settings tenant read" ON public.hr_settings;
CREATE POLICY "hr_settings tenant read" ON public.hr_settings
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id() OR public.is_owner());

DROP POLICY IF EXISTS "hr_settings admin write" ON public.hr_settings;
CREATE POLICY "hr_settings admin write" ON public.hr_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND public.can_view_hr_pii(tenant_id)
  );

DROP POLICY IF EXISTS "hr_settings admin update" ON public.hr_settings;
CREATE POLICY "hr_settings admin update" ON public.hr_settings
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND public.can_view_hr_pii(tenant_id))
  WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.can_view_hr_pii(tenant_id));

-- Seed defaults for existing tenants (idempotent)
INSERT INTO public.hr_settings (tenant_id)
SELECT id FROM public.tenants
ON CONFLICT (tenant_id) DO NOTHING;

-- Helper: ensure-and-return settings for a tenant (SECURITY DEFINER, locked)
CREATE OR REPLACE FUNCTION public.get_hr_settings(_tenant uuid)
RETURNS public.hr_settings
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r public.hr_settings;
BEGIN
  IF _tenant IS NULL THEN RETURN NULL; END IF;
  IF _tenant <> public.get_user_tenant_id() AND NOT public.is_owner() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT * INTO r FROM public.hr_settings WHERE tenant_id = _tenant;
  IF NOT FOUND THEN
    INSERT INTO public.hr_settings (tenant_id) VALUES (_tenant) RETURNING * INTO r;
  END IF;
  RETURN r;
END $$;

REVOKE ALL ON FUNCTION public.get_hr_settings(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_hr_settings(uuid) TO authenticated;

CREATE TRIGGER trg_hr_settings_updated_at
BEFORE UPDATE ON public.hr_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── 2) hr_work_locations ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hr_work_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.get_user_tenant_id(),
  name text NOT NULL,
  latitude numeric(10,6) NOT NULL,
  longitude numeric(10,6) NOT NULL,
  radius_m integer NOT NULL DEFAULT 150 CHECK (radius_m > 0 AND radius_m <= 100000),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hr_work_locations_tenant ON public.hr_work_locations(tenant_id) WHERE active;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_work_locations TO authenticated;
GRANT ALL ON public.hr_work_locations TO service_role;

ALTER TABLE public.hr_work_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "work_locations tenant read" ON public.hr_work_locations;
CREATE POLICY "work_locations tenant read" ON public.hr_work_locations
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id() OR public.is_owner());

DROP POLICY IF EXISTS "work_locations admin insert" ON public.hr_work_locations;
CREATE POLICY "work_locations admin insert" ON public.hr_work_locations
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.can_view_hr_pii(tenant_id));

DROP POLICY IF EXISTS "work_locations admin update" ON public.hr_work_locations;
CREATE POLICY "work_locations admin update" ON public.hr_work_locations
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND public.can_view_hr_pii(tenant_id))
  WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.can_view_hr_pii(tenant_id));

DROP POLICY IF EXISTS "work_locations admin delete" ON public.hr_work_locations;
CREATE POLICY "work_locations admin delete" ON public.hr_work_locations
  FOR DELETE TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND public.can_view_hr_pii(tenant_id));

CREATE TRIGGER trg_hr_work_locations_updated_at
BEFORE UPDATE ON public.hr_work_locations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── 3) within-fence flags on time records ────────────────────────────────
ALTER TABLE public.hr_time_records
  ADD COLUMN IF NOT EXISTS time_in_within_fence boolean,
  ADD COLUMN IF NOT EXISTS time_out_within_fence boolean,
  ADD COLUMN IF NOT EXISTS time_in_location_id uuid REFERENCES public.hr_work_locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS time_out_location_id uuid REFERENCES public.hr_work_locations(id) ON DELETE SET NULL;
