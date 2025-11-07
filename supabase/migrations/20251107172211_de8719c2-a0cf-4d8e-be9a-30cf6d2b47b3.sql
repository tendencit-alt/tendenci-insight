-- Ajustar políticas de storage para permitir uploads sem autenticação (temporário para testes)
-- Pode ser ajustado depois quando implementar auth

DROP POLICY IF EXISTS "Permitir leitura de anexos autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir upload de anexos autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir exclusão de anexos autenticados" ON storage.objects;

-- Permitir acesso público temporário para uploads funcionarem
CREATE POLICY "Permitir leitura de anexos" ON storage.objects
  FOR SELECT USING (bucket_id = 'lead-attachments');

CREATE POLICY "Permitir upload de anexos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'lead-attachments');

CREATE POLICY "Permitir exclusão de anexos" ON storage.objects
  FOR DELETE USING (bucket_id = 'lead-attachments');

-- Ajustar políticas da tabela lead_attachments também
DROP POLICY IF EXISTS "Permitir leitura para autenticados" ON public.lead_attachments;
DROP POLICY IF EXISTS "Permitir inserção para autenticados" ON public.lead_attachments;
DROP POLICY IF EXISTS "Permitir exclusão para autenticados" ON public.lead_attachments;

CREATE POLICY "Permitir leitura de anexos" ON public.lead_attachments
  FOR SELECT USING (true);

CREATE POLICY "Permitir inserção de anexos" ON public.lead_attachments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir exclusão de anexos" ON public.lead_attachments
  FOR DELETE USING (true);