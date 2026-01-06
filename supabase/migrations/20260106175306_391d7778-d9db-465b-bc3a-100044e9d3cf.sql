-- ============================================
-- PASSO 1: LIMPAR DUPLICADOS EXISTENTES ANTES DE CRIAR ÍNDICE
-- ============================================

-- Identificar e manter apenas o registro MAIS RECENTE de cada arquiteto com status 'enviado'
-- Deletar os mais antigos para permitir criação do índice único
DELETE FROM tendenci_prospec_arq_campaign_architects 
WHERE id IN (
  SELECT id FROM (
    SELECT id, 
           ROW_NUMBER() OVER (
             PARTITION BY architect_id 
             ORDER BY data_envio DESC NULLS LAST, created_at DESC NULLS LAST
           ) as rn
    FROM tendenci_prospec_arq_campaign_architects
    WHERE status = 'enviado'
  ) ranked
  WHERE rn > 1
);

-- ============================================
-- PASSO 2: CRIAR ÍNDICE ÚNICO PARA PREVENIR FUTUROS DUPLICADOS
-- ============================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_architect_sent 
ON tendenci_prospec_arq_campaign_architects (architect_id) 
WHERE status = 'enviado';

-- ============================================
-- PASSO 3: TRIGGER PARA VALIDAR INSERÇÕES/ATUALIZAÇÕES
-- ============================================
CREATE OR REPLACE FUNCTION prevent_duplicate_dispatch()
RETURNS TRIGGER AS $$
BEGIN
  -- Se estamos inserindo ou atualizando para status 'pendente' ou 'enviando'
  -- Verificar se arquiteto já tem registro ativo em outra campanha
  IF NEW.status IN ('pendente', 'enviando') THEN
    IF EXISTS (
      SELECT 1 FROM tendenci_prospec_arq_campaign_architects 
      WHERE architect_id = NEW.architect_id 
      AND status IN ('enviado', 'pendente', 'enviando')
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'Arquiteto já está reservado ou foi disparado em outra campanha';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remover trigger existente se houver
DROP TRIGGER IF EXISTS trg_prevent_duplicate_dispatch ON tendenci_prospec_arq_campaign_architects;

-- Criar trigger
CREATE TRIGGER trg_prevent_duplicate_dispatch
BEFORE INSERT OR UPDATE ON tendenci_prospec_arq_campaign_architects
FOR EACH ROW EXECUTE FUNCTION prevent_duplicate_dispatch();