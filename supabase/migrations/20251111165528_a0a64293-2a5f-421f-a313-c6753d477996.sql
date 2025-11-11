-- Atualizar política de exclusão de pipelines
DROP POLICY IF EXISTS "Admins deletam pipelines" ON crm_pipelines;
CREATE POLICY "Autenticados deletam pipelines" ON crm_pipelines
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Atualizar política de exclusão de stages
DROP POLICY IF EXISTS "Admins deletam stages" ON crm_stages;
CREATE POLICY "Autenticados deletam stages" ON crm_stages
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Atualizar política de exclusão de deals
DROP POLICY IF EXISTS "Admins deletam deals" ON crm_deals;
CREATE POLICY "Autenticados deletam deals" ON crm_deals
  FOR DELETE USING (auth.uid() IS NOT NULL);