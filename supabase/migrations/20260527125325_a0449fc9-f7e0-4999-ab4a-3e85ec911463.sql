
DROP POLICY IF EXISTS fin_event_automation_rules_tenant_restrict ON public.fin_event_automation_rules;
CREATE POLICY fin_event_automation_rules_tenant_restrict ON public.fin_event_automation_rules AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_owner() OR public.tenant_rls_check(tenant_id))
  WITH CHECK (public.is_owner() OR public.tenant_rls_check(tenant_id));

DROP POLICY IF EXISTS tpacd_tenant_restrict ON public.tendenci_prospec_arq_campaign_dispatches;
CREATE POLICY tpacd_tenant_restrict ON public.tendenci_prospec_arq_campaign_dispatches AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_owner() OR EXISTS (SELECT 1 FROM public.tendenci_prospec_arq_campaigns c WHERE c.id = tendenci_prospec_arq_campaign_dispatches.campanha_id AND public.tenant_rls_check(c.tenant_id)))
  WITH CHECK (public.is_owner() OR EXISTS (SELECT 1 FROM public.tendenci_prospec_arq_campaigns c WHERE c.id = tendenci_prospec_arq_campaign_dispatches.campanha_id AND public.tenant_rls_check(c.tenant_id)));

DROP POLICY IF EXISTS crm_stages_tenant_restrict ON public.crm_stages;
CREATE POLICY crm_stages_tenant_restrict ON public.crm_stages AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_owner() OR EXISTS (SELECT 1 FROM public.crm_pipelines p WHERE p.id = crm_stages.pipeline_id AND public.tenant_rls_check(p.tenant_id)))
  WITH CHECK (public.is_owner() OR EXISTS (SELECT 1 FROM public.crm_pipelines p WHERE p.id = crm_stages.pipeline_id AND public.tenant_rls_check(p.tenant_id)));

DROP POLICY IF EXISTS crm_cadence_steps_tenant_restrict ON public.crm_cadence_steps;
CREATE POLICY crm_cadence_steps_tenant_restrict ON public.crm_cadence_steps AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_owner() OR EXISTS (SELECT 1 FROM public.crm_cadences c WHERE c.id = crm_cadence_steps.cadence_id AND public.tenant_rls_check(c.tenant_id)))
  WITH CHECK (public.is_owner() OR EXISTS (SELECT 1 FROM public.crm_cadences c WHERE c.id = crm_cadence_steps.cadence_id AND public.tenant_rls_check(c.tenant_id)));
