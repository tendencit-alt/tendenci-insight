-- Add new columns to tendenci_ia_conhecimento for enhanced knowledge management
ALTER TABLE tendenci_ia_conhecimento 
ADD COLUMN IF NOT EXISTS arquivos jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS videos jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS fonte text,
ADD COLUMN IF NOT EXISTS autor text,
ADD COLUMN IF NOT EXISTS validade date,
ADD COLUMN IF NOT EXISTS contexto_uso text,
ADD COLUMN IF NOT EXISTS aplicacao text[] DEFAULT '{}'::text[];

-- Add comments for documentation
COMMENT ON COLUMN tendenci_ia_conhecimento.arquivos IS 'Array de arquivos [{url, nome, tipo, tamanho}]';
COMMENT ON COLUMN tendenci_ia_conhecimento.videos IS 'Array de vídeos [{type: upload|url, url, nome}]';
COMMENT ON COLUMN tendenci_ia_conhecimento.fonte IS 'Origem do conhecimento (livro, site, treinamento)';
COMMENT ON COLUMN tendenci_ia_conhecimento.autor IS 'Autor ou responsável pelo conteúdo';
COMMENT ON COLUMN tendenci_ia_conhecimento.validade IS 'Data até quando o conhecimento é válido';
COMMENT ON COLUMN tendenci_ia_conhecimento.contexto_uso IS 'Quando este conhecimento deve ser usado';
COMMENT ON COLUMN tendenci_ia_conhecimento.aplicacao IS 'Tipos de situação: vendas, suporte, onboarding, etc';

-- Migrate legacy arquivo_url to new arquivos array
UPDATE tendenci_ia_conhecimento 
SET arquivos = jsonb_build_array(
  jsonb_build_object(
    'url', arquivo_url,
    'nome', COALESCE(
      substring(arquivo_url from '[^/]+$'),
      'arquivo'
    ),
    'tipo', COALESCE(tipo_arquivo, 'unknown')
  )
)
WHERE arquivo_url IS NOT NULL 
  AND arquivo_url != ''
  AND (arquivos IS NULL OR arquivos = '[]'::jsonb);