-- Add cancellation reason field to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS motivo_cancelamento TEXT;

-- Comment for documentation
COMMENT ON COLUMN orders.motivo_cancelamento IS 'Motivo do cancelamento do pedido';