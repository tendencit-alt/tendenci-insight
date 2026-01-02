-- Tabela principal de configurações da IA
CREATE TABLE public.tendenci_ia_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  secao text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}',
  ativa boolean DEFAULT true,
  versao integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  UNIQUE(secao)
);

-- Tabela de produtos que a IA pode oferecer
CREATE TABLE public.tendenci_ia_produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  preco_base numeric DEFAULT 0,
  categoria text,
  diferenciais text[] DEFAULT '{}',
  quando_oferecer text,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de base de conhecimento
CREATE TABLE public.tendenci_ia_conhecimento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  conteudo text NOT NULL,
  categoria text,
  palavras_chave text[] DEFAULT '{}',
  prioridade integer DEFAULT 0,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tendenci_ia_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tendenci_ia_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tendenci_ia_conhecimento ENABLE ROW LEVEL SECURITY;

-- Policies for tendenci_ia_config
CREATE POLICY "Autenticados podem ler config IA" ON public.tendenci_ia_config
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins podem gerenciar config IA" ON public.tendenci_ia_config
  FOR ALL USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

-- Policies for tendenci_ia_produtos
CREATE POLICY "Autenticados podem ler produtos IA" ON public.tendenci_ia_produtos
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins podem gerenciar produtos IA" ON public.tendenci_ia_produtos
  FOR ALL USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

-- Policies for tendenci_ia_conhecimento
CREATE POLICY "Autenticados podem ler conhecimento IA" ON public.tendenci_ia_conhecimento
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins podem gerenciar conhecimento IA" ON public.tendenci_ia_conhecimento
  FOR ALL USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

-- RPC para n8n buscar toda config
CREATE OR REPLACE FUNCTION public.get_ia_config()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'negocio', (SELECT config FROM tendenci_ia_config WHERE secao = 'negocio' AND ativa = true),
    'identidade', (SELECT config FROM tendenci_ia_config WHERE secao = 'identidade' AND ativa = true),
    'comunicacao', (SELECT config FROM tendenci_ia_config WHERE secao = 'comunicacao' AND ativa = true),
    'qualificacao', (SELECT config FROM tendenci_ia_config WHERE secao = 'qualificacao' AND ativa = true),
    'vendas', (SELECT config FROM tendenci_ia_config WHERE secao = 'vendas' AND ativa = true),
    'comportamento', (SELECT config FROM tendenci_ia_config WHERE secao = 'comportamento' AND ativa = true),
    'regras', (SELECT config FROM tendenci_ia_config WHERE secao = 'regras' AND ativa = true),
    'produtos', (SELECT COALESCE(jsonb_agg(row_to_json(p)), '[]'::jsonb) FROM tendenci_ia_produtos p WHERE ativo = true),
    'conhecimento', (SELECT COALESCE(jsonb_agg(row_to_json(k)), '[]'::jsonb) FROM tendenci_ia_conhecimento k WHERE ativo = true)
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_ia_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tendenci_ia_config_updated_at
  BEFORE UPDATE ON tendenci_ia_config
  FOR EACH ROW EXECUTE FUNCTION update_ia_config_updated_at();

CREATE TRIGGER update_tendenci_ia_produtos_updated_at
  BEFORE UPDATE ON tendenci_ia_produtos
  FOR EACH ROW EXECUTE FUNCTION update_ia_config_updated_at();

CREATE TRIGGER update_tendenci_ia_conhecimento_updated_at
  BEFORE UPDATE ON tendenci_ia_conhecimento
  FOR EACH ROW EXECUTE FUNCTION update_ia_config_updated_at();

-- Inserir configurações padrão
INSERT INTO tendenci_ia_config (secao, config) VALUES
('negocio', '{"nome_empresa": "", "ramo": "", "localizacao": "", "horario_funcionamento": "", "descricao": ""}'),
('identidade', '{"nome_ia": "Assistente Tendenci", "genero": "neutro", "personalidade": "profissional", "tom_voz": "consultivo", "avatar": "🤖"}'),
('comunicacao', '{"tamanho_max_msg": 500, "usar_emojis": "moderado", "usar_audios": false, "tempo_resposta_ms": 2000, "msg_boas_vindas": "", "msg_despedida": "", "msg_ausencia": ""}'),
('qualificacao', '{"perguntas": [], "criterios_lead": {"quente": "", "morno": "", "frio": ""}, "campos_obrigatorios": ["nome", "telefone"]}'),
('vendas', '{"tecnicas": [], "gatilhos_urgencia": [], "objecoes": [], "quando_transferir": "", "script_followup": "", "promocoes": []}'),
('comportamento', '{"nunca_fazer": [], "limites_negociacao": "", "pedir_ajuda_quando": "", "clientes_dificeis": "", "nivel_insistencia": "moderado"}'),
('regras', '{"regras_personalizadas": [], "condicoes_especiais": [], "excecoes": [], "prioridades": []}')