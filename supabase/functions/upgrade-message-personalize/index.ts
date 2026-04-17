// Edge function: enriquece a mensagem de um upgrade signal usando Lovable AI
import { corsHeaders } from '@supabase/supabase-js/cors';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY não configurada' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { signal_id } = await req.json();
    if (!signal_id) {
      return new Response(JSON.stringify({ error: 'signal_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: signal, error: sErr } = await supabase
      .from('upgrade_signals')
      .select('*, tenants(name), tenant_plans!upgrade_signals_recommended_plan_id_fkey(name, price), entitlement_catalog!upgrade_signals_recommended_entitlement_code_fkey(name, description)')
      .eq('id', signal_id)
      .single();

    if (sErr || !signal) {
      return new Response(JSON.stringify({ error: sErr?.message ?? 'signal not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = `Empresa: ${signal.tenants?.name ?? '—'}
Sinal: ${signal.signal_type} (severidade ${signal.severity}, confiança ${signal.confidence_score}%)
Plano sugerido: ${signal.tenant_plans?.name ?? '—'} (R$ ${signal.tenant_plans?.price ?? '—'}/mês)
Recurso sugerido: ${signal.entitlement_catalog?.name ?? '—'}
Contexto: ${JSON.stringify(signal.context)}

Escreva UMA frase curta (máx 180 caracteres), em português, conversacional e específica, sugerindo o upgrade. Sem emojis. Sem "olá". Direto ao ponto, com benefício concreto.`;

    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: 'Você é um copywriter SaaS focado em conversão. Mensagens curtas, específicas e empáticas.' },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: 'Limite de requisições atingido. Tente novamente em instantes.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: 'Créditos esgotados. Adicione créditos na sua workspace.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const txt = await aiResp.text();
      console.error('AI gateway error', aiResp.status, txt);
      return new Response(JSON.stringify({ error: 'AI gateway error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const aiData = await aiResp.json();
    const message = aiData?.choices?.[0]?.message?.content?.trim() ?? '';

    await supabase.from('upgrade_signals').update({ ai_message: message }).eq('id', signal_id);

    return new Response(JSON.stringify({ ai_message: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('upgrade-message-personalize error', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'unknown' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
