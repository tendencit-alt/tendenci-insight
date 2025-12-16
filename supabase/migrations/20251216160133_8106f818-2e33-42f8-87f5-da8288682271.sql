-- Adicionar foreign keys na tabela production_orders

-- FK para profiles (responsible_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'production_orders_responsible_id_fkey'
  ) THEN
    ALTER TABLE production_orders 
    ADD CONSTRAINT production_orders_responsible_id_fkey 
    FOREIGN KEY (responsible_id) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- FK para profiles (created_by)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'production_orders_created_by_fkey'
  ) THEN
    ALTER TABLE production_orders 
    ADD CONSTRAINT production_orders_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- FK para clients (client_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'production_orders_client_id_fkey'
  ) THEN
    ALTER TABLE production_orders 
    ADD CONSTRAINT production_orders_client_id_fkey 
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;
  END IF;
END $$;

-- FK para crm_deals (deal_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'production_orders_deal_id_fkey'
  ) THEN
    ALTER TABLE production_orders 
    ADD CONSTRAINT production_orders_deal_id_fkey 
    FOREIGN KEY (deal_id) REFERENCES crm_deals(id) ON DELETE SET NULL;
  END IF;
END $$;

-- FK para production_types (production_type_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'production_orders_production_type_id_fkey'
  ) THEN
    ALTER TABLE production_orders 
    ADD CONSTRAINT production_orders_production_type_id_fkey 
    FOREIGN KEY (production_type_id) REFERENCES production_types(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- FK para suppliers (supplier_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'production_orders_supplier_id_fkey'
  ) THEN
    ALTER TABLE production_orders 
    ADD CONSTRAINT production_orders_supplier_id_fkey 
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- FK para orders (order_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'production_orders_order_id_fkey'
  ) THEN
    ALTER TABLE production_orders 
    ADD CONSTRAINT production_orders_order_id_fkey 
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;
  END IF;
END $$;

-- FK para production_phases (current_phase_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'production_orders_current_phase_id_fkey'
  ) THEN
    ALTER TABLE production_orders 
    ADD CONSTRAINT production_orders_current_phase_id_fkey 
    FOREIGN KEY (current_phase_id) REFERENCES production_phases(id) ON DELETE SET NULL;
  END IF;
END $$;