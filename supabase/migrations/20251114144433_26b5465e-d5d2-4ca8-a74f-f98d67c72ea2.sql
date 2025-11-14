-- Adicionar campo para armazenar arquivo do cliente
ALTER TABLE public.clients ADD COLUMN attachment_path TEXT;
ALTER TABLE public.clients ADD COLUMN attachment_name TEXT;
ALTER TABLE public.clients ADD COLUMN attachment_type TEXT;

-- Criar bucket para arquivos de clientes
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-files',
  'client-files',
  false,
  20971520,
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']
);

-- Políticas RLS para client-files bucket
CREATE POLICY "Autenticados podem fazer upload de arquivos de clientes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'client-files');

CREATE POLICY "Autenticados podem visualizar arquivos de clientes"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'client-files');

CREATE POLICY "Autenticados podem deletar arquivos de clientes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'client-files');