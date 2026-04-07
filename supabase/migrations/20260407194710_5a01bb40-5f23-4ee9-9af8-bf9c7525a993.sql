
-- Move producao config to point to chart account 3.1.6 (Produçao Premio)
UPDATE fin_strategic_resource_account_configs
SET chart_account_id = '4e15e864-61ca-44cf-bb24-f33d36ecb10b'
WHERE resource_type = 'producao' AND id = '1c44727b-f54f-4cb5-b05c-180b5726e795';

-- Delete the orphan config with null resource_type that was created for 3.1.6
DELETE FROM fin_strategic_resource_account_configs
WHERE id = '2f9428af-3173-4fb9-b522-d646a3a351e8' AND resource_type IS NULL;
