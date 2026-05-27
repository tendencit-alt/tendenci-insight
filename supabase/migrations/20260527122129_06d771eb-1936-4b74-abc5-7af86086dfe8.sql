
-- =========================================================
-- 1) EMPTY TABLES: add tenant_id NOT NULL DEFAULT, swap RLS
-- =========================================================

-- Helper: standard tenant default
-- (already exists: public.get_user_tenant_id())

-- ---- architect_indications ----
ALTER TABLE public.architect_indications
  ADD COLUMN IF NOT EXISTS tenant_id uuid NOT NULL DEFAULT public.get_user_tenant_id();
CREATE INDEX IF NOT EXISTS idx_architect_indications_tenant ON public.architect_indications(tenant_id);

DROP POLICY IF EXISTS "Autenticados podem ler indicações" ON public.architect_indications;
DROP POLICY IF EXISTS "Autenticados podem criar indicações" ON public.architect_indications;
DROP POLICY IF EXISTS "Autenticados podem atualizar indicações" ON public.architect_indications;
DROP POLICY IF EXISTS "Admins podem deletar indicações" ON public.architect_indications;

CREATE POLICY ai_tenant_select ON public.architect_indications
  FOR SELECT TO authenticated USING (is_owner() OR public.tenant_rls_check(tenant_id));
CREATE POLICY ai_tenant_insert ON public.architect_indications
  FOR INSERT TO authenticated WITH CHECK (is_owner() OR public.tenant_rls_check(tenant_id));
CREATE POLICY ai_tenant_update ON public.architect_indications
  FOR UPDATE TO authenticated USING (is_owner() OR public.tenant_rls_check(tenant_id));
CREATE POLICY ai_admin_delete ON public.architect_indications
  FOR DELETE TO authenticated USING (is_owner() OR public.is_tenant_admin(tenant_id));

-- ---- architect_projects ----
ALTER TABLE public.architect_projects
  ADD COLUMN IF NOT EXISTS tenant_id uuid NOT NULL DEFAULT public.get_user_tenant_id();
CREATE INDEX IF NOT EXISTS idx_architect_projects_tenant ON public.architect_projects(tenant_id);

DROP POLICY IF EXISTS "Autenticados podem ler projetos de arquitetos" ON public.architect_projects;
DROP POLICY IF EXISTS "Autenticados podem criar projetos de arquitetos" ON public.architect_projects;
DROP POLICY IF EXISTS "Autenticados podem atualizar projetos de arquitetos" ON public.architect_projects;
DROP POLICY IF EXISTS "Admins podem deletar projetos de arquitetos" ON public.architect_projects;

CREATE POLICY ap_tenant_select ON public.architect_projects
  FOR SELECT TO authenticated USING (is_owner() OR public.tenant_rls_check(tenant_id));
CREATE POLICY ap_tenant_insert ON public.architect_projects
  FOR INSERT TO authenticated WITH CHECK (is_owner() OR public.tenant_rls_check(tenant_id));
CREATE POLICY ap_tenant_update ON public.architect_projects
  FOR UPDATE TO authenticated USING (is_owner() OR public.tenant_rls_check(tenant_id));
CREATE POLICY ap_admin_delete ON public.architect_projects
  FOR DELETE TO authenticated USING (is_owner() OR public.is_tenant_admin(tenant_id));

-- ---- architect_history ----
ALTER TABLE public.architect_history
  ADD COLUMN IF NOT EXISTS tenant_id uuid NOT NULL DEFAULT public.get_user_tenant_id();
CREATE INDEX IF NOT EXISTS idx_architect_history_tenant ON public.architect_history(tenant_id);

DROP POLICY IF EXISTS "Autenticados podem ler histórico de arquitetos" ON public.architect_history;
DROP POLICY IF EXISTS "Autenticados podem criar histórico de arquitetos" ON public.architect_history;

CREATE POLICY ah_tenant_select ON public.architect_history
  FOR SELECT TO authenticated USING (is_owner() OR public.tenant_rls_check(tenant_id));
CREATE POLICY ah_tenant_insert ON public.architect_history
  FOR INSERT TO authenticated WITH CHECK (is_owner() OR public.tenant_rls_check(tenant_id));
CREATE POLICY ah_admin_delete ON public.architect_history
  FOR DELETE TO authenticated USING (is_owner() OR public.is_tenant_admin(tenant_id));

-- ---- master_ideas ----
ALTER TABLE public.master_ideas
  ADD COLUMN IF NOT EXISTS tenant_id uuid NOT NULL DEFAULT public.get_user_tenant_id();
CREATE INDEX IF NOT EXISTS idx_master_ideas_tenant ON public.master_ideas(tenant_id);

DROP POLICY IF EXISTS "Todos podem ver ideias" ON public.master_ideas;
DROP POLICY IF EXISTS "Todos podem criar ideias" ON public.master_ideas;
DROP POLICY IF EXISTS "Autor ou admin pode editar ideia" ON public.master_ideas;
DROP POLICY IF EXISTS "Admin pode deletar ideias" ON public.master_ideas;
DROP POLICY IF EXISTS "Admins can manage ideas" ON public.master_ideas;

CREATE POLICY mi_tenant_select ON public.master_ideas
  FOR SELECT TO authenticated USING (is_owner() OR public.tenant_rls_check(tenant_id));
CREATE POLICY mi_tenant_insert ON public.master_ideas
  FOR INSERT TO authenticated WITH CHECK (is_owner() OR public.tenant_rls_check(tenant_id));
CREATE POLICY mi_author_or_admin_update ON public.master_ideas
  FOR UPDATE TO authenticated
  USING (is_owner() OR ((auth.uid() = created_by OR public.is_tenant_admin(tenant_id)) AND public.tenant_rls_check(tenant_id)));
CREATE POLICY mi_admin_delete ON public.master_ideas
  FOR DELETE TO authenticated USING (is_owner() OR public.is_tenant_admin(tenant_id));

-- ---- master_idea_attachments ----
ALTER TABLE public.master_idea_attachments
  ADD COLUMN IF NOT EXISTS tenant_id uuid NOT NULL DEFAULT public.get_user_tenant_id();
CREATE INDEX IF NOT EXISTS idx_master_idea_attachments_tenant ON public.master_idea_attachments(tenant_id);

DROP POLICY IF EXISTS "Todos podem ver anexos de ideias" ON public.master_idea_attachments;
DROP POLICY IF EXISTS "Todos podem criar anexos" ON public.master_idea_attachments;
DROP POLICY IF EXISTS "Admin pode deletar anexos" ON public.master_idea_attachments;

CREATE POLICY mia_tenant_select ON public.master_idea_attachments
  FOR SELECT TO authenticated USING (is_owner() OR public.tenant_rls_check(tenant_id));
CREATE POLICY mia_tenant_insert ON public.master_idea_attachments
  FOR INSERT TO authenticated WITH CHECK (is_owner() OR public.tenant_rls_check(tenant_id));
CREATE POLICY mia_admin_delete ON public.master_idea_attachments
  FOR DELETE TO authenticated USING (is_owner() OR public.is_tenant_admin(tenant_id));

-- ---- master_idea_comments ----
ALTER TABLE public.master_idea_comments
  ADD COLUMN IF NOT EXISTS tenant_id uuid NOT NULL DEFAULT public.get_user_tenant_id();
CREATE INDEX IF NOT EXISTS idx_master_idea_comments_tenant ON public.master_idea_comments(tenant_id);

DROP POLICY IF EXISTS "Authenticated users can view comments" ON public.master_idea_comments;
DROP POLICY IF EXISTS "Usuários autenticados podem comentar" ON public.master_idea_comments;
DROP POLICY IF EXISTS "Usuários podem atualizar próprio comentário" ON public.master_idea_comments;
DROP POLICY IF EXISTS "Usuários podem deletar próprio comentário" ON public.master_idea_comments;

CREATE POLICY mic_tenant_select ON public.master_idea_comments
  FOR SELECT TO authenticated USING (is_owner() OR public.tenant_rls_check(tenant_id));
CREATE POLICY mic_tenant_insert ON public.master_idea_comments
  FOR INSERT TO authenticated WITH CHECK (is_owner() OR public.tenant_rls_check(tenant_id));
CREATE POLICY mic_author_update ON public.master_idea_comments
  FOR UPDATE TO authenticated USING (auth.uid() = user_id AND public.tenant_rls_check(tenant_id));
CREATE POLICY mic_author_or_admin_delete ON public.master_idea_comments
  FOR DELETE TO authenticated USING (is_owner() OR public.is_tenant_admin(tenant_id) OR (auth.uid() = user_id AND public.tenant_rls_check(tenant_id)));

-- ---- master_idea_ratings ----
ALTER TABLE public.master_idea_ratings
  ADD COLUMN IF NOT EXISTS tenant_id uuid NOT NULL DEFAULT public.get_user_tenant_id();
CREATE INDEX IF NOT EXISTS idx_master_idea_ratings_tenant ON public.master_idea_ratings(tenant_id);

DROP POLICY IF EXISTS "Authenticated users can view ratings" ON public.master_idea_ratings;
DROP POLICY IF EXISTS "Usuários autenticados podem avaliar" ON public.master_idea_ratings;
DROP POLICY IF EXISTS "Usuários podem atualizar própria avaliação" ON public.master_idea_ratings;
DROP POLICY IF EXISTS "Usuários podem deletar própria avaliação" ON public.master_idea_ratings;

CREATE POLICY mir_tenant_select ON public.master_idea_ratings
  FOR SELECT TO authenticated USING (is_owner() OR public.tenant_rls_check(tenant_id));
CREATE POLICY mir_tenant_insert ON public.master_idea_ratings
  FOR INSERT TO authenticated WITH CHECK (is_owner() OR public.tenant_rls_check(tenant_id));
CREATE POLICY mir_author_update ON public.master_idea_ratings
  FOR UPDATE TO authenticated USING (auth.uid() = user_id AND public.tenant_rls_check(tenant_id));
CREATE POLICY mir_author_or_admin_delete ON public.master_idea_ratings
  FOR DELETE TO authenticated USING (is_owner() OR public.is_tenant_admin(tenant_id) OR (auth.uid() = user_id AND public.tenant_rls_check(tenant_id)));

-- ---- tendenci_badges ----
ALTER TABLE public.tendenci_badges
  ADD COLUMN IF NOT EXISTS tenant_id uuid NOT NULL DEFAULT public.get_user_tenant_id();
CREATE INDEX IF NOT EXISTS idx_tendenci_badges_tenant ON public.tendenci_badges(tenant_id);

DROP POLICY IF EXISTS "Masters podem ver todas as insígnias" ON public.tendenci_badges;
DROP POLICY IF EXISTS "Vendedores podem ver apenas suas insígnias" ON public.tendenci_badges;
DROP POLICY IF EXISTS "Sistema pode criar insígnias" ON public.tendenci_badges;

CREATE POLICY tb_tenant_select ON public.tendenci_badges
  FOR SELECT TO authenticated USING (
    is_owner()
    OR (public.tenant_rls_check(tenant_id) AND (public.is_tenant_admin(tenant_id) OR vendedor_id = auth.uid()))
  );
CREATE POLICY tb_tenant_insert ON public.tendenci_badges
  FOR INSERT TO authenticated WITH CHECK (is_owner() OR public.tenant_rls_check(tenant_id));
CREATE POLICY tb_admin_delete ON public.tendenci_badges
  FOR DELETE TO authenticated USING (is_owner() OR public.is_tenant_admin(tenant_id));

-- =========================================================
-- 2) FIN_AUDIT_LOGS: nullable tenant_id, backfill, RLS
-- =========================================================
ALTER TABLE public.fin_audit_logs
  ADD COLUMN IF NOT EXISTS tenant_id uuid;
CREATE INDEX IF NOT EXISTS idx_fin_audit_logs_tenant ON public.fin_audit_logs(tenant_id);

-- Backfill from entity tables
UPDATE public.fin_audit_logs fal
SET tenant_id = src.tenant_id
FROM public.fin_ledger_entries src
WHERE fal.tenant_id IS NULL AND fal.entity_type='fin_ledger_entries' AND fal.entity_id = src.id;

UPDATE public.fin_audit_logs fal
SET tenant_id = src.tenant_id
FROM public.fin_receivables src
WHERE fal.tenant_id IS NULL AND fal.entity_type='fin_receivables' AND fal.entity_id = src.id;

UPDATE public.fin_audit_logs fal
SET tenant_id = src.tenant_id
FROM public.fin_payables src
WHERE fal.tenant_id IS NULL AND fal.entity_type='fin_payables' AND fal.entity_id = src.id;

UPDATE public.fin_audit_logs fal
SET tenant_id = src.tenant_id
FROM public.fin_bank_accounts src
WHERE fal.tenant_id IS NULL AND fal.entity_type='fin_bank_accounts' AND fal.entity_id = src.id;

-- Fallback via user_id -> profiles.tenant_id
UPDATE public.fin_audit_logs fal
SET tenant_id = p.tenant_id
FROM public.profiles p
WHERE fal.tenant_id IS NULL AND fal.user_id = p.id AND p.tenant_id IS NOT NULL;

-- Auto-fill trigger for future inserts
CREATE OR REPLACE FUNCTION public.fin_audit_logs_set_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t uuid;
BEGIN
  IF NEW.tenant_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.entity_type = 'fin_ledger_entries' THEN
    SELECT tenant_id INTO t FROM public.fin_ledger_entries WHERE id = NEW.entity_id;
  ELSIF NEW.entity_type = 'fin_receivables' THEN
    SELECT tenant_id INTO t FROM public.fin_receivables WHERE id = NEW.entity_id;
  ELSIF NEW.entity_type = 'fin_payables' THEN
    SELECT tenant_id INTO t FROM public.fin_payables WHERE id = NEW.entity_id;
  ELSIF NEW.entity_type = 'fin_bank_accounts' THEN
    SELECT tenant_id INTO t FROM public.fin_bank_accounts WHERE id = NEW.entity_id;
  END IF;

  IF t IS NULL AND NEW.user_id IS NOT NULL THEN
    SELECT tenant_id INTO t FROM public.profiles WHERE id = NEW.user_id;
  END IF;
  IF t IS NULL THEN
    t := public.get_user_tenant_id();
  END IF;

  NEW.tenant_id := t;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.fin_audit_logs_set_tenant() FROM anon, PUBLIC;

DROP TRIGGER IF EXISTS trg_fin_audit_logs_set_tenant ON public.fin_audit_logs;
CREATE TRIGGER trg_fin_audit_logs_set_tenant
  BEFORE INSERT ON public.fin_audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.fin_audit_logs_set_tenant();

-- Replace permissive policy with tenant-scoped one
DROP POLICY IF EXISTS "Owners/admins view fin_audit_logs" ON public.fin_audit_logs;

CREATE POLICY fal_tenant_select ON public.fin_audit_logs
  FOR SELECT TO authenticated USING (
    is_owner()
    OR (tenant_id IS NOT NULL AND public.tenant_rls_check(tenant_id))
  );
CREATE POLICY fal_tenant_insert ON public.fin_audit_logs
  FOR INSERT TO authenticated WITH CHECK (
    is_owner()
    OR tenant_id IS NULL  -- trigger will fill it
    OR public.tenant_rls_check(tenant_id)
  );
CREATE POLICY fal_admin_delete ON public.fin_audit_logs
  FOR DELETE TO authenticated USING (
    is_owner()
    OR (tenant_id IS NOT NULL AND public.is_tenant_admin(tenant_id))
  );
