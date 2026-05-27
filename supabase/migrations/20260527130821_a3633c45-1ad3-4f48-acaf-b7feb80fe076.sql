
-- Defense-in-depth RESTRICTIVE policies on remaining Tendenci child tables.
-- Pattern: USING(is_owner() OR EXISTS parent WHERE parent.id = child.fk AND tenant_rls_check(parent.tenant_id))

-- 1) tendenci_campaign_queue (parent: tendenci_prospec_arq_campaigns via campanha_id)
DROP POLICY IF EXISTS "restrict_campaign_queue_tenant" ON public.tendenci_campaign_queue;
CREATE POLICY "restrict_campaign_queue_tenant" ON public.tendenci_campaign_queue
AS RESTRICTIVE FOR ALL TO authenticated
USING (
  public.is_owner() OR EXISTS (
    SELECT 1 FROM public.tendenci_prospec_arq_campaigns c
    WHERE c.id = tendenci_campaign_queue.campanha_id AND public.tenant_rls_check(c.tenant_id)
  )
)
WITH CHECK (
  public.is_owner() OR EXISTS (
    SELECT 1 FROM public.tendenci_prospec_arq_campaigns c
    WHERE c.id = tendenci_campaign_queue.campanha_id AND public.tenant_rls_check(c.tenant_id)
  )
);

-- 2) tendenci_campaign_dispatches (parent: tendenci_prospec_arq_campaigns via campanha_id)
DROP POLICY IF EXISTS "restrict_campaign_dispatches_tenant" ON public.tendenci_campaign_dispatches;
CREATE POLICY "restrict_campaign_dispatches_tenant" ON public.tendenci_campaign_dispatches
AS RESTRICTIVE FOR ALL TO authenticated
USING (
  public.is_owner() OR EXISTS (
    SELECT 1 FROM public.tendenci_prospec_arq_campaigns c
    WHERE c.id = tendenci_campaign_dispatches.campanha_id AND public.tenant_rls_check(c.tenant_id)
  )
)
WITH CHECK (
  public.is_owner() OR EXISTS (
    SELECT 1 FROM public.tendenci_prospec_arq_campaigns c
    WHERE c.id = tendenci_campaign_dispatches.campanha_id AND public.tenant_rls_check(c.tenant_id)
  )
);

-- 3) tendenci_prospec_arq_campaign_architects (parent: campaigns via campanha_id)
DROP POLICY IF EXISTS "restrict_campaign_architects_tenant" ON public.tendenci_prospec_arq_campaign_architects;
CREATE POLICY "restrict_campaign_architects_tenant" ON public.tendenci_prospec_arq_campaign_architects
AS RESTRICTIVE FOR ALL TO authenticated
USING (
  public.is_owner() OR EXISTS (
    SELECT 1 FROM public.tendenci_prospec_arq_campaigns c
    WHERE c.id = tendenci_prospec_arq_campaign_architects.campanha_id AND public.tenant_rls_check(c.tenant_id)
  )
)
WITH CHECK (
  public.is_owner() OR EXISTS (
    SELECT 1 FROM public.tendenci_prospec_arq_campaigns c
    WHERE c.id = tendenci_prospec_arq_campaign_architects.campanha_id AND public.tenant_rls_check(c.tenant_id)
  )
);

-- 4) tendenci_prospec_arq_agendamentos (parent: campaigns via campanha_id)
DROP POLICY IF EXISTS "restrict_arq_agendamentos_tenant" ON public.tendenci_prospec_arq_agendamentos;
CREATE POLICY "restrict_arq_agendamentos_tenant" ON public.tendenci_prospec_arq_agendamentos
AS RESTRICTIVE FOR ALL TO authenticated
USING (
  public.is_owner() OR EXISTS (
    SELECT 1 FROM public.tendenci_prospec_arq_campaigns c
    WHERE c.id = tendenci_prospec_arq_agendamentos.campanha_id AND public.tenant_rls_check(c.tenant_id)
  )
)
WITH CHECK (
  public.is_owner() OR EXISTS (
    SELECT 1 FROM public.tendenci_prospec_arq_campaigns c
    WHERE c.id = tendenci_prospec_arq_agendamentos.campanha_id AND public.tenant_rls_check(c.tenant_id)
  )
);

-- 5) tendenci_goal_progress (parent: tendenci_seller_goals via seller_goal_id OR tendenci_company_goals via company_goal_id)
DROP POLICY IF EXISTS "restrict_goal_progress_tenant" ON public.tendenci_goal_progress;
CREATE POLICY "restrict_goal_progress_tenant" ON public.tendenci_goal_progress
AS RESTRICTIVE FOR ALL TO authenticated
USING (
  public.is_owner()
  OR EXISTS (SELECT 1 FROM public.tendenci_seller_goals sg WHERE sg.id = tendenci_goal_progress.seller_goal_id AND public.tenant_rls_check(sg.tenant_id))
  OR EXISTS (SELECT 1 FROM public.tendenci_company_goals cg WHERE cg.id = tendenci_goal_progress.company_goal_id AND public.tenant_rls_check(cg.tenant_id))
)
WITH CHECK (
  public.is_owner()
  OR EXISTS (SELECT 1 FROM public.tendenci_seller_goals sg WHERE sg.id = tendenci_goal_progress.seller_goal_id AND public.tenant_rls_check(sg.tenant_id))
  OR EXISTS (SELECT 1 FROM public.tendenci_company_goals cg WHERE cg.id = tendenci_goal_progress.company_goal_id AND public.tenant_rls_check(cg.tenant_id))
);

-- 6) tendenci_daily_goal_records (parent: profiles via vendedor_id)
DROP POLICY IF EXISTS "restrict_daily_goal_records_tenant" ON public.tendenci_daily_goal_records;
CREATE POLICY "restrict_daily_goal_records_tenant" ON public.tendenci_daily_goal_records
AS RESTRICTIVE FOR ALL TO authenticated
USING (
  public.is_owner() OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = tendenci_daily_goal_records.vendedor_id AND public.tenant_rls_check(p.tenant_id)
  )
)
WITH CHECK (
  public.is_owner() OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = tendenci_daily_goal_records.vendedor_id AND public.tenant_rls_check(p.tenant_id)
  )
);

-- 7) tendenci_daily_architect_goals (parent: profiles via vendedor_id)
DROP POLICY IF EXISTS "restrict_daily_architect_goals_tenant" ON public.tendenci_daily_architect_goals;
CREATE POLICY "restrict_daily_architect_goals_tenant" ON public.tendenci_daily_architect_goals
AS RESTRICTIVE FOR ALL TO authenticated
USING (
  public.is_owner() OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = tendenci_daily_architect_goals.vendedor_id AND public.tenant_rls_check(p.tenant_id)
  )
)
WITH CHECK (
  public.is_owner() OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = tendenci_daily_architect_goals.vendedor_id AND public.tenant_rls_check(p.tenant_id)
  )
);

-- 8) tendenci_seller_ranking (parent: profiles via vendedor_id)
DROP POLICY IF EXISTS "restrict_seller_ranking_tenant" ON public.tendenci_seller_ranking;
CREATE POLICY "restrict_seller_ranking_tenant" ON public.tendenci_seller_ranking
AS RESTRICTIVE FOR ALL TO authenticated
USING (
  public.is_owner() OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = tendenci_seller_ranking.vendedor_id AND public.tenant_rls_check(p.tenant_id)
  )
)
WITH CHECK (
  public.is_owner() OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = tendenci_seller_ranking.vendedor_id AND public.tenant_rls_check(p.tenant_id)
  )
);

-- 9) tendenci_user_permissions (parent: profiles via user_id)
DROP POLICY IF EXISTS "restrict_user_permissions_tenant" ON public.tendenci_user_permissions;
CREATE POLICY "restrict_user_permissions_tenant" ON public.tendenci_user_permissions
AS RESTRICTIVE FOR ALL TO authenticated
USING (
  public.is_owner()
  OR tendenci_user_permissions.user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = tendenci_user_permissions.user_id AND public.tenant_rls_check(p.tenant_id)
  )
)
WITH CHECK (
  public.is_owner()
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = tendenci_user_permissions.user_id AND public.tenant_rls_check(p.tenant_id)
  )
);
