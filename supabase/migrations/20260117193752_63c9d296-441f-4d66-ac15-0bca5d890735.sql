-- Renumerar contas raiz e suas subcontas (do maior para o menor para evitar conflitos)
-- Primeiro, atualizar código 7 → 8 e subcontas
UPDATE fin_chart_accounts 
SET code = '8' || SUBSTRING(code FROM 2)
WHERE code LIKE '7%';

-- Código 6 → 7 e subcontas
UPDATE fin_chart_accounts 
SET code = '7' || SUBSTRING(code FROM 2)
WHERE code LIKE '6%';

-- Código 5 → 6 e subcontas
UPDATE fin_chart_accounts 
SET code = '6' || SUBSTRING(code FROM 2)
WHERE code LIKE '5%';

-- Código 4 → 5 e subcontas
UPDATE fin_chart_accounts 
SET code = '5' || SUBSTRING(code FROM 2)
WHERE code LIKE '4%';

-- Código 3 → 4 e subcontas
UPDATE fin_chart_accounts 
SET code = '4' || SUBSTRING(code FROM 2)
WHERE code LIKE '3%';

-- Inserir nova conta "Margem de Contribuição" na posição 3
INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, active)
VALUES ('3', 'Margem de Contribuição', 'RESULTADO', NULL, true, true);