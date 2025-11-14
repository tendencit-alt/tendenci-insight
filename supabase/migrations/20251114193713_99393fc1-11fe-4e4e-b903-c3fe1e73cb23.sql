-- Adicionar apenas as foreign keys que faltam
ALTER TABLE tendenci_prospec_arq_campaigns
  ADD CONSTRAINT tendenci_prospec_arq_campaigns_segmento_id_fkey 
    FOREIGN KEY (segmento_id) 
    REFERENCES tendenci_prospec_arq_segments(id) 
    ON DELETE SET NULL,
  ADD CONSTRAINT tendenci_prospec_arq_campaigns_sequencia_id_fkey 
    FOREIGN KEY (sequencia_id) 
    REFERENCES tendenci_prospec_arq_sequences(id) 
    ON DELETE SET NULL;