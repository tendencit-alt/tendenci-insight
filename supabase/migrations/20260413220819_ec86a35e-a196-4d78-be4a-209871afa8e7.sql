
-- Scope restrictions per profile type
CREATE TABLE public.rbac_scope_restrictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_type_id UUID NOT NULL REFERENCES public.profile_types(id) ON DELETE CASCADE,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('empresa', 'unidade', 'centro_custo')),
  scope_mode TEXT NOT NULL DEFAULT 'all' CHECK (scope_mode IN ('all', 'specific')),
  allowed_ids TEXT[] DEFAULT '{}',
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (profile_type_id, scope_type)
);

ALTER TABLE public.rbac_scope_restrictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rbac_scope_tenant_isolation" ON public.rbac_scope_restrictions
  FOR ALL USING (
    tenant_id = (SELECT get_user_tenant_id()) OR public.is_owner()
  ) WITH CHECK (
    tenant_id = (SELECT get_user_tenant_id()) OR public.is_owner()
  );

-- Value limits per profile type and module
CREATE TABLE public.rbac_value_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_type_id UUID NOT NULL REFERENCES public.profile_types(id) ON DELETE CASCADE,
  module TEXT NOT NULL CHECK (module IN ('pagamentos', 'descontos', 'aprovacoes', 'compras', 'reembolsos')),
  max_value NUMERIC DEFAULT NULL,
  requires_approval_above NUMERIC DEFAULT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (profile_type_id, module)
);

ALTER TABLE public.rbac_value_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rbac_value_tenant_isolation" ON public.rbac_value_limits
  FOR ALL USING (
    tenant_id = (SELECT get_user_tenant_id()) OR public.is_owner()
  ) WITH CHECK (
    tenant_id = (SELECT get_user_tenant_id()) OR public.is_owner()
  );

-- Status-based edit rules
CREATE TABLE public.rbac_status_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_type_id UUID NOT NULL REFERENCES public.profile_types(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  blocked_status TEXT NOT NULL,
  blocked_action TEXT NOT NULL DEFAULT 'edit' CHECK (blocked_action IN ('edit', 'delete', 'approve', 'execute')),
  reason TEXT,
  active BOOLEAN DEFAULT true,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.rbac_status_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rbac_status_tenant_isolation" ON public.rbac_status_rules
  FOR ALL USING (
    tenant_id = (SELECT get_user_tenant_id()) OR public.is_owner()
  ) WITH CHECK (
    tenant_id = (SELECT get_user_tenant_id()) OR public.is_owner()
  );

-- Permission audit trail
CREATE TABLE public.rbac_permission_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (event_type IN ('grant', 'revoke', 'update', 'create_profile', 'delete_profile')),
  profile_type_id UUID REFERENCES public.profile_types(id) ON DELETE SET NULL,
  profile_type_name TEXT,
  target_user_id UUID,
  changed_by UUID NOT NULL,
  change_detail JSONB,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rbac_permission_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rbac_audit_tenant_isolation" ON public.rbac_permission_audit
  FOR ALL USING (
    tenant_id = (SELECT get_user_tenant_id()) OR public.is_owner()
  ) WITH CHECK (
    tenant_id = (SELECT get_user_tenant_id()) OR public.is_owner()
  );

-- Security definer function to check value limits
CREATE OR REPLACE FUNCTION public.check_rbac_value_limit(
  p_user_id UUID,
  p_module TEXT,
  p_value NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit RECORD;
  v_profile_type_id UUID;
BEGIN
  SELECT profile_type_id INTO v_profile_type_id
  FROM public.profiles WHERE id = p_user_id;
  
  IF v_profile_type_id IS NULL THEN
    RETURN jsonb_build_object('allowed', true, 'reason', 'no_profile_type');
  END IF;
  
  SELECT * INTO v_limit
  FROM public.rbac_value_limits
  WHERE profile_type_id = v_profile_type_id AND module = p_module;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', true, 'reason', 'no_limit_defined');
  END IF;
  
  IF v_limit.max_value IS NOT NULL AND p_value > v_limit.max_value THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'exceeds_max_value',
      'max_value', v_limit.max_value,
      'requires_approval', true
    );
  END IF;
  
  IF v_limit.requires_approval_above IS NOT NULL AND p_value > v_limit.requires_approval_above THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'reason', 'requires_approval',
      'approval_threshold', v_limit.requires_approval_above,
      'requires_approval', true
    );
  END IF;
  
  RETURN jsonb_build_object('allowed', true, 'reason', 'within_limits');
END;
$$;

-- Security definer function to check status rules
CREATE OR REPLACE FUNCTION public.check_rbac_status_rule(
  p_user_id UUID,
  p_module TEXT,
  p_status TEXT,
  p_action TEXT DEFAULT 'edit'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_type_id UUID;
  v_blocked BOOLEAN;
BEGIN
  SELECT profile_type_id INTO v_profile_type_id
  FROM public.profiles WHERE id = p_user_id;
  
  IF v_profile_type_id IS NULL THEN
    RETURN false;
  END IF;
  
  SELECT EXISTS (
    SELECT 1 FROM public.rbac_status_rules
    WHERE profile_type_id = v_profile_type_id
      AND module = p_module
      AND blocked_status = p_status
      AND blocked_action = p_action
      AND active = true
  ) INTO v_blocked;
  
  RETURN v_blocked;
END;
$$;

-- Indexes
CREATE INDEX idx_rbac_scope_profile ON public.rbac_scope_restrictions(profile_type_id);
CREATE INDEX idx_rbac_value_profile ON public.rbac_value_limits(profile_type_id);
CREATE INDEX idx_rbac_status_profile ON public.rbac_status_rules(profile_type_id);
CREATE INDEX idx_rbac_audit_tenant ON public.rbac_permission_audit(tenant_id, created_at DESC);
