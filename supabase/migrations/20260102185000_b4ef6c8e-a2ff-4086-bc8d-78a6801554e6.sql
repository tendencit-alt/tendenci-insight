-- Adicionar campos de mídia à tabela de produtos
ALTER TABLE public.tendenci_ia_produtos 
ADD COLUMN IF NOT EXISTS imagem_url TEXT,
ADD COLUMN IF NOT EXISTS galeria TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Adicionar campos de mídia à tabela de conhecimento
ALTER TABLE public.tendenci_ia_conhecimento 
ADD COLUMN IF NOT EXISTS arquivo_url TEXT,
ADD COLUMN IF NOT EXISTS tipo_arquivo TEXT,
ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'faq';

-- Criar bucket para assets da IA
INSERT INTO storage.buckets (id, name, public)
VALUES ('ia-assets', 'ia-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para ia-assets
CREATE POLICY "Imagens da IA são públicas" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'ia-assets');

CREATE POLICY "Autenticados podem fazer upload de assets" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'ia-assets' AND auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem deletar assets" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'ia-assets' AND auth.uid() IS NOT NULL);