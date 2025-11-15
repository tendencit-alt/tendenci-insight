
-- Adicionar índice único para prevenir deals duplicados
-- Um lead só pode ter UM deal aberto por vez
CREATE UNIQUE INDEX idx_one_open_deal_per_lead 
ON crm_deals (lead_id) 
WHERE status = 'aberto' AND lead_id IS NOT NULL;

-- Comentário explicativo
COMMENT ON INDEX idx_one_open_deal_per_lead IS 
'Garante que um lead só pode ter um deal aberto por vez, prevenindo duplicação entre pipelines';
