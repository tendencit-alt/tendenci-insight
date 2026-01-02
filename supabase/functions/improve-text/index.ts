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

    const systemPrompt = `Você é um assistente especializado em melhorar textos em português brasileiro.
Sua tarefa é melhorar o texto fornecido, tornando-o mais:
- Claro e bem estruturado
- Profissional e adequado ao contexto empresarial
- Gramaticalmente correto
- Conciso, sem perder informações importantes

${context ? `Contexto do campo: ${context}` : ''}

IMPORTANTE:
- Mantenha o significado original do texto
- Preserve informações técnicas e específicas
- Use linguagem profissional mas acessível
- Retorne APENAS o texto melhorado, sem explicações adicionais`;

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
