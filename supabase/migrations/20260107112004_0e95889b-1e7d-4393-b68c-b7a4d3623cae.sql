-- 1. Criar função para aplicar permissões quando profile_type_id é atualizado
CREATE OR REPLACE FUNCTION public.apply_permissions_on_profile_update()
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
    SELECT NEW.id, ptp.module, ptp.can_view, ptp.can_create, ptp.can_edit, ptp.can_delete
    FROM public.profile_type_permissions ptp
    WHERE ptp.profile_type_id = NEW.profile_type_id
    ON CONFLICT (user_id, module) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. Criar trigger para UPDATE em profiles
DROP TRIGGER IF EXISTS trigger_apply_permissions_on_update ON public.profiles;
CREATE TRIGGER trigger_apply_permissions_on_update
AFTER UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.apply_permissions_on_profile_update();

-- 3. Configurar permissões padrão para tipo "projetista"
INSERT INTO profile_type_permissions (profile_type_id, module, can_view, can_create, can_edit, can_delete)
SELECT pt.id, perms.module, perms.can_view, perms.can_create, perms.can_edit, perms.can_delete
FROM profile_types pt
CROSS JOIN (VALUES 
  ('dashboard', true, false, false, false),
  ('producao', true, true, true, false),
  ('estoque', true, true, true, false),
  ('compras', true, true, true, false),
  ('pedidos', true, true, true, false),
  ('projetos', true, true, true, false)
) AS perms(module, can_view, can_create, can_edit, can_delete)
WHERE pt.name = 'projetista'
ON CONFLICT (profile_type_id, module) DO UPDATE SET
  can_view = EXCLUDED.can_view,
  can_create = EXCLUDED.can_create,
  can_edit = EXCLUDED.can_edit,
  can_delete = EXCLUDED.can_delete;

-- 4. Configurar permissões padrão para tipo "vendedor"
INSERT INTO profile_type_permissions (profile_type_id, module, can_view, can_create, can_edit, can_delete)
SELECT pt.id, perms.module, perms.can_view, perms.can_create, perms.can_edit, perms.can_delete
FROM profile_types pt
CROSS JOIN (VALUES 
  ('dashboard', true, false, false, false),
  ('crm', true, true, true, false),
  ('leads', true, true, true, false),
  ('arquitetos', true, true, true, false),
  ('prospeccao', true, true, true, false),
  ('pedidos', true, true, true, false),
  ('metas', true, false, false, false)
) AS perms(module, can_view, can_create, can_edit, can_delete)
WHERE pt.name = 'vendedor'
ON CONFLICT (profile_type_id, module) DO UPDATE SET
  can_view = EXCLUDED.can_view,
  can_create = EXCLUDED.can_create,
  can_edit = EXCLUDED.can_edit,
  can_delete = EXCLUDED.can_delete;

-- 5. Configurar permissões padrão para tipo "arquiteto"
INSERT INTO profile_type_permissions (profile_type_id, module, can_view, can_create, can_edit, can_delete)
SELECT pt.id, perms.module, perms.can_view, perms.can_create, perms.can_edit, perms.can_delete
FROM profile_types pt
CROSS JOIN (VALUES 
  ('dashboard', true, false, false, false),
  ('catalogo', true, false, false, false),
  ('projetos', true, true, true, false)
) AS perms(module, can_view, can_create, can_edit, can_delete)
WHERE pt.name = 'arquiteto'
ON CONFLICT (profile_type_id, module) DO UPDATE SET
  can_view = EXCLUDED.can_view,
  can_create = EXCLUDED.can_create,
  can_edit = EXCLUDED.can_edit,
  can_delete = EXCLUDED.can_delete;

-- 6. Corrigir permissões da Adriana (usuário existente)
UPDATE user_permissions 
SET can_view = true 
WHERE user_id = 'c23e82db-ec6e-4e4e-9016-fcc2ad34dda1' 
AND module IN ('dashboard', 'producao', 'estoque', 'compras', 'pedidos', 'projetos');