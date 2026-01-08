-- 1. Popular permissões padrão para o tipo "Produção" (ID: 72ecd8a5-565c-4bbd-b4c7-7d9ff01c21d5)
INSERT INTO profile_type_permissions (profile_type_id, module, can_view, can_create, can_edit, can_delete)
SELECT 
  '72ecd8a5-565c-4bbd-b4c7-7d9ff01c21d5',
  m.module,
  CASE WHEN m.module IN ('dashboard', 'producao', 'pedidos', 'estoque') THEN true ELSE false END,
  CASE WHEN m.module IN ('producao', 'pedidos') THEN true ELSE false END,
  CASE WHEN m.module IN ('producao', 'pedidos') THEN true ELSE false END,
  false
FROM (
  VALUES ('dashboard'), ('prospeccao'), ('arquitetos'), ('crm'), ('projetos'), 
         ('metas'), ('leads'), ('dashboards_personalizados'), ('configuracoes'),
         ('gestao_usuarios'), ('producao'), ('fornecedores'), ('estoque'), 
         ('compras'), ('pedidos'), ('fichas_tecnicas'), ('ia_configuracao')
) AS m(module)
WHERE NOT EXISTS (
  SELECT 1 FROM profile_type_permissions 
  WHERE profile_type_id = '72ecd8a5-565c-4bbd-b4c7-7d9ff01c21d5'
  AND module = m.module
);

-- 2. Corrigir permissões da Adriana imediatamente
UPDATE user_permissions 
SET 
  can_view = CASE 
    WHEN module IN ('dashboard', 'producao', 'pedidos', 'estoque') THEN true 
    ELSE false 
  END,
  can_create = CASE 
    WHEN module IN ('producao', 'pedidos') THEN true 
    ELSE false 
  END,
  can_edit = CASE 
    WHEN module IN ('producao', 'pedidos') THEN true 
    ELSE false 
  END
WHERE user_id = 'c23e82db-ec6e-4e4e-9016-fcc2ad34dda1';

-- 3. Atualizar a função initialize_user_permissions para usar profile_type_permissions
CREATE OR REPLACE FUNCTION public.initialize_user_permissions()
RETURNS TRIGGER AS $$
BEGIN
  -- Admins não precisam de permissões (têm acesso total)
  IF NEW.role = 'admin' THEN
    RETURN NEW;
  END IF;

  -- Se tem profile_type_id, copiar permissões do tipo de perfil
  IF NEW.profile_type_id IS NOT NULL THEN
    INSERT INTO public.user_permissions (user_id, module, can_view, can_create, can_edit, can_delete)
    SELECT 
      NEW.id,
      ptp.module,
      COALESCE(ptp.can_view, false),
      COALESCE(ptp.can_create, false),
      COALESCE(ptp.can_edit, false),
      COALESCE(ptp.can_delete, false)
    FROM public.profile_type_permissions ptp
    WHERE ptp.profile_type_id = NEW.profile_type_id
    ON CONFLICT (user_id, module) DO UPDATE SET
      can_view = EXCLUDED.can_view,
      can_create = EXCLUDED.can_create,
      can_edit = EXCLUDED.can_edit,
      can_delete = EXCLUDED.can_delete;
    
    RETURN NEW;
  END IF;

  -- Fallback: permissões básicas por role
  IF NEW.role = 'vendedor' THEN
    INSERT INTO public.user_permissions (user_id, module, can_view, can_create, can_edit, can_delete)
    VALUES
      (NEW.id, 'dashboard', true, false, false, false),
      (NEW.id, 'prospeccao', true, true, true, false),
      (NEW.id, 'crm', true, true, true, false),
      (NEW.id, 'projetos', true, true, true, false),
      (NEW.id, 'metas', true, false, false, false),
      (NEW.id, 'leads', true, true, true, false)
    ON CONFLICT (user_id, module) DO NOTHING;
  ELSIF NEW.role = 'arquiteto' THEN
    INSERT INTO public.user_permissions (user_id, module, can_view, can_create, can_edit, can_delete)
    VALUES
      (NEW.id, 'dashboard', true, false, false, false),
      (NEW.id, 'projetos', true, false, false, false)
    ON CONFLICT (user_id, module) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Criar trigger para UPDATE de profile_type_id
DROP TRIGGER IF EXISTS on_profile_type_changed ON public.profiles;

CREATE TRIGGER on_profile_type_changed
  AFTER UPDATE OF profile_type_id ON public.profiles
  FOR EACH ROW
  WHEN (OLD.profile_type_id IS DISTINCT FROM NEW.profile_type_id)
  EXECUTE FUNCTION public.initialize_user_permissions();