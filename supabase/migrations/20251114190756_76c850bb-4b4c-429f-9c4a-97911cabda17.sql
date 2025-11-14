-- Adicionar coluna architect_ids para seleção manual de arquitetos
ALTER TABLE tendenci_prospec_arq_segments
ADD COLUMN IF NOT EXISTS architect_ids uuid[] DEFAULT NULL;

COMMENT ON COLUMN tendenci_prospec_arq_segments.architect_ids IS 'IDs dos arquitetos selecionados manualmente para este segmento';