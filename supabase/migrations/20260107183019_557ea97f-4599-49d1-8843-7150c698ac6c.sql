-- Corrigir o trigger para fazer cast correto de text para app_module enum
CREATE OR REPLACE FUNCTION apply_permissions_on_profile_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se profile_type_id foi alterado e não existem permissões ainda
  IF NEW.profile_type_id IS NOT NULL 
     AND (OLD.profile_type_id IS NULL OR OLD.profile_type_id != NEW.profile_type_id)
     AND NOT EXISTS (SELECT 1 FROM user_permissions WHERE user_id = NEW.id LIMIT 1) THEN
    
    INSERT INTO public.user_permissions (user_id, module, can_view, can_create, can_edit, can_delete)
    SELECT NEW.id, ptp.module::app_module, ptp.can_view, ptp.can_create, ptp.can_edit, ptp.can_delete
    FROM public.profile_type_permissions ptp
    WHERE ptp.profile_type_id = NEW.profile_type_id
      AND ptp.module IN (SELECT enumlabel::text FROM pg_enum WHERE enumtypid = 'app_module'::regtype)
    ON CONFLICT (user_id, module) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;