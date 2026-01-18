-- Fix warn-level security issues by restricting public access to authenticated users only

-- 1. Fix boleto_rates - Restrict to authenticated users only
DROP POLICY IF EXISTS "Taxas de boleto são públicas para leitura" ON boleto_rates;

CREATE POLICY "Authenticated users can view boleto rates"
ON boleto_rates FOR SELECT
TO authenticated
USING (true);

-- 2. Fix master_idea_ratings - Restrict to authenticated users only
DROP POLICY IF EXISTS "Todos podem ver avaliações" ON master_idea_ratings;

CREATE POLICY "Authenticated users can view ratings"
ON master_idea_ratings FOR SELECT
TO authenticated
USING (true);

-- 3. Fix master_idea_comments - Restrict to authenticated users only
DROP POLICY IF EXISTS "Todos podem ver comentários" ON master_idea_comments;

CREATE POLICY "Authenticated users can view comments"
ON master_idea_comments FOR SELECT
TO authenticated
USING (true);