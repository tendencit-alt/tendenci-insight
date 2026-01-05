-- Add column to track which product IDs were sent in each message
ALTER TABLE ia_conversations 
ADD COLUMN IF NOT EXISTS sent_product_ids text[];

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ia_conversations_sent_product_ids 
ON ia_conversations USING GIN(sent_product_ids) 
WHERE sent_product_ids IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN ia_conversations.sent_product_ids IS 'Array of product IDs that were sent as photos in this message';