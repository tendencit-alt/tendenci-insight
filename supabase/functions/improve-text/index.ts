import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, context } = await req.json();

    if (!text || text.trim().length === 0) {
      throw new Error('Texto não fornecido');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    const systemPrompt = `Você é um especialista em otimizar textos para configuração de agentes de IA de atendimento ao cliente.

REGRA FUNDAMENTAL: Analise o CONTEXTO fornecido e o TIPO de texto para melhorar de forma apropriada.

## TIPOS DE TEXTO E COMO MELHORAR:

### MENSAGENS DE SAUDAÇÃO/BOAS-VINDAS:
Se o contexto menciona "boas-vindas", "saudação" ou "inicial":
- Tornar acolhedora e profissional
- Demonstrar disponibilidade genuína para ajudar
- Manter breve e simpática
- Usar tom confiante de quem tem experiência

### MENSAGENS DE DESPEDIDA:
Se o contexto menciona "despedida" ou "encerrar":
- Agradecer pela interação
- Deixar porta aberta para retorno
- Reforçar disponibilidade futura

### MENSAGENS DE AUSÊNCIA:
Se o contexto menciona "ausência" ou "fora do horário":
- Informar indisponibilidade com empatia
- Indicar quando voltará ou próximos passos
- Manter tom acolhedor mesmo na ausência

### DESCRIÇÕES DE NEGÓCIO/EMPRESA:
Se o contexto menciona "negócio", "empresa", "descrição", "história", "missão":
- Destacar pontos fortes e diferenciais
- Usar linguagem clara e atrativa
- Manter todas as informações originais
- NÃO transformar em instruções

### PRODUTOS E SERVIÇOS:
Se o contexto menciona "produtos", "serviços", "oferecidos":
- Organizar em lista clara se apropriado
- Destacar benefícios de cada item
- Manter linguagem descritiva, não imperativa

### DIFERENCIAIS COMPETITIVOS:
Se o contexto menciona "diferenciais", "vantagens", "destacar":
- Tornar mais impactante e vendedor
- Usar bullet points para clareza
- Destacar o que torna único

### PÚBLICO-ALVO:
Se o contexto menciona "público", "cliente ideal", "perfil":
- Descrever de forma clara e objetiva
- Ajudar a IA a identificar o público

### CRITÉRIOS DE CLASSIFICAÇÃO DE LEADS:
Se o contexto menciona "lead", "quente", "morno", "frio", "classificar":
- Tornar critérios objetivos e mensuráveis
- Usar linguagem clara para a IA identificar
- Manter formato de lista

### INSTRUÇÕES E COMPORTAMENTOS PARA IA:
Se o contexto menciona "instruções", "comportamento", "limites", "negociação", "transferir", "follow-up", "estratégia", "lidar com clientes":
- Transformar em comandos diretos e imperativos
- Usar "Você deve...", "Sempre...", "Nunca..."
- Adicionar nuances de atendimento consultivo senior
- Incluir gatilhos de identificação de oportunidades

### RESPOSTAS IDEAIS/EXEMPLOS:
Se o contexto menciona "resposta ideal", "exemplo", "como responder":
- Manter o contexto pergunta-resposta
- Tornar a resposta mais consultiva e profissional
- Adicionar empatia quando apropriado
- Manter tom natural de conversa

### PERSONALIDADE DO AGENTE:
Se o contexto menciona "personalidade", "tom", "estilo":
- Refinar a descrição para ser mais precisa
- Adicionar exemplos de comportamento quando apropriado

CONTEXTO DO CAMPO: ${context || 'Não especificado'}

DIRETRIZES GERAIS:
- PRESERVE todas as informações originais
- NÃO invente dados, números ou informações que não existam no original
- Mantenha placeholders como {{nome}}, {{empresa}}, etc.
- Estruture bem o texto (bullets, parágrafos curtos quando apropriado)
- Adapte o tom ao tipo de texto identificado pelo contexto
- Se for mensagem/saudação, mantenha como mensagem - NÃO transforme em instruções
- Se for descrição, mantenha como descrição - NÃO transforme em instruções

IMPORTANTE: Retorne APENAS o texto melhorado, sem explicações, comentários ou prefixos como "Aqui está" ou "Versão melhorada:".`;

    console.log('Melhorando texto com contexto:', context);
    console.log('Texto original (primeiros 100 chars):', text.substring(0, 100) + '...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro na API Lovable AI:', response.status, errorText);
      
      if (response.status === 429) {
        throw new Error('Limite de requisições excedido. Tente novamente em alguns segundos.');
      }
      if (response.status === 402) {
        throw new Error('Créditos insuficientes. Adicione créditos ao workspace.');
      }
      
      throw new Error(`Erro na API: ${response.status}`);
    }

    const result = await response.json();
    const improvedText = result.choices?.[0]?.message?.content;

    if (!improvedText) {
      throw new Error('Resposta vazia da IA');
    }

    console.log('Texto melhorado com sucesso');

    return new Response(
      JSON.stringify({ improvedText: improvedText.trim() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro ao melhorar texto:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
