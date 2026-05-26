
-- ============================================================
-- SECURITY HARDENING — Quick scan findings
-- ============================================================

-- ---------- 1) ia_client_memory: tenant_id + RESTRICTIVE RLS ----------
ALTER TABLE public.ia_client_memory ADD COLUMN IF NOT EXISTS tenant_id uuid;

-- Backfill via instance_name -> tendenci_whatsapp_connections (currently empty mapping; remains NULL)
UPDATE public.ia_client_memory icm
SET tenant_id = c.tenant_id
FROM public.tendenci_whatsapp_connections c
WHERE icm.tenant_id IS NULL
  AND c.tenant_id IS NOT NULL
  AND c.instance_name = icm.instance_name;

CREATE INDEX IF NOT EXISTS idx_ia_client_memory_tenant_id ON public.ia_client_memory(tenant_id);

-- Drop old over-permissive policies
DROP POLICY IF EXISTS "Authenticated users can view client memory"   ON public.ia_client_memory;
DROP POLICY IF EXISTS "Authenticated users can update client memory" ON public.ia_client_memory;
DROP POLICY IF EXISTS "Authenticated users can delete client memory" ON public.ia_client_memory;
DROP POLICY IF EXISTS "Authenticated users can insert client memory" ON public.ia_client_memory;

-- Tenant-scoped permissive policies (NULL tenant_id => invisible to users; service_role bypasses RLS)
CREATE POLICY "tenant_select_ia_client_memory" ON public.ia_client_memory
  FOR SELECT TO authenticated USING (tenant_rls_check(tenant_id));
CREATE POLICY "tenant_update_ia_client_memory" ON public.ia_client_memory
  FOR UPDATE TO authenticated USING (tenant_rls_check(tenant_id)) WITH CHECK (tenant_rls_check(tenant_id));
CREATE POLICY "admin_delete_ia_client_memory" ON public.ia_client_memory
  FOR DELETE TO authenticated USING (is_tenant_admin(tenant_id));
-- INSERT: only service_role (edge functions). Authenticated cannot insert directly.

-- RESTRICTIVE belt-and-suspenders
CREATE POLICY "tenant_isolation_restrict_ia_client_memory" ON public.ia_client_memory
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_rls_check(tenant_id)) WITH CHECK (tenant_rls_check(tenant_id));


-- ---------- ia_conversations: tenant_id + RESTRICTIVE RLS ----------
ALTER TABLE public.ia_conversations ADD COLUMN IF NOT EXISTS tenant_id uuid;

UPDATE public.ia_conversations ic
SET tenant_id = c.tenant_id
FROM public.tendenci_whatsapp_connections c
WHERE ic.tenant_id IS NULL
  AND c.tenant_id IS NOT NULL
  AND c.instance_name = ic.instance_name;

CREATE INDEX IF NOT EXISTS idx_ia_conversations_tenant_id ON public.ia_conversations(tenant_id);

DROP POLICY IF EXISTS "Autenticados podem ler conversas IA"  ON public.ia_conversations;
DROP POLICY IF EXISTS "Sistema pode inserir conversas IA"    ON public.ia_conversations;
DROP POLICY IF EXISTS "Admins podem deletar conversas IA"    ON public.ia_conversations;

CREATE POLICY "tenant_select_ia_conversations" ON public.ia_conversations
  FOR SELECT TO authenticated USING (tenant_rls_check(tenant_id));
CREATE POLICY "admin_delete_ia_conversations" ON public.ia_conversations
  FOR DELETE TO authenticated USING (is_tenant_admin(tenant_id));
-- INSERT: only service_role (webhook ingestion).

CREATE POLICY "tenant_isolation_restrict_ia_conversations" ON public.ia_conversations
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_rls_check(tenant_id)) WITH CHECK (tenant_rls_check(tenant_id));


-- ---------- 2) Drop anon-public INSERT policies (ingestion via service_role) ----------
DROP POLICY IF EXISTS "Sistema pode criar leads whatsapp"      ON public.leads_whatsapp;
DROP POLICY IF EXISTS "Autenticados leem leads whatsapp"       ON public.leads_whatsapp;
DROP POLICY IF EXISTS "Autenticados atualizam leads whatsapp"  ON public.leads_whatsapp;
-- Recreate auth-only read/update (no anon-public)
CREATE POLICY "auth_select_leads_whatsapp" ON public.leads_whatsapp
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_update_leads_whatsapp" ON public.leads_whatsapp
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "System can insert webhook logs" ON public.tendenci_webhook_logs;
DROP POLICY IF EXISTS "Sistema pode criar atividades"  ON public.system_activities;
DROP POLICY IF EXISTS "System inserts RCA"             ON public.root_cause_analysis_events;
DROP POLICY IF EXISTS "System inserts impact events"   ON public.dependency_impact_events;
DROP POLICY IF EXISTS "System inserts recovery logs"   ON public.recovery_execution_logs;


-- ---------- 3) Revoke EXECUTE from anon/PUBLIC on all SECURITY DEFINER public functions ----------
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC', r.proname, r.args);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM anon',   r.proname, r.args);
    EXECUTE format('GRANT  EXECUTE ON FUNCTION public.%I(%s) TO authenticated', r.proname, r.args);
  END LOOP;
END $$;


-- ---------- 4) Storage: enforce owner = auth.uid() on INSERT for private buckets ----------
-- (Restrictive owner-only on SELECT would break team-shared access; leaving reads as-is.)
DO $$
DECLARE b text;
BEGIN
  FOR b IN SELECT unnest(ARRAY[
    'crm-files','deal-files','client-files','project-files',
    'architect-files','crm-timeline','crm-timeline-attachments','erp-documents'
  ]) LOOP
    EXECUTE format($p$
      DROP POLICY IF EXISTS "owner_insert_%1$s" ON storage.objects;
      CREATE POLICY "owner_insert_%1$s" ON storage.objects
        AS RESTRICTIVE FOR INSERT TO authenticated
        WITH CHECK (bucket_id <> %2$L OR owner = auth.uid());
    $p$, b, b);
  END LOOP;
END $$;
