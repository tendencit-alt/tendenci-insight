
-- Get parent_id for root code 2
DO $$
DECLARE
  v_root_id uuid;
  v_sub_id uuid;
BEGIN
  SELECT id INTO v_root_id FROM fin_chart_accounts WHERE code = '2' AND parent_id IS NULL LIMIT 1;
  
  IF v_root_id IS NULL THEN
    RAISE EXCEPTION 'Root code 2 not found';
  END IF;

  -- Create subgroup 2.4
  INSERT INTO fin_chart_accounts (id, parent_id, code, name, nature, in_dre, in_cashflow, active)
  VALUES (gen_random_uuid(), v_root_id, '2.4', 'Antecipação de Recebíveis', 'DESPESA', true, true, true)
  RETURNING id INTO v_sub_id;

  -- Create categories under 2.4
  INSERT INTO fin_chart_accounts (parent_id, code, name, nature, in_dre, in_cashflow, active) VALUES
    (v_sub_id, '2.4.1', 'Antecipação de cartão', 'DESPESA', true, true, true),
    (v_sub_id, '2.4.2', 'Antecipação de boletos', 'DESPESA', true, true, true),
    (v_sub_id, '2.4.3', 'Outras antecipações de recebíveis', 'DESPESA', true, true, true);
END $$;
