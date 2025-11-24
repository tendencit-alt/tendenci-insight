-- ========================================
-- FASE 2: Atualizar created_by em conexões antigas
-- ========================================

-- Atualizar created_by para o primeiro admin/vendedor do sistema
DO $$
DECLARE
  default_user_id UUID;
BEGIN
  -- Buscar primeiro admin ou vendedor do sistema
  SELECT id INTO default_user_id
  FROM profiles
  WHERE role IN ('admin', 'vendedor')
  ORDER BY created_at ASC
  LIMIT 1;

  -- Se encontrou usuário, atualizar conexões sem created_by
  IF default_user_id IS NOT NULL THEN
    UPDATE tendenci_whatsapp_connections
    SET created_by = default_user_id,
        last_sync = NOW()
    WHERE created_by IS NULL;
    
    RAISE NOTICE 'Atualizado created_by para % conexões antigas', 
      (SELECT COUNT(*) FROM tendenci_whatsapp_connections WHERE created_by = default_user_id);
  ELSE
    RAISE WARNING 'Nenhum usuário admin/vendedor encontrado. created_by não foi atualizado.';
  END IF;
END $$;

-- ========================================
-- FASE 5: Preencher instance_id NULL
-- ========================================

-- Preencher instance_id usando instance_name (fallback temporário)
UPDATE tendenci_whatsapp_connections
SET instance_id = instance_name
WHERE instance_id IS NULL 
  AND instance_name IS NOT NULL;

-- ========================================
-- VALIDAÇÕES: Adicionar constraints
-- ========================================

-- ✅ Garantir que created_by não seja NULL em novos registros
ALTER TABLE tendenci_whatsapp_connections
ALTER COLUMN created_by SET NOT NULL;

-- ✅ Garantir que instance_id não seja NULL
-- (Só aplicar se não houver mais NULLs)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM tendenci_whatsapp_connections 
    WHERE instance_id IS NULL
  ) THEN
    ALTER TABLE tendenci_whatsapp_connections
    ALTER COLUMN instance_id SET NOT NULL;
    RAISE NOTICE '✅ Constraint NOT NULL adicionada em instance_id';
  ELSE
    RAISE WARNING '⚠️ Ainda existem instance_id NULL. Corrija manualmente antes de aplicar constraint.';
  END IF;
END $$;

-- ========================================
-- ÍNDICES para performance
-- ========================================

-- Índice para buscar conexões por usuário
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_created_by 
ON tendenci_whatsapp_connections(created_by);

-- Índice para buscar conexões ativas
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_status 
ON tendenci_whatsapp_connections(status) 
WHERE status = 'connected';

COMMENT ON INDEX idx_whatsapp_connections_created_by IS 'Performance para filtrar conexões por usuário';
COMMENT ON INDEX idx_whatsapp_connections_status IS 'Performance para listar apenas conexões ativas';