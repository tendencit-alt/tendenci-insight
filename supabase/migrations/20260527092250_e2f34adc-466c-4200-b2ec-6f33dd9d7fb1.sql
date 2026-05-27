
UPDATE orders SET status='aprovado', data_aprovacao=NOW() WHERE id='33333333-e2e0-4000-8000-000000000100';
UPDATE orders SET status='liberado_producao' WHERE id='33333333-e2e0-4000-8000-000000000100';
UPDATE orders SET status='em_producao' WHERE id='33333333-e2e0-4000-8000-000000000100';
UPDATE orders SET status='producao_concluida' WHERE id='33333333-e2e0-4000-8000-000000000100';
UPDATE orders SET status='faturado', data_faturamento=NOW() WHERE id='33333333-e2e0-4000-8000-000000000100';
