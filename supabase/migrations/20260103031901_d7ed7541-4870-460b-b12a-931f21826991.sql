-- Add is_processing column for atomic lock on debounce
ALTER TABLE ia_pending_messages 
ADD COLUMN IF NOT EXISTS is_processing boolean DEFAULT false;

-- Index for performance on lock checks
CREATE INDEX IF NOT EXISTS idx_ia_pending_processing 
ON ia_pending_messages(phone_number, instance_name, is_processing, processed) 
WHERE processed = false;