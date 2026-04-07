
-- Fix inconsistent descriptions for Pedido #4
UPDATE fin_ledger_entries
SET description = 'Pedido #4 - Receita'
WHERE description IN ('Pedido #4 - Receita (Nautico)', 'Pedido #4 - Receita (Rustico)');

UPDATE fin_receivables
SET description = 'Pedido #4'
WHERE description IN ('Pedido #4 (Nautico)', 'Pedido #4 (Rustico)');
