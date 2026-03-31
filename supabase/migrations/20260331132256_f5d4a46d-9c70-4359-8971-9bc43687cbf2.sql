
-- 1) Clean stale profile_type_permissions (old profile_type_ids no longer exist)
DELETE FROM profile_type_permissions 
WHERE profile_type_id NOT IN (SELECT id FROM profile_types);

-- 2) Add missing values to app_module enum for current system modules
DO $$
BEGIN
  -- Add new modules if not exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'financeiro' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_module')) THEN
    ALTER TYPE app_module ADD VALUE 'financeiro';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'cadastros_financeiros' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_module')) THEN
    ALTER TYPE app_module ADD VALUE 'cadastros_financeiros';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'system_errors' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_module')) THEN
    ALTER TYPE app_module ADD VALUE 'system_errors';
  END IF;
END$$;

-- 3) Change profile_type_permissions.module from text to allow any module name (keep as text, it's fine)
-- It's already text type, good.

-- 4) Replace the initialize_user_permissions trigger function 
-- to use the current module names and copy from profile_type_permissions
CREATE OR REPLACE FUNCTION public.initialize_user_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins don't need permissions (full access)
  IF NEW.role = 'admin' THEN
    RETURN NEW;
  END IF;

  -- If profile_type_id is set, copy permissions from profile_type_permissions
  IF NEW.profile_type_id IS NOT NULL THEN
    -- Delete existing permissions first to avoid stale data
    DELETE FROM public.user_permissions WHERE user_id = NEW.id;
    
    INSERT INTO public.user_permissions (user_id, module, can_view, can_create, can_edit, can_delete)
    SELECT
      NEW.id,
      ptp.module::app_module,
      COALESCE(ptp.can_view, false),
      COALESCE(ptp.can_create, false),
      COALESCE(ptp.can_edit, false),
      COALESCE(ptp.can_delete, false)
    FROM public.profile_type_permissions ptp
    WHERE ptp.profile_type_id = NEW.profile_type_id
      AND ptp.module IN (
        SELECT enumlabel FROM pg_enum 
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_module')
      )
    ON CONFLICT (user_id, module) DO UPDATE SET
      can_view = EXCLUDED.can_view,
      can_create = EXCLUDED.can_create,
      can_edit = EXCLUDED.can_edit,
      can_delete = EXCLUDED.can_delete;

    RETURN NEW;
  END IF;

  -- Fallback: basic permissions for non-admin without profile_type
  INSERT INTO public.user_permissions (user_id, module, can_view, can_create, can_edit, can_delete)
  VALUES
    (NEW.id, 'dashboard', true, false, false, false)
  ON CONFLICT (user_id, module) DO NOTHING;

  RETURN NEW;
END;
$$;
