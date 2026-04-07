ALTER TABLE fin_strategic_resource_account_configs
  ADD COLUMN IF NOT EXISTS default_percentage NUMERIC(5,2) DEFAULT 0;