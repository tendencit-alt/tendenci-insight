-- Remove o constraint antigo de natureza
ALTER TABLE fin_chart_accounts 
DROP CONSTRAINT IF EXISTS fin_chart_accounts_nature_check;

-- Adiciona novo constraint com CAPITAL e CAIXA
ALTER TABLE fin_chart_accounts 
ADD CONSTRAINT fin_chart_accounts_nature_check 
CHECK (nature IN ('RECEITA','DESPESA','ATIVO','PASSIVO','RESULTADO','CAPITAL','CAIXA'));

-- 7. Resultado Financeiro (para juros, multas, encargos)
INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active, dre_order)
VALUES ('7', 'Resultado Financeiro', 'DESPESA', NULL, true, true, true, 7);

-- Buscar o ID da conta 7 para criar subcontas
DO $$
DECLARE
  v_parent_id UUID;
BEGIN
  SELECT id INTO v_parent_id FROM fin_chart_accounts WHERE code = '7' AND parent_id IS NULL;
  
  -- 7.1 Juros Pagos
  INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active, dre_order)
  VALUES ('7.1', 'Juros Pagos', 'DESPESA', v_parent_id, true, true, true, 71);
  
  -- 7.2 Juros Recebidos
  INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active, dre_order)
  VALUES ('7.2', 'Juros Recebidos', 'RECEITA', v_parent_id, true, true, true, 72);
  
  -- 7.3 Multas e Encargos
  INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active, dre_order)
  VALUES ('7.3', 'Multas e Encargos', 'DESPESA', v_parent_id, true, true, true, 73);
END $$;

-- 8. Resultado Antes do Capital (linha calculada)
INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active, dre_order)
VALUES ('8', 'Resultado Antes do Capital', 'RESULTADO', NULL, true, false, true, 8);

-- 9. Movimentações de Capital – Empréstimos
INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active, dre_order)
VALUES ('9', 'Movimentações de Capital – Empréstimos', 'CAPITAL', NULL, true, true, true, 9);

-- Criar subcontas de Capital
DO $$
DECLARE
  v_parent_id UUID;
BEGIN
  SELECT id INTO v_parent_id FROM fin_chart_accounts WHERE code = '9' AND parent_id IS NULL;
  
  -- 9.1 Contratação de Empréstimos
  INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active, dre_order)
  VALUES ('9.1', 'Contratação de Empréstimos', 'CAPITAL', v_parent_id, true, true, true, 91);
  
  -- 9.2 Liquidação de Empréstimos (Principal)
  INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active, dre_order)
  VALUES ('9.2', 'Liquidação de Empréstimos (Principal)', 'CAPITAL', v_parent_id, true, true, true, 92);
END $$;

-- 10. Variação Líquida de Caixa (linha final gerencial)
INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active, dre_order)
VALUES ('10', 'Variação Líquida de Caixa', 'CAIXA', NULL, true, true, true, 10);