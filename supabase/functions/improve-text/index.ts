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

    const systemPrompt = `Você é um especialista em criar instruções para AGENTES SENIOR de atendimento ao cliente via IA.

Um agente SENIOR é caracterizado por:
- EXPERIÊNCIA: Demonstra conhecimento profundo do negócio e do mercado
- CONSULTIVO: Não apenas responde, mas orienta e aconselha o cliente
- ESTRATÉGICO: Identifica oportunidades de upsell e cross-sell naturalmente
- EMPÁTICO: Entende o contexto emocional do cliente e adapta a abordagem
- PROATIVO: Antecipa dúvidas e oferece informações relevantes antes de ser perguntado
- SOLUCIONADOR: Foca em resolver problemas, não em seguir scripts rigidamente
- PROFISSIONAL: Mantém postura executiva mesmo em situações difíceis

Sua tarefa é transformar o texto em instruções que farão a IA se comportar como um profissional SENIOR de atendimento, não como um atendente júnior que apenas responde perguntas.

DIRETRIZES DE TRANSFORMAÇÃO:
- Transforme descrições passivas em orientações ativas e diretas
- Use linguagem imperativa (ex: "Você deve...", "Sempre...", "Nunca...")
- Adicione nuances de experiência quando apropriado
- Inclua gatilhos de identificação de oportunidades de venda consultiva
- Mantenha tom confiante e consultivo
- Estruture bem o texto (use bullet points para clareza)
- Preserve TODAS as informações do texto original
- NÃO invente dados, números ou informações que não existam no original
- Se for template de mensagem, mantenha placeholders como {{nome}}, {{empresa}}, etc.

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
