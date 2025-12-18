-- PARTE 1: Copiar observações do Deal → Cliente (onde cliente não tem observação)
UPDATE clients c
SET notes = d.note
FROM leads l, crm_deals d
WHERE l.client_id = c.id
  AND d.lead_id = l.id
  AND d.note IS NOT NULL AND d.note != ''
  AND (c.notes IS NULL OR c.notes = '');

-- PARTE 2: Copiar observações do Cliente → Deal (onde deal não tem observação)
UPDATE crm_deals d
SET note = c.notes
FROM leads l, clients c
WHERE d.lead_id = l.id
  AND l.client_id = c.id
  AND c.notes IS NOT NULL AND c.notes != ''
  AND (d.note IS NULL OR d.note = '');

-- PARTE 3: Copiar observações do Deal → Projeto (onde houver projeto relacionado)
UPDATE projects p
SET notes = d.note
FROM crm_deals d
WHERE (p.crm_deal_id = d.id OR p.deal_id = d.id)
  AND d.note IS NOT NULL AND d.note != ''
  AND (p.notes IS NULL OR p.notes = '');

-- PARTE 4: Criar função de sincronização automática
CREATE OR REPLACE FUNCTION sync_deal_notes_to_related()
RETURNS TRIGGER AS $$
BEGIN
  -- Se a nota foi atualizada e não está vazia
  IF NEW.note IS NOT NULL AND NEW.note != '' THEN
    -- Sincronizar para cliente via lead
    UPDATE clients c
    SET notes = NEW.note
    FROM leads l
    WHERE l.id = NEW.lead_id
      AND l.client_id = c.id;
      
    -- Sincronizar para projeto relacionado
    UPDATE projects
    SET notes = NEW.note
    WHERE crm_deal_id = NEW.id OR deal_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PARTE 5: Criar trigger para sincronização automática
DROP TRIGGER IF EXISTS trigger_sync_deal_notes ON crm_deals;
CREATE TRIGGER trigger_sync_deal_notes
AFTER INSERT OR UPDATE OF note ON crm_deals
FOR EACH ROW
EXECUTE FUNCTION sync_deal_notes_to_related();