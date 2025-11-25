-- Normalizar números de telefone dos arquitetos
-- Adicionar o 9° dígito em números com 10 dígitos (DDD + 8 dígitos formato antigo)

-- Primeiro, criar uma tabela temporária para logar os números problemáticos
CREATE TABLE IF NOT EXISTS temp_phone_fixes (
  architect_id UUID,
  original_phone TEXT,
  fixed_phone TEXT,
  action TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Log de números antes da correção
INSERT INTO temp_phone_fixes (architect_id, original_phone, action)
SELECT 
  id,
  phone,
  'needs_9th_digit'
FROM architects
WHERE LENGTH(REGEXP_REPLACE(phone, '[^0-9]', '', 'g')) = 10
  AND phone IS NOT NULL
  AND phone != '';

-- Atualizar números com 10 dígitos: adicionar 9 após o DDD (primeiros 2 dígitos)
UPDATE architects
SET 
  phone = CONCAT(
    SUBSTRING(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 1, 2),
    '9',
    SUBSTRING(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 3)
  ),
  updated_at = NOW()
WHERE LENGTH(REGEXP_REPLACE(phone, '[^0-9]', '', 'g')) = 10
  AND phone IS NOT NULL
  AND phone != '';

-- Atualizar a tabela de log com os números corrigidos
UPDATE temp_phone_fixes t
SET 
  fixed_phone = a.phone,
  action = 'fixed_9th_digit'
FROM architects a
WHERE t.architect_id = a.id
  AND t.action = 'needs_9th_digit'
  AND t.fixed_phone IS NULL;

-- Log de números muito curtos (menos de 10 dígitos - falta DDD)
INSERT INTO temp_phone_fixes (architect_id, original_phone, action)
SELECT 
  id,
  phone,
  'invalid_too_short'
FROM architects
WHERE LENGTH(REGEXP_REPLACE(phone, '[^0-9]', '', 'g')) < 10
  AND phone IS NOT NULL
  AND phone != '';

-- Comentário sobre a tabela temporária
COMMENT ON TABLE temp_phone_fixes IS 'Tabela temporária para auditoria de correções de números de telefone. Pode ser deletada após verificação.';