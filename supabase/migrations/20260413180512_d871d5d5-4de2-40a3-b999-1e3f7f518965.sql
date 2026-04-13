
DO $$
DECLARE
  v_root_id uuid;
BEGIN
  -- Create root 8 - Investimentos
  INSERT INTO fin_chart_accounts (id, code, name, nature, in_dre, in_cashflow, active)
  VALUES (gen_random_uuid(), '8', 'Investimentos', 'DESPESA', false, true, true)
  RETURNING id INTO v_root_id;

  -- Create categories directly under root
  INSERT INTO fin_chart_accounts (parent_id, code, name, nature, in_dre, in_cashflow, active) VALUES
  (v_root_id, '8.1', 'Compra equipamentos', 'DESPESA', false, true, true),
  (v_root_id, '8.2', 'Compra máquinas', 'DESPESA', false, true, true),
  (v_root_id, '8.3', 'Compra móveis', 'DESPESA', false, true, true),
  (v_root_id, '8.4', 'Investimentos tecnologia', 'DESPESA', false, true, true),
  (v_root_id, '8.5', 'Investimentos estrutura', 'DESPESA', false, true, true);
END $$;
