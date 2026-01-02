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

    const systemPrompt = `Você é um especialista em criar e otimizar prompts para agentes de IA conversacionais.

Sua tarefa é MELHORAR o texto fornecido, transformando-o em instruções claras e eficazes para um agente de IA.

DIRETRIZES:
- Torne as instruções DIRETAS e ESPECÍFICAS (ex: "Você deve..." ao invés de "É importante que...")
- Use linguagem imperativa quando apropriado
- Adicione exemplos concretos quando relevante
- Elimine ambiguidades e generalizações
- Mantenha tom profissional mas amigável
- Estruture bem o texto (use bullet points se ajudar)
- Preserve TODAS as informações do texto original
- NÃO adicione informações inventadas
- Se for uma mensagem template, mantenha placeholders como {{nome}}, {{empresa}}, etc.

${context ? `Contexto do campo: ${context}` : ''}

IMPORTANTE: Retorne APENAS o texto melhorado, sem explicações, comentários ou prefixos como "Aqui está" ou "Versão melhorada:".`;

    console.log('Enviando texto para melhoramento:', text.substring(0, 100) + '...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
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
