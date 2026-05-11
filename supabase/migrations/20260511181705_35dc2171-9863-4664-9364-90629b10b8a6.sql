-- Templates reutilizáveis de pré-perfis
CREATE TABLE IF NOT EXISTS public.profile_type_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#7C3AED',
  icon TEXT NOT NULL DEFAULT 'user',
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_builtin BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS profile_type_templates_tenant_name_key
  ON public.profile_type_templates (COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));

CREATE INDEX IF NOT EXISTS idx_profile_type_templates_tenant
  ON public.profile_type_templates (tenant_id);

ALTER TABLE public.profile_type_templates ENABLE ROW LEVEL SECURITY;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.fn_profile_type_templates_touch()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_type_templates_touch ON public.profile_type_templates;
CREATE TRIGGER trg_profile_type_templates_touch
BEFORE UPDATE ON public.profile_type_templates
FOR EACH ROW EXECUTE FUNCTION public.fn_profile_type_templates_touch();

-- Bloqueia edição/remoção de builtins
CREATE OR REPLACE FUNCTION public.fn_profile_type_templates_protect_builtin()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    IF OLD.is_builtin THEN
      RAISE EXCEPTION 'Templates internos do sistema não podem ser excluídos.';
    END IF;
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    IF OLD.is_builtin AND NEW.is_builtin THEN
      RAISE EXCEPTION 'Templates internos do sistema não podem ser editados.';
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_type_templates_protect ON public.profile_type_templates;
CREATE TRIGGER trg_profile_type_templates_protect
BEFORE UPDATE OR DELETE ON public.profile_type_templates
FOR EACH ROW EXECUTE FUNCTION public.fn_profile_type_templates_protect_builtin();

-- Visualização: usuários do mesmo tenant ou templates globais (tenant_id IS NULL)
CREATE POLICY "View templates of own tenant or global"
  ON public.profile_type_templates
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IS NULL
    OR tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

-- Inserir: somente admin do tenant
CREATE POLICY "Admins insert templates in own tenant"
  ON public.profile_type_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'::user_role
        AND (profile_type_templates.tenant_id IS NULL OR p.tenant_id = profile_type_templates.tenant_id)
    )
  );

-- Atualizar: somente admin do tenant
CREATE POLICY "Admins update templates of own tenant"
  ON public.profile_type_templates
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'::user_role
        AND (profile_type_templates.tenant_id IS NULL OR p.tenant_id = profile_type_templates.tenant_id)
    )
  );

-- Excluir: somente admin do tenant
CREATE POLICY "Admins delete templates of own tenant"
  ON public.profile_type_templates
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'::user_role
        AND (profile_type_templates.tenant_id IS NULL OR p.tenant_id = profile_type_templates.tenant_id)
    )
  );