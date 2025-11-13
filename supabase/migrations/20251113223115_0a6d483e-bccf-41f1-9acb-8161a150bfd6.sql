-- Adicionar RLS policies para controlar acesso às metas

-- Políticas para tendenci_seller_goals
-- Masters podem ver todas as metas
CREATE POLICY "Masters podem ver todas as metas individuais"
ON tendenci_seller_goals
FOR SELECT
TO authenticated
USING (
  is_user_master(auth.uid())
);

-- Vendedores podem ver apenas suas próprias metas
CREATE POLICY "Vendedores veem apenas suas próprias metas"
ON tendenci_seller_goals
FOR SELECT
TO authenticated
USING (
  vendedor_id = auth.uid()
);

-- Apenas masters podem criar metas
CREATE POLICY "Apenas masters podem criar metas individuais"
ON tendenci_seller_goals
FOR INSERT
TO authenticated
WITH CHECK (
  is_user_master(auth.uid())
);

-- Apenas masters podem atualizar metas
CREATE POLICY "Apenas masters podem atualizar metas individuais"
ON tendenci_seller_goals
FOR UPDATE
TO authenticated
USING (
  is_user_master(auth.uid())
);

-- Apenas masters podem deletar metas
CREATE POLICY "Apenas masters podem deletar metas individuais"
ON tendenci_seller_goals
FOR DELETE
TO authenticated
USING (
  is_user_master(auth.uid())
);

-- Políticas para tendenci_company_goals
-- Todos podem ver metas da empresa
CREATE POLICY "Todos podem ver metas da empresa"
ON tendenci_company_goals
FOR SELECT
TO authenticated
USING (true);

-- Apenas masters podem criar metas da empresa
CREATE POLICY "Apenas masters podem criar metas da empresa"
ON tendenci_company_goals
FOR INSERT
TO authenticated
WITH CHECK (
  is_user_master(auth.uid())
);

-- Apenas masters podem atualizar metas da empresa
CREATE POLICY "Apenas masters podem atualizar metas da empresa"
ON tendenci_company_goals
FOR UPDATE
TO authenticated
USING (
  is_user_master(auth.uid())
);

-- Apenas masters podem deletar metas da empresa
CREATE POLICY "Apenas masters podem deletar metas da empresa"
ON tendenci_company_goals
FOR DELETE
TO authenticated
USING (
  is_user_master(auth.uid())
);

-- Políticas para tendenci_goal_progress
-- Masters podem ver todo o progresso
CREATE POLICY "Masters podem ver todo progresso de metas"
ON tendenci_goal_progress
FOR SELECT
TO authenticated
USING (
  is_user_master(auth.uid())
);

-- Vendedores podem ver apenas seu próprio progresso
CREATE POLICY "Vendedores veem apenas seu progresso"
ON tendenci_goal_progress
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tendenci_seller_goals
    WHERE id = seller_goal_id
    AND vendedor_id = auth.uid()
  )
  OR company_goal_id IS NOT NULL
);

-- Políticas para tendenci_seller_ranking
-- Masters podem ver todo o ranking
CREATE POLICY "Masters podem ver todo ranking"
ON tendenci_seller_ranking
FOR SELECT
TO authenticated
USING (
  is_user_master(auth.uid())
);

-- Vendedores podem ver apenas sua própria posição no ranking
CREATE POLICY "Vendedores veem apenas sua posição no ranking"
ON tendenci_seller_ranking
FOR SELECT
TO authenticated
USING (
  vendedor_id = auth.uid()
);