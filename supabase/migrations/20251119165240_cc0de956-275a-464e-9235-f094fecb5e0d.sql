-- Criar bucket para arquivos do CRM se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('crm-files', 'crm-files', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas RLS para o bucket crm-files
CREATE POLICY "Autenticados podem fazer upload de arquivos CRM"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'crm-files');

CREATE POLICY "Autenticados podem ler arquivos CRM"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'crm-files');

CREATE POLICY "Autenticados podem atualizar arquivos CRM"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'crm-files');

CREATE POLICY "Autenticados podem deletar arquivos CRM"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'crm-files');