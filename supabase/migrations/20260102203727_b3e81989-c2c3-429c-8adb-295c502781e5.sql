-- Add videos column to tendenci_ia_produtos for storing multiple videos (uploads and URLs)
ALTER TABLE tendenci_ia_produtos 
ADD COLUMN IF NOT EXISTS videos jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN tendenci_ia_produtos.videos IS 'Array de vídeos [{type: "upload"|"url", url: string, nome?: string}]';