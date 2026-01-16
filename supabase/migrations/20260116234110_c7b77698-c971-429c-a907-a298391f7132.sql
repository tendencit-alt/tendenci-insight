
-- Primeiro, limpar o plano de contas existente
DELETE FROM fin_chart_accounts;

-- Inserir Plano de Contas Padrão Universal Completo
-- GRUPO 1: ATIVO
INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) VALUES
('1', 'ATIVO', 'ATIVO', NULL, false, false, true);

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '1.1', 'ATIVO CIRCULANTE', 'ATIVO', id, false, false, true FROM fin_chart_accounts WHERE code = '1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '1.1.1', 'Caixa e Equivalentes de Caixa', 'ATIVO', id, false, true, true FROM fin_chart_accounts WHERE code = '1.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '1.1.1.01', 'Caixa', 'ATIVO', id, false, true, true FROM fin_chart_accounts WHERE code = '1.1.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '1.1.1.02', 'Bancos Conta Movimento', 'ATIVO', id, false, true, true FROM fin_chart_accounts WHERE code = '1.1.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '1.1.1.03', 'Aplicações de Liquidez Imediata', 'ATIVO', id, false, true, true FROM fin_chart_accounts WHERE code = '1.1.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '1.1.2', 'Contas a Receber', 'ATIVO', id, false, true, true FROM fin_chart_accounts WHERE code = '1.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '1.1.2.01', 'Clientes', 'ATIVO', id, false, true, true FROM fin_chart_accounts WHERE code = '1.1.2';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '1.1.2.02', '(-) Provisão para Créditos Duvidosos', 'ATIVO', id, false, false, true FROM fin_chart_accounts WHERE code = '1.1.2';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '1.1.3', 'Estoques', 'ATIVO', id, false, false, true FROM fin_chart_accounts WHERE code = '1.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '1.1.3.01', 'Mercadorias para Revenda', 'ATIVO', id, false, false, true FROM fin_chart_accounts WHERE code = '1.1.3';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '1.1.3.02', 'Matérias-Primas', 'ATIVO', id, false, false, true FROM fin_chart_accounts WHERE code = '1.1.3';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '1.1.3.03', 'Produtos em Elaboração', 'ATIVO', id, false, false, true FROM fin_chart_accounts WHERE code = '1.1.3';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '1.1.3.04', 'Produtos Acabados', 'ATIVO', id, false, false, true FROM fin_chart_accounts WHERE code = '1.1.3';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '1.1.4', 'Tributos a Recuperar', 'ATIVO', id, false, false, true FROM fin_chart_accounts WHERE code = '1.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '1.1.4.01', 'ICMS a Recuperar', 'ATIVO', id, false, false, true FROM fin_chart_accounts WHERE code = '1.1.4';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '1.1.4.02', 'PIS a Recuperar', 'ATIVO', id, false, false, true FROM fin_chart_accounts WHERE code = '1.1.4';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '1.1.4.03', 'COFINS a Recuperar', 'ATIVO', id, false, false, true FROM fin_chart_accounts WHERE code = '1.1.4';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '1.1.4.04', 'IRRF a Recuperar', 'ATIVO', id, false, false, true FROM fin_chart_accounts WHERE code = '1.1.4';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '1.1.5', 'Despesas Antecipadas', 'ATIVO', id, false, false, true FROM fin_chart_accounts WHERE code = '1.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '1.1.5.01', 'Seguros a Apropriar', 'ATIVO', id, false, false, true FROM fin_chart_accounts WHERE code = '1.1.5';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '1.1.5.02', 'Aluguéis a Apropriar', 'ATIVO', id, false, false, true FROM fin_chart_accounts WHERE code = '1.1.5';

-- ATIVO NÃO CIRCULANTE
INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '1.2', 'ATIVO NÃO CIRCULANTE', 'ATIVO', id, false, false, true FROM fin_chart_accounts WHERE code = '1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '1.2.1', 'Realizável a Longo Prazo', 'ATIVO', id, false, false, true FROM fin_chart_accounts WHERE code = '1.2';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '1.2.1.01', 'Clientes LP', 'ATIVO', id, false, false, true FROM fin_chart_accounts WHERE code = '1.2.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '1.2.1.02', 'Empréstimos a Terceiros', 'ATIVO', id, false, false, true FROM fin_chart_accounts WHERE code = '1.2.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '1.2.2', 'Investimentos', 'ATIVO', id, false, false, true FROM fin_chart_accounts WHERE code = '1.2';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '1.2.2.01', 'Participações Societárias', 'ATIVO', id, false, false, true FROM fin_chart_accounts WHERE code = '1.2.2';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '1.2.2.02', 'Imóveis para Renda', 'ATIVO', id, false, false, true FROM fin_chart_accounts WHERE code = '1.2.2';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '1.2.3', 'Imobilizado', 'ATIVO', id, false, false, true FROM fin_chart_accounts WHERE code = '1.2';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '1.2.3.01', 'Terrenos', 'ATIVO', id, false, false, true FROM fin_chart_accounts WHERE code = '1.2.3';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '1.2.3.02', 'Edificações', 'ATIVO', id, false, false, true FROM fin_chart_accounts WHERE code = '1.2.3';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '1.2.3.03', 'Máquinas e Equipamentos', 'ATIVO', id, false, false, true FROM fin_chart_accounts WHERE code = '1.2.3';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '1.2.3.04', 'Móveis e Utensílios', 'ATIVO', id, false, false, true FROM fin_chart_accounts WHERE code = '1.2.3';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '1.2.3.05', 'Veículos', 'ATIVO', id, false, false, true FROM fin_chart_accounts WHERE code = '1.2.3';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '1.2.3.06', 'Equipamentos de Informática', 'ATIVO', id, false, false, true FROM fin_chart_accounts WHERE code = '1.2.3';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '1.2.3.07', '(-) Depreciação Acumulada', 'ATIVO', id, false, false, true FROM fin_chart_accounts WHERE code = '1.2.3';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '1.2.4', 'Intangível', 'ATIVO', id, false, false, true FROM fin_chart_accounts WHERE code = '1.2';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '1.2.4.01', 'Softwares', 'ATIVO', id, false, false, true FROM fin_chart_accounts WHERE code = '1.2.4';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '1.2.4.02', 'Marcas e Patentes', 'ATIVO', id, false, false, true FROM fin_chart_accounts WHERE code = '1.2.4';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '1.2.4.03', '(-) Amortização Acumulada', 'ATIVO', id, false, false, true FROM fin_chart_accounts WHERE code = '1.2.4';

-- GRUPO 2: PASSIVO
INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) VALUES
('2', 'PASSIVO', 'PASSIVO', NULL, false, false, true);

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '2.1', 'PASSIVO CIRCULANTE', 'PASSIVO', id, false, false, true FROM fin_chart_accounts WHERE code = '2';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '2.1.1', 'Fornecedores', 'PASSIVO', id, false, true, true FROM fin_chart_accounts WHERE code = '2.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '2.1.1.01', 'Fornecedores Nacionais', 'PASSIVO', id, false, true, true FROM fin_chart_accounts WHERE code = '2.1.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '2.1.1.02', 'Fornecedores Estrangeiros', 'PASSIVO', id, false, true, true FROM fin_chart_accounts WHERE code = '2.1.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '2.1.2', 'Empréstimos e Financiamentos CP', 'PASSIVO', id, false, true, true FROM fin_chart_accounts WHERE code = '2.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '2.1.2.01', 'Empréstimos Bancários', 'PASSIVO', id, false, true, true FROM fin_chart_accounts WHERE code = '2.1.2';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '2.1.2.02', 'Financiamentos de Equipamentos', 'PASSIVO', id, false, true, true FROM fin_chart_accounts WHERE code = '2.1.2';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '2.1.3', 'Obrigações Trabalhistas', 'PASSIVO', id, false, true, true FROM fin_chart_accounts WHERE code = '2.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '2.1.3.01', 'Salários a Pagar', 'PASSIVO', id, false, true, true FROM fin_chart_accounts WHERE code = '2.1.3';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '2.1.3.02', 'INSS a Recolher', 'PASSIVO', id, false, true, true FROM fin_chart_accounts WHERE code = '2.1.3';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '2.1.3.03', 'FGTS a Recolher', 'PASSIVO', id, false, true, true FROM fin_chart_accounts WHERE code = '2.1.3';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '2.1.3.04', 'Férias a Pagar', 'PASSIVO', id, false, true, true FROM fin_chart_accounts WHERE code = '2.1.3';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '2.1.3.05', '13º Salário a Pagar', 'PASSIVO', id, false, true, true FROM fin_chart_accounts WHERE code = '2.1.3';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '2.1.4', 'Obrigações Tributárias', 'PASSIVO', id, false, true, true FROM fin_chart_accounts WHERE code = '2.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '2.1.4.01', 'ICMS a Recolher', 'PASSIVO', id, false, true, true FROM fin_chart_accounts WHERE code = '2.1.4';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '2.1.4.02', 'PIS a Recolher', 'PASSIVO', id, false, true, true FROM fin_chart_accounts WHERE code = '2.1.4';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '2.1.4.03', 'COFINS a Recolher', 'PASSIVO', id, false, true, true FROM fin_chart_accounts WHERE code = '2.1.4';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '2.1.4.04', 'ISS a Recolher', 'PASSIVO', id, false, true, true FROM fin_chart_accounts WHERE code = '2.1.4';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '2.1.4.05', 'IRPJ a Recolher', 'PASSIVO', id, false, true, true FROM fin_chart_accounts WHERE code = '2.1.4';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '2.1.4.06', 'CSLL a Recolher', 'PASSIVO', id, false, true, true FROM fin_chart_accounts WHERE code = '2.1.4';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '2.1.4.07', 'Simples Nacional a Recolher', 'PASSIVO', id, false, true, true FROM fin_chart_accounts WHERE code = '2.1.4';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '2.1.5', 'Outras Obrigações', 'PASSIVO', id, false, true, true FROM fin_chart_accounts WHERE code = '2.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '2.1.5.01', 'Adiantamentos de Clientes', 'PASSIVO', id, false, true, true FROM fin_chart_accounts WHERE code = '2.1.5';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '2.1.5.02', 'Contas a Pagar Diversas', 'PASSIVO', id, false, true, true FROM fin_chart_accounts WHERE code = '2.1.5';

-- PASSIVO NÃO CIRCULANTE
INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '2.2', 'PASSIVO NÃO CIRCULANTE', 'PASSIVO', id, false, false, true FROM fin_chart_accounts WHERE code = '2';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '2.2.1', 'Empréstimos e Financiamentos LP', 'PASSIVO', id, false, true, true FROM fin_chart_accounts WHERE code = '2.2';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '2.2.1.01', 'Empréstimos Bancários LP', 'PASSIVO', id, false, true, true FROM fin_chart_accounts WHERE code = '2.2.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '2.2.1.02', 'Financiamentos LP', 'PASSIVO', id, false, true, true FROM fin_chart_accounts WHERE code = '2.2.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '2.2.2', 'Provisões', 'PASSIVO', id, false, false, true FROM fin_chart_accounts WHERE code = '2.2';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '2.2.2.01', 'Provisão para Contingências', 'PASSIVO', id, false, false, true FROM fin_chart_accounts WHERE code = '2.2.2';

-- PATRIMÔNIO LÍQUIDO
INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '2.3', 'PATRIMÔNIO LÍQUIDO', 'PASSIVO', id, false, false, true FROM fin_chart_accounts WHERE code = '2';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '2.3.1', 'Capital Social', 'PASSIVO', id, false, false, true FROM fin_chart_accounts WHERE code = '2.3';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '2.3.1.01', 'Capital Subscrito', 'PASSIVO', id, false, false, true FROM fin_chart_accounts WHERE code = '2.3.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '2.3.1.02', '(-) Capital a Integralizar', 'PASSIVO', id, false, false, true FROM fin_chart_accounts WHERE code = '2.3.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '2.3.2', 'Reservas', 'PASSIVO', id, false, false, true FROM fin_chart_accounts WHERE code = '2.3';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '2.3.2.01', 'Reserva Legal', 'PASSIVO', id, false, false, true FROM fin_chart_accounts WHERE code = '2.3.2';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '2.3.2.02', 'Reserva Estatutária', 'PASSIVO', id, false, false, true FROM fin_chart_accounts WHERE code = '2.3.2';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '2.3.2.03', 'Reserva de Lucros a Realizar', 'PASSIVO', id, false, false, true FROM fin_chart_accounts WHERE code = '2.3.2';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '2.3.3', 'Lucros ou Prejuízos Acumulados', 'PASSIVO', id, false, false, true FROM fin_chart_accounts WHERE code = '2.3';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '2.3.3.01', 'Lucros Acumulados', 'PASSIVO', id, false, false, true FROM fin_chart_accounts WHERE code = '2.3.3';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '2.3.3.02', '(-) Prejuízos Acumulados', 'PASSIVO', id, false, false, true FROM fin_chart_accounts WHERE code = '2.3.3';

-- GRUPO 3: RECEITAS
INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) VALUES
('3', 'RECEITAS', 'RECEITA', NULL, true, false, true);

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '3.1', 'RECEITA BRUTA DE VENDAS', 'RECEITA', id, true, true, true FROM fin_chart_accounts WHERE code = '3';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '3.1.1', 'Venda de Mercadorias', 'RECEITA', id, true, true, true FROM fin_chart_accounts WHERE code = '3.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '3.1.1.01', 'Vendas à Vista', 'RECEITA', id, true, true, true FROM fin_chart_accounts WHERE code = '3.1.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '3.1.1.02', 'Vendas a Prazo', 'RECEITA', id, true, true, true FROM fin_chart_accounts WHERE code = '3.1.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '3.1.1.03', 'Vendas com Cartão', 'RECEITA', id, true, true, true FROM fin_chart_accounts WHERE code = '3.1.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '3.1.2', 'Prestação de Serviços', 'RECEITA', id, true, true, true FROM fin_chart_accounts WHERE code = '3.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '3.1.2.01', 'Serviços Prestados à Vista', 'RECEITA', id, true, true, true FROM fin_chart_accounts WHERE code = '3.1.2';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '3.1.2.02', 'Serviços Prestados a Prazo', 'RECEITA', id, true, true, true FROM fin_chart_accounts WHERE code = '3.1.2';

-- DEDUÇÕES DA RECEITA BRUTA
INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '3.2', 'DEDUÇÕES DA RECEITA BRUTA', 'DESPESA', id, true, false, true FROM fin_chart_accounts WHERE code = '3';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '3.2.1', 'Impostos sobre Vendas', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '3.2';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '3.2.1.01', '(-) ICMS sobre Vendas', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '3.2.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '3.2.1.02', '(-) PIS sobre Vendas', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '3.2.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '3.2.1.03', '(-) COFINS sobre Vendas', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '3.2.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '3.2.1.04', '(-) ISS sobre Serviços', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '3.2.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '3.2.2', 'Devoluções e Abatimentos', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '3.2';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '3.2.2.01', '(-) Devoluções de Vendas', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '3.2.2';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '3.2.2.02', '(-) Abatimentos Concedidos', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '3.2.2';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '3.2.2.03', '(-) Descontos Incondicionais', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '3.2.2';

-- OUTRAS RECEITAS
INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '3.3', 'OUTRAS RECEITAS', 'RECEITA', id, true, true, true FROM fin_chart_accounts WHERE code = '3';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '3.3.1', 'Receitas Financeiras', 'RECEITA', id, true, true, true FROM fin_chart_accounts WHERE code = '3.3';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '3.3.1.01', 'Juros Recebidos', 'RECEITA', id, true, true, true FROM fin_chart_accounts WHERE code = '3.3.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '3.3.1.02', 'Descontos Obtidos', 'RECEITA', id, true, true, true FROM fin_chart_accounts WHERE code = '3.3.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '3.3.1.03', 'Rendimentos de Aplicações', 'RECEITA', id, true, true, true FROM fin_chart_accounts WHERE code = '3.3.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '3.3.1.04', 'Variações Monetárias Ativas', 'RECEITA', id, true, false, true FROM fin_chart_accounts WHERE code = '3.3.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '3.3.2', 'Receitas Não Operacionais', 'RECEITA', id, true, true, true FROM fin_chart_accounts WHERE code = '3.3';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '3.3.2.01', 'Ganho na Venda de Imobilizado', 'RECEITA', id, true, true, true FROM fin_chart_accounts WHERE code = '3.3.2';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '3.3.2.02', 'Outras Receitas', 'RECEITA', id, true, true, true FROM fin_chart_accounts WHERE code = '3.3.2';

-- GRUPO 4: CUSTOS
INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) VALUES
('4', 'CUSTOS', 'DESPESA', NULL, true, false, true);

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '4.1', 'CUSTOS DAS VENDAS', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '4';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '4.1.1', 'CMV - Custo das Mercadorias Vendidas', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '4.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '4.1.1.01', 'CMV - Revenda', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '4.1.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '4.1.2', 'CPV - Custo dos Produtos Vendidos', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '4.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '4.1.2.01', 'CPV - Produção', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '4.1.2';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '4.1.3', 'CSP - Custo dos Serviços Prestados', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '4.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '4.1.3.01', 'CSP - Mão de Obra Direta', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '4.1.3';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '4.1.3.02', 'CSP - Materiais Aplicados', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '4.1.3';

-- GRUPO 5: DESPESAS OPERACIONAIS
INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) VALUES
('5', 'DESPESAS OPERACIONAIS', 'DESPESA', NULL, true, false, true);

-- DESPESAS ADMINISTRATIVAS
INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.1', 'DESPESAS ADMINISTRATIVAS', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.1.1', 'Pessoal Administrativo', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.1.1.01', 'Salários e Ordenados', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5.1.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.1.1.02', 'Encargos Sociais', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5.1.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.1.1.03', 'Benefícios (VR, VT, Plano Saúde)', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5.1.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.1.1.04', '13º Salário', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5.1.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.1.1.05', 'Férias', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5.1.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.1.1.06', 'FGTS', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5.1.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.1.1.07', 'INSS Patronal', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5.1.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.1.2', 'Ocupação', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.1.2.01', 'Aluguel', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5.1.2';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.1.2.02', 'Condomínio', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5.1.2';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.1.2.03', 'IPTU', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5.1.2';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.1.2.04', 'Energia Elétrica', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5.1.2';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.1.2.05', 'Água e Esgoto', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5.1.2';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.1.2.06', 'Telefone e Internet', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5.1.2';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.1.3', 'Serviços de Terceiros', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.1.3.01', 'Honorários Contábeis', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5.1.3';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.1.3.02', 'Honorários Advocatícios', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5.1.3';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.1.3.03', 'Serviços de Limpeza', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5.1.3';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.1.3.04', 'Serviços de Segurança', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5.1.3';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.1.3.05', 'Serviços de TI', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5.1.3';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.1.4', 'Utilidades e Materiais', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.1.4.01', 'Material de Escritório', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5.1.4';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.1.4.02', 'Material de Limpeza', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5.1.4';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.1.4.03', 'Material de Copa', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5.1.4';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.1.5', 'Despesas Gerais', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.1.5.01', 'Depreciação', 'DESPESA', id, true, false, true FROM fin_chart_accounts WHERE code = '5.1.5';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.1.5.02', 'Seguros', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5.1.5';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.1.5.03', 'Taxas e Emolumentos', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5.1.5';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.1.5.04', 'Despesas Bancárias', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5.1.5';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.1.5.05', 'Correios e Malotes', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5.1.5';

-- DESPESAS COMERCIAIS
INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.2', 'DESPESAS COMERCIAIS', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.2.1', 'Pessoal Comercial', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5.2';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.2.1.01', 'Salários - Comercial', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5.2.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.2.1.02', 'Comissões sobre Vendas', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5.2.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.2.2', 'Marketing e Publicidade', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5.2';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.2.2.01', 'Publicidade e Propaganda', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5.2.2';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.2.2.02', 'Brindes e Amostras', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5.2.2';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.2.3', 'Logística', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5.2';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.2.3.01', 'Fretes sobre Vendas', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5.2.3';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.2.3.02', 'Combustível - Entregas', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5.2.3';

-- DESPESAS FINANCEIRAS
INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.3', 'DESPESAS FINANCEIRAS', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.3.1', 'Encargos Financeiros', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5.3';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.3.1.01', 'Juros Pagos', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5.3.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.3.1.02', 'Descontos Concedidos', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5.3.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.3.1.03', 'Tarifas Bancárias', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5.3.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.3.1.04', 'IOF', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5.3.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.3.1.05', 'Variações Monetárias Passivas', 'DESPESA', id, true, false, true FROM fin_chart_accounts WHERE code = '5.3.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.3.1.06', 'Multas e Juros Pagos', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5.3.1';

-- DESPESAS TRIBUTÁRIAS
INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.4', 'DESPESAS TRIBUTÁRIAS', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.4.1', 'Tributos sobre o Lucro', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5.4';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.4.1.01', 'IRPJ - Imposto de Renda', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5.4.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.4.1.02', 'CSLL - Contribuição Social', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5.4.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.4.2', 'Outros Tributos', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5.4';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.4.2.01', 'Taxas Municipais', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5.4.2';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.4.2.02', 'Contribuição Sindical', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5.4.2';

-- OUTRAS DESPESAS
INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.5', 'OUTRAS DESPESAS', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.5.1', 'Despesas Não Operacionais', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5.5';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.5.1.01', 'Perda na Venda de Imobilizado', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5.5.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.5.1.02', 'Multas e Penalidades', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5.5.1';

INSERT INTO fin_chart_accounts (code, name, nature, parent_id, in_dre, in_cashflow, active) 
SELECT '5.5.1.03', 'Outras Despesas', 'DESPESA', id, true, true, true FROM fin_chart_accounts WHERE code = '5.5.1';
