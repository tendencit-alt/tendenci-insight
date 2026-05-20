
CREATE TABLE IF NOT EXISTS public.user_permission_overrides (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id),
  module text NOT NULL,
  has_override boolean NOT NULL DEFAULT true,
  can_view boolean NOT NULL DEFAULT false,
  can_create boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  can_approve boolean NOT NULL DEFAULT false,
  can_conciliate boolean NOT NULL DEFAULT false,
  can_export boolean NOT NULL DEFAULT false,
  can_admin boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, module)
);

CREATE INDEX IF NOT EXISTS idx_user_permission_overrides_user ON public.user_permission_overrides(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permission_overrides_tenant ON public.user_permission_overrides(tenant_id);

ALTER TABLE public.user_permission_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage user permission overrides"
ON public.user_permission_overrides
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.is_owner = true OR p.role::text IN ('admin','owner','tenant_owner','tenant_admin'))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.is_owner = true OR p.role::text IN ('admin','owner','tenant_owner','tenant_admin'))
  )
);

CREATE POLICY "Users view their own permission overrides"
ON public.user_permission_overrides
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "tenant_isolation_user_permission_overrides"
ON public.user_permission_overrides
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (public.tenant_rls_check(tenant_id))
WITH CHECK (public.tenant_rls_check(tenant_id));

CREATE TRIGGER trg_user_permission_overrides_updated
BEFORE UPDATE ON public.user_permission_overrides
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
