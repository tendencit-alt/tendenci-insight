-- ========================================
-- RBAC UNIFICATION — 5 system roles + custom per tenant
-- Safe: no hard-delete, no auth/owner changes, no RLS changes
-- ========================================

-- IDs constants (existing)
-- administrador : b4752702-3a67-4346-844c-c6d9a47b7f41
-- auditoria     : 28055970-39b9-4bb1-b440-f672a8b206f7
-- comercial     : be61d3c1-4fe3-4072-bea7-74f9b50c775b
-- controladoria : 2e3c27e7-94f4-4acd-863a-6de2c86e5540  (will be deactivated, merged into financeiro)
-- financeiro    : 7e950053-665f-4f76-892b-19b3a296fc8f
-- gestor        : 62ef6c14-7385-4368-9042-051f0bde6f69  (will be deactivated → administrador)
-- operacional   : 36069a99-af59-476b-8249-5e4b552b2bf0
-- owner         : 706d1207-1bef-4abf-9a89-65e14b011ceb  (platform-only, NOT assignable from tenant UI)

-- 1) MERGE controladoria capabilities into financeiro (per module, OR-ing flags)
-- 1.a Insert modules controladoria has but financeiro lacks
INSERT INTO public.profile_type_permissions
  (profile_type_id, module, can_view, can_create, can_edit, can_delete, can_approve, can_conciliate, can_export, can_admin)
SELECT
  '7e950053-665f-4f76-892b-19b3a296fc8f'::uuid,
  c.module,
  c.can_view, c.can_create, c.can_edit, c.can_delete,
  c.can_approve, c.can_conciliate, c.can_export, c.can_admin
FROM public.profile_type_permissions c
WHERE c.profile_type_id = '2e3c27e7-94f4-4acd-863a-6de2c86e5540'
  AND NOT EXISTS (
    SELECT 1 FROM public.profile_type_permissions f
    WHERE f.profile_type_id = '7e950053-665f-4f76-892b-19b3a296fc8f'
      AND f.module = c.module
  );

-- 1.b OR-merge flags where both exist
UPDATE public.profile_type_permissions f
SET
  can_view       = f.can_view       OR c.can_view,
  can_create     = f.can_create     OR c.can_create,
  can_edit       = f.can_edit       OR c.can_edit,
  can_delete     = f.can_delete     OR c.can_delete,
  can_approve    = f.can_approve    OR c.can_approve,
  can_conciliate = COALESCE(f.can_conciliate,false) OR COALESCE(c.can_conciliate,false),
  can_export     = COALESCE(f.can_export,false)     OR COALESCE(c.can_export,false),
  can_admin      = f.can_admin      OR c.can_admin
FROM public.profile_type_permissions c
WHERE c.profile_type_id = '2e3c27e7-94f4-4acd-863a-6de2c86e5540'
  AND f.profile_type_id = '7e950053-665f-4f76-892b-19b3a296fc8f'
  AND f.module = c.module;

-- 2) REASSIGN users using legacy profile_types BEFORE deactivating
UPDATE public.profiles
SET profile_type_id = 'b4752702-3a67-4346-844c-c6d9a47b7f41'
WHERE profile_type_id = '62ef6c14-7385-4368-9042-051f0bde6f69'; -- gestor → administrador

UPDATE public.profiles
SET profile_type_id = '7e950053-665f-4f76-892b-19b3a296fc8f'
WHERE profile_type_id = '2e3c27e7-94f4-4acd-863a-6de2c86e5540'; -- controladoria → financeiro

-- 3) DEACTIVATE legacy types (NOT hard delete)
UPDATE public.profile_types
SET is_active = false
WHERE name IN ('gestor','controladoria');

-- 4) BACKFILL profile_type_id for users without one
-- Platform Owner (is_owner=true) → administrador, keeps is_owner & role='owner'
UPDATE public.profiles
SET profile_type_id = 'b4752702-3a67-4346-844c-c6d9a47b7f41'
WHERE profile_type_id IS NULL AND is_owner = true;

-- Admin-like users → administrador
UPDATE public.profiles
SET profile_type_id = 'b4752702-3a67-4346-844c-c6d9a47b7f41'
WHERE profile_type_id IS NULL
  AND role IN ('admin','owner','tenant_owner');

-- Vendedor / vendas → comercial
UPDATE public.profiles
SET profile_type_id = 'be61d3c1-4fe3-4072-bea7-74f9b50c775b'
WHERE profile_type_id IS NULL
  AND role IN ('vendedor');

-- Final safety net: anything still NULL → auditoria (read-only)
UPDATE public.profiles
SET profile_type_id = '28055970-39b9-4bb1-b440-f672a8b206f7'
WHERE profile_type_id IS NULL;

-- 5) UNIFY user_tenants.role (text) to canonical profile_type name
--    Reserve 'owner' for the platform owner only.
UPDATE public.user_tenants ut
SET role = pt.name
FROM public.profiles p
JOIN public.profile_types pt ON pt.id = p.profile_type_id
WHERE ut.user_id = p.id
  AND p.is_owner = false
  AND COALESCE(ut.role,'') <> pt.name;

-- 6) Helper view (idempotent) so app can resolve the effective role label easily
CREATE OR REPLACE VIEW public.v_user_effective_role AS
SELECT
  p.id              AS user_id,
  p.tenant_id,
  p.is_owner,
  p.profile_type_id,
  COALESCE(pt.name, p.role::text) AS effective_role_name,
  COALESCE(pt.display_name, p.role::text) AS effective_role_label
FROM public.profiles p
LEFT JOIN public.profile_types pt ON pt.id = p.profile_type_id;

-- 7) Make NOT NULL going forward (defensive — only if no NULLs remain)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE profile_type_id IS NULL) THEN
    BEGIN
      ALTER TABLE public.profiles
        ALTER COLUMN profile_type_id SET NOT NULL;
    EXCEPTION WHEN others THEN
      -- swallow if a trigger / fk prevents it; backfill is already done
      NULL;
    END;
  END IF;
END $$;