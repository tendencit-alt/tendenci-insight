-- SOLUÇÃO DEFINITIVA: Remover a constraint completamente
-- Isso permite que qualquer event_type seja usado sem restrições
ALTER TABLE architect_history DROP CONSTRAINT IF EXISTS architect_history_event_type_check;