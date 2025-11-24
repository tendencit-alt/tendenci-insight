-- Corrigir arquitetos que foram contactados por campanha mas estão com status errado
-- Atualizar status_funil de 'contato_iniciado' para 'adicionar_epata' (Contato Feito por I.A)
UPDATE architects
SET 
  status_funil = 'adicionar_epata',
  tag_prospeccao = 'contactado',
  updated_at = NOW()
WHERE status_funil = 'contato_iniciado'
  AND data_ultimo_contato IS NOT NULL;