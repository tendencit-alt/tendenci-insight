-- Limpar mensagens órfãs presas há mais de 5 minutos
UPDATE ia_pending_messages 
SET processed = true, is_processing = false
WHERE processed = false 
AND created_at < NOW() - INTERVAL '5 minutes';

-- Resetar locks expirados (is_processing = true há mais de 30 segundos)
UPDATE ia_pending_messages 
SET is_processing = false
WHERE is_processing = true 
AND created_at < NOW() - INTERVAL '30 seconds';