-- Criar bucket para anexos da timeline se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('crm-timeline-attachments', 'crm-timeline-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de acesso para anexos da timeline
DROP POLICY IF EXISTS "Usuários autenticados podem fazer upload de anexos da timeline" ON storage.objects;
CREATE POLICY "Usuários autenticados podem fazer upload de anexos da timeline"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'crm-timeline-attachments');

DROP POLICY IF EXISTS "Usuários autenticados podem visualizar anexos da timeline" ON storage.objects;
CREATE POLICY "Usuários autenticados podem visualizar anexos da timeline"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'crm-timeline-attachments');

DROP POLICY IF EXISTS "Usuários autenticados podem deletar anexos da timeline" ON storage.objects;
CREATE POLICY "Usuários autenticados podem deletar anexos da timeline"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'crm-timeline-attachments');