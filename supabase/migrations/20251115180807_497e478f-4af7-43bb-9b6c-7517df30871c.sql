-- Adicionar políticas RLS para tendenci_daily_architect_goals
-- Permitir que vendedores vejam suas próprias metas
CREATE POLICY "Vendedores veem próprias metas diárias"
ON tendenci_daily_architect_goals
FOR SELECT
USING (auth.uid() = vendedor_id);

-- Permitir que masters vejam todas as metas
CREATE POLICY "Masters veem todas as metas diárias"
ON tendenci_daily_architect_goals
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Permitir que masters atualizem metas
CREATE POLICY "Masters atualizam metas diárias"
ON tendenci_daily_architect_goals
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Permitir que masters criem metas
CREATE POLICY "Masters criam metas diárias"
ON tendenci_daily_architect_goals
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Permitir que sistema crie metas automáticas
CREATE POLICY "Sistema cria metas automáticas"
ON tendenci_daily_architect_goals
FOR INSERT
WITH CHECK (true);