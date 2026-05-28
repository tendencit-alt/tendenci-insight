CREATE TABLE IF NOT EXISTS public.email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid,
  template_id text NOT NULL,
  to_email text NOT NULL,
  status text NOT NULL CHECK (status IN ('sent','failed','skipped_no_credential')),
  provider_id text,
  error_message text,
  variables jsonb NOT NULL DEFAULT '{}'::jsonb,
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_log_tenant_idx ON public.email_log(tenant_id);
CREATE INDEX IF NOT EXISTS email_log_template_idx ON public.email_log(template_id);
CREATE INDEX IF NOT EXISTS email_log_sent_at_idx ON public.email_log(sent_at DESC);

GRANT SELECT ON public.email_log TO authenticated;
GRANT ALL ON public.email_log TO service_role;

ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "email_log_select"
    ON public.email_log FOR SELECT
    TO authenticated
    USING (public.is_owner() OR public.tenant_rls_check(tenant_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;