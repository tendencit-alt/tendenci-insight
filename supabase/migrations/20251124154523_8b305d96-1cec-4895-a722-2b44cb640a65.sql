-- Criar política para vendedores criarem suas próprias campanhas
CREATE POLICY "Vendedores criam suas campanhas"
ON tendenci_prospec_arq_campaigns
FOR INSERT
TO public
WITH CHECK (auth.uid() = vendedor_id);

-- Criar política para vendedores atualizarem suas próprias campanhas  
CREATE POLICY "Vendedores atualizam suas campanhas"
ON tendenci_prospec_arq_campaigns
FOR UPDATE
TO public
USING (auth.uid() = vendedor_id)
WITH CHECK (auth.uid() = vendedor_id);

-- Criar política para vendedores deletarem suas próprias campanhas
CREATE POLICY "Vendedores deletam suas campanhas"
ON tendenci_prospec_arq_campaigns
FOR DELETE
TO public
USING (auth.uid() = vendedor_id);