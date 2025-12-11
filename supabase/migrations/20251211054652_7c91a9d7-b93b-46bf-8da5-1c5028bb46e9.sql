-- Remove a foreign key duplicada que está causando erro 300 (ambiguidade)
ALTER TABLE production_orders 
DROP CONSTRAINT IF EXISTS fk_production_orders_crm_deal;