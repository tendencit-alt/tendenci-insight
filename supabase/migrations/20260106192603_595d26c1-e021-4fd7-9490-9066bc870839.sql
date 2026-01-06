-- Criar função RPC para lock robusto com SELECT FOR UPDATE SKIP LOCKED
CREATE OR REPLACE FUNCTION acquire_message_lock(p_phone text, p_instance text)
RETURNS TABLE (
  id uuid,
  phone_number text,
  instance_name text,
  content text,
  created_at timestamptz,
  processed boolean,
  is_processing boolean
) AS $$
BEGIN
  RETURN QUERY
  WITH locked_row AS (
    SELECT pm.id
    FROM ia_pending_messages pm
    WHERE pm.phone_number = p_phone
      AND pm.instance_name = p_instance
      AND pm.processed = false
      AND pm.is_processing = false
    ORDER BY pm.created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  UPDATE ia_pending_messages pm
  SET is_processing = true
  FROM locked_row
  WHERE pm.id = locked_row.id
  RETURNING pm.id, pm.phone_number, pm.instance_name, pm.content, pm.created_at, pm.processed, pm.is_processing;
END;
$$ LANGUAGE plpgsql;