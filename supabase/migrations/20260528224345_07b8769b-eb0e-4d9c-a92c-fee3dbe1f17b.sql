
-- LGPD: soft delete on profiles + deletion_requests table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS scheduled_hard_delete_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_profiles_scheduled_hard_delete ON public.profiles(scheduled_hard_delete_at) WHERE scheduled_hard_delete_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.lgpd_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid,
  email text NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  scheduled_hard_delete_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  processed_at timestamptz,
  notes text
);

GRANT SELECT, INSERT ON public.lgpd_deletion_requests TO authenticated;
GRANT ALL ON public.lgpd_deletion_requests TO service_role;

ALTER TABLE public.lgpd_deletion_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users view own deletion requests" ON public.lgpd_deletion_requests;
CREATE POLICY "users view own deletion requests"
  ON public.lgpd_deletion_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users insert own deletion requests" ON public.lgpd_deletion_requests;
CREATE POLICY "users insert own deletion requests"
  ON public.lgpd_deletion_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- LGPD export log (audit only)
CREATE TABLE IF NOT EXISTS public.lgpd_export_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid,
  exported_at timestamptz NOT NULL DEFAULT now(),
  ip text
);

GRANT SELECT, INSERT ON public.lgpd_export_log TO authenticated;
GRANT ALL ON public.lgpd_export_log TO service_role;

ALTER TABLE public.lgpd_export_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users view own export log" ON public.lgpd_export_log;
CREATE POLICY "users view own export log"
  ON public.lgpd_export_log FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users insert own export log" ON public.lgpd_export_log;
CREATE POLICY "users insert own export log"
  ON public.lgpd_export_log FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
