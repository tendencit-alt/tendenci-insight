
-- 1. Rename existing project for Pedido #1 (Planejados)
UPDATE fin_projects 
SET name = 'Planejados - Igreen Comercial S.A #1'
WHERE id = '7de4c61a-c2cd-4228-80bc-96cee157e05d';

-- 2. Create new project for Pedido #2 (Revenda)
INSERT INTO fin_projects (id, name, status)
VALUES (gen_random_uuid(), 'Revenda - Igreen Comercial S.A #2', 'ativo');

-- 3. Update order #2 with the new project
UPDATE orders 
SET project_id = (SELECT id FROM fin_projects WHERE name = 'Revenda - Igreen Comercial S.A #2' LIMIT 1)
WHERE id = '5350697b-06f6-4b65-bdd3-c16803c6b202';

-- 4. Update order_items of pedido #2 to point to new project
UPDATE order_items
SET project_id = (SELECT id FROM fin_projects WHERE name = 'Revenda - Igreen Comercial S.A #2' LIMIT 1)
WHERE order_id = '5350697b-06f6-4b65-bdd3-c16803c6b202';

-- 5. Update ledger entries for Pedido #2 to link to new project
UPDATE fin_ledger_entries
SET project_id = (SELECT id FROM fin_projects WHERE name = 'Revenda - Igreen Comercial S.A #2' LIMIT 1)
WHERE (description LIKE 'PED #2%' OR description LIKE 'Pedido #2%')
  AND project_id IS NULL;

-- 6. Update fin_payables for Pedido #2
UPDATE fin_payables
SET project_id = (SELECT id FROM fin_projects WHERE name = 'Revenda - Igreen Comercial S.A #2' LIMIT 1)
WHERE order_id = '5350697b-06f6-4b65-bdd3-c16803c6b202'
  AND project_id IS NULL;
