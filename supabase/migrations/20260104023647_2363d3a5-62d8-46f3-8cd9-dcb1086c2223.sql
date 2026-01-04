-- Add inventory linking columns to tendenci_ia_produtos
ALTER TABLE tendenci_ia_produtos 
ADD COLUMN IF NOT EXISTS inventory_product_id uuid REFERENCES products(id),
ADD COLUMN IF NOT EXISTS inventory_location_id uuid REFERENCES stock_locations(id);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_tendenci_ia_produtos_inventory_product ON tendenci_ia_produtos(inventory_product_id);
CREATE INDEX IF NOT EXISTS idx_tendenci_ia_produtos_inventory_location ON tendenci_ia_produtos(inventory_location_id);