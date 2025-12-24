-- Criar bucket campaign_media público para mídia de campanhas WhatsApp
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'campaign_media', 
  'campaign_media', 
  true,
  52428800,
  ARRAY[
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/webm',
    'audio/ogg',
    'audio/x-m4a',
    'audio/m4a',
    'video/mp4'
  ]
);

-- Permitir usuários autenticados fazer upload
CREATE POLICY "Authenticated users can upload campaign media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'campaign_media');

-- Permitir usuários autenticados deletar seus arquivos
CREATE POLICY "Authenticated users can delete campaign media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'campaign_media');

-- Permitir acesso público para leitura (necessário para Evolution API)
CREATE POLICY "Public read access to campaign media"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'campaign_media');