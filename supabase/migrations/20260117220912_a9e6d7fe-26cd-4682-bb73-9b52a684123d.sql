-- Primeiro: Remover constraint antigo para permitir atualizações
ALTER TABLE fin_chart_accounts 
DROP CONSTRAINT IF EXISTS fin_chart_accounts_nature_check;

-- Atualizar contas existentes de CAPITAL para FINANCIAMENTO
UPDATE fin_chart_accounts 
SET nature = 'FINANCIAMENTO' 
WHERE nature = 'CAPITAL';

-- Atualizar conta de Variação Líquida de Caixa de CAIXA para RESULTADO
UPDATE fin_chart_accounts 
SET nature = 'RESULTADO' 
WHERE nature = 'CAIXA';

-- Atualizar contas ATIVO para RESULTADO (se existirem)
UPDATE fin_chart_accounts 
SET nature = 'RESULTADO' 
WHERE nature = 'ATIVO';

-- Atualizar contas PASSIVO para RESULTADO (se existirem)
UPDATE fin_chart_accounts 
SET nature = 'RESULTADO' 
WHERE nature = 'PASSIVO';

-- Por último: Adicionar novo constraint simplificado
ALTER TABLE fin_chart_accounts 
ADD CONSTRAINT fin_chart_accounts_nature_check 
CHECK (nature IN ('RECEITA', 'DESPESA', 'RESULTADO', 'FINANCIAMENTO'));