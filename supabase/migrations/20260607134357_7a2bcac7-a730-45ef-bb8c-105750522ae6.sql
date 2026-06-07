-- Restringir leitura de pipeline_stages ao tenant dono do pipeline
DROP POLICY IF EXISTS "Permitir leitura para autenticados" ON public.pipeline_stages;

CREATE POLICY "pipeline_stages_select_tenant"
ON public.pipeline_stages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.pipelines p
    WHERE p.id = pipeline_stages.pipeline_id
      AND public.tenant_rls_check(p.tenant_id)
  )
);

CREATE POLICY "pipeline_stages_modify_tenant"
ON public.pipeline_stages
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.pipelines p
    WHERE p.id = pipeline_stages.pipeline_id
      AND public.tenant_rls_check(p.tenant_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.pipelines p
    WHERE p.id = pipeline_stages.pipeline_id
      AND public.tenant_rls_check(p.tenant_id)
  )
);