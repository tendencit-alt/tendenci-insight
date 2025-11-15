-- Remove a constraint que impede múltiplos deals abertos por lead
-- Isso permitirá criar múltiplos deals para o mesmo lead em diferentes pipelines
DROP INDEX IF EXISTS idx_one_open_deal_per_lead;