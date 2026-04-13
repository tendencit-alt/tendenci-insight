
-- Root IDs
-- 1: 73ad55c9-bfd1-4865-a20a-70b0ba47447e
-- 2: fea62b69-abb5-4ab6-92de-a9ebe7a1ca37
-- 3: 592b9105-84c4-4a9f-9392-d795edd72990
-- 4: 3fccaa83-9ef2-49e9-bd17-9c1819da4033
-- 5: 2de31da0-10d3-4fe8-8a4d-786c18204f60
-- 6: 383ab7d2-55cb-484b-bc2a-f04733b3d123
-- 7: 717b6713-9012-4b17-a2f6-e67b8aa06f53

-- ========== DELETE ALL CHILDREN (no entries exist) ==========
-- Delete level 3 (categories)
DELETE FROM fin_chart_accounts WHERE parent_id IN (
  SELECT id FROM fin_chart_accounts WHERE parent_id IN (
    SELECT id FROM fin_chart_accounts WHERE parent_id IS NULL
  )
);
-- Delete level 2 (subgroups)
DELETE FROM fin_chart_accounts WHERE parent_id IN (
  SELECT id FROM fin_chart_accounts WHERE parent_id IS NULL
);

-- ========== DEACTIVATE ROOT 7 ==========
UPDATE fin_chart_accounts SET active = false WHERE id = '717b6713-9012-4b17-a2f6-e67b8aa06f53';

-- ========== ROOT 1 — RECEITAS (flat categories) ==========
INSERT INTO fin_chart_accounts (parent_id, code, name, nature, in_dre, in_cashflow, active) VALUES
('73ad55c9-bfd1-4865-a20a-70b0ba47447e', '1.1', 'Venda de Produtos', 'RECEITA', true, true, true),
('73ad55c9-bfd1-4865-a20a-70b0ba47447e', '1.2', 'Prestação de Serviços', 'RECEITA', true, true, true),
('73ad55c9-bfd1-4865-a20a-70b0ba47447e', '1.3', 'Receita Recorrente', 'RECEITA', true, true, true),
('73ad55c9-bfd1-4865-a20a-70b0ba47447e', '1.4', 'Receita de Frete', 'RECEITA', true, true, true),
('73ad55c9-bfd1-4865-a20a-70b0ba47447e', '1.5', 'Outras Receitas', 'RECEITA', true, true, true);

-- ========== ROOT 2 — DESPESAS SOBRE VENDAS ==========
DO $$
DECLARE
  v_2_1 uuid; v_2_2 uuid; v_2_3 uuid; v_2_4 uuid; v_2_5 uuid;
BEGIN
  INSERT INTO fin_chart_accounts (parent_id, code, name, nature, in_dre, in_cashflow, active)
  VALUES ('fea62b69-abb5-4ab6-92de-a9ebe7a1ca37', '2.1', 'Impostos sobre venda', 'DESPESA', true, true, true) RETURNING id INTO v_2_1;
  INSERT INTO fin_chart_accounts (parent_id, code, name, nature, in_dre, in_cashflow, active)
  VALUES ('fea62b69-abb5-4ab6-92de-a9ebe7a1ca37', '2.2', 'Taxas sobre venda', 'DESPESA', true, true, true) RETURNING id INTO v_2_2;
  INSERT INTO fin_chart_accounts (parent_id, code, name, nature, in_dre, in_cashflow, active)
  VALUES ('fea62b69-abb5-4ab6-92de-a9ebe7a1ca37', '2.3', 'Custos diretos da venda', 'DESPESA', true, true, true) RETURNING id INTO v_2_3;
  INSERT INTO fin_chart_accounts (parent_id, code, name, nature, in_dre, in_cashflow, active)
  VALUES ('fea62b69-abb5-4ab6-92de-a9ebe7a1ca37', '2.4', 'Comissões sobre venda', 'DESPESA', true, true, true) RETURNING id INTO v_2_4;
  INSERT INTO fin_chart_accounts (parent_id, code, name, nature, in_dre, in_cashflow, active)
  VALUES ('fea62b69-abb5-4ab6-92de-a9ebe7a1ca37', '2.5', 'Antecipação de recebíveis', 'DESPESA', true, true, true) RETURNING id INTO v_2_5;

  -- Categories under Antecipação de recebíveis
  INSERT INTO fin_chart_accounts (parent_id, code, name, nature, in_dre, in_cashflow, active) VALUES
  (v_2_5, '2.5.1', 'Antecipação cartão crédito', 'DESPESA', true, true, true),
  (v_2_5, '2.5.2', 'Antecipação duplicatas', 'DESPESA', true, true, true),
  (v_2_5, '2.5.3', 'Antecipação boletos', 'DESPESA', true, true, true),
  (v_2_5, '2.5.4', 'Cessão recebíveis', 'DESPESA', true, true, true);
END $$;

-- ========== ROOT 3 — DESPESAS OPERACIONAIS ==========
DO $$
DECLARE
  v_3_1 uuid; v_3_2 uuid; v_3_3 uuid; v_3_4 uuid; v_3_5 uuid; v_3_6 uuid;
BEGIN
  INSERT INTO fin_chart_accounts (parent_id, code, name, nature, in_dre, in_cashflow, active)
  VALUES ('592b9105-84c4-4a9f-9392-d795edd72990', '3.1', 'Equipe', 'DESPESA', true, true, true) RETURNING id INTO v_3_1;
  INSERT INTO fin_chart_accounts (parent_id, code, name, nature, in_dre, in_cashflow, active)
  VALUES ('592b9105-84c4-4a9f-9392-d795edd72990', '3.2', 'Estrutura Física', 'DESPESA', true, true, true) RETURNING id INTO v_3_2;
  INSERT INTO fin_chart_accounts (parent_id, code, name, nature, in_dre, in_cashflow, active)
  VALUES ('592b9105-84c4-4a9f-9392-d795edd72990', '3.3', 'Tecnologia', 'DESPESA', true, true, true) RETURNING id INTO v_3_3;
  INSERT INTO fin_chart_accounts (parent_id, code, name, nature, in_dre, in_cashflow, active)
  VALUES ('592b9105-84c4-4a9f-9392-d795edd72990', '3.4', 'Marketing', 'DESPESA', true, true, true) RETURNING id INTO v_3_4;
  INSERT INTO fin_chart_accounts (parent_id, code, name, nature, in_dre, in_cashflow, active)
  VALUES ('592b9105-84c4-4a9f-9392-d795edd72990', '3.5', 'Serviços Externos', 'DESPESA', true, true, true) RETURNING id INTO v_3_5;
  INSERT INTO fin_chart_accounts (parent_id, code, name, nature, in_dre, in_cashflow, active)
  VALUES ('592b9105-84c4-4a9f-9392-d795edd72990', '3.6', 'Administrativo', 'DESPESA', true, true, true) RETURNING id INTO v_3_6;

  -- Tarifas bancárias moved to Administrativo
  INSERT INTO fin_chart_accounts (parent_id, code, name, nature, in_dre, in_cashflow, active)
  VALUES (v_3_6, '3.6.1', 'Tarifas bancárias', 'DESPESA', true, true, true);
END $$;

-- ========== ROOT 4 — DEPRECIAÇÃO E AMORTIZAÇÃO ==========
INSERT INTO fin_chart_accounts (parent_id, code, name, nature, in_dre, in_cashflow, active) VALUES
('3fccaa83-9ef2-49e9-bd17-9c1819da4033', '4.1', 'Depreciação', 'DESPESA', true, false, true),
('3fccaa83-9ef2-49e9-bd17-9c1819da4033', '4.2', 'Amortização', 'DESPESA', true, false, true);

-- ========== ROOT 5 — RESULTADO FINANCEIRO ==========
DO $$
DECLARE
  v_5_1 uuid; v_5_2 uuid;
BEGIN
  INSERT INTO fin_chart_accounts (parent_id, code, name, nature, in_dre, in_cashflow, active)
  VALUES ('2de31da0-10d3-4fe8-8a4d-786c18204f60', '5.1', 'Receitas financeiras', 'RECEITA', true, true, true) RETURNING id INTO v_5_1;
  INSERT INTO fin_chart_accounts (parent_id, code, name, nature, in_dre, in_cashflow, active)
  VALUES ('2de31da0-10d3-4fe8-8a4d-786c18204f60', '5.2', 'Despesas financeiras', 'DESPESA', true, true, true) RETURNING id INTO v_5_2;
END $$;

-- ========== ROOT 6 — CAPITAL E FINANCIAMENTOS ==========
INSERT INTO fin_chart_accounts (parent_id, code, name, nature, in_dre, in_cashflow, active) VALUES
('383ab7d2-55cb-484b-bc2a-f04733b3d123', '6.1', 'Entrada de empréstimos', 'RECEITA', false, true, true),
('383ab7d2-55cb-484b-bc2a-f04733b3d123', '6.2', 'Pagamento principal empréstimos', 'DESPESA', false, true, true);
