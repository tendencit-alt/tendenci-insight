-- Remover política antiga que exige autenticação
DROP POLICY IF EXISTS "Autenticados podem ler produtos IA" ON tendenci_ia_produtos;

-- Criar política pública para leitura de produtos ativos (catálogo público)
CREATE POLICY "Leitura publica de produtos ativos"
ON tendenci_ia_produtos
FOR SELECT
TO public
USING (ativo = true);