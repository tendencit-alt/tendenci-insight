-- Função para inserir permissões padrão para projetistas
CREATE OR REPLACE FUNCTION public.create_projetista_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se o usuário criado tem role 'projetista', inserir permissões específicas
  IF NEW.role = 'projetista' THEN
    -- Permissão para módulo projetos: pode ver e editar, mas não criar nem deletar
    INSERT INTO public.user_permissions (user_id, module, can_view, can_create, can_edit, can_delete)
    VALUES (NEW.id, 'projetos', true, false, true, false)
    ON CONFLICT (user_id, module) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para aplicar permissões automaticamente quando projetista é criado
DROP TRIGGER IF EXISTS on_projetista_created ON public.profiles;
CREATE TRIGGER on_projetista_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  WHEN (NEW.role = 'projetista')
  EXECUTE FUNCTION public.create_projetista_permissions();