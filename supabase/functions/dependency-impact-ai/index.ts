import { corsHeaders } from 'npm:@supabase/supabase-js@2.95.0/cors';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { incident_group_id } = await req.json();
    if (!incident_group_id) {
      return new Response(JSON.stringify({ error: 'incident_group_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: events } = await supabase
      .from('dependency_impact_events')
      .select('failed_module_code, impacted_module_code, impact_level, cascade_depth, source_event_type, detected_at')
      .eq('incident_group_id', incident_group_id);

    if (!events?.length) {
      return new Response(JSON.stringify({ error: 'no events for this incident' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a SaaS reliability engineer. Analyze cascading module failures and identify the most likely root cause. Respond in Portuguese (BR), concise.' },
          { role: 'user', content: `Eventos de impacto detectados:\n${JSON.stringify(events, null, 2)}\n\nIdentifique:\n1. Módulo causa-raiz mais provável\n2. Confidence (0-100)\n3. Justificativa em 2 linhas\n\nResponda em JSON: {"root_cause":"...","confidence":0,"reasoning":"..."}` },
        ],
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      return new Response(JSON.stringify({ error: 'AI failed', detail: txt }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiJson = await aiResp.json();
    const content = aiJson.choices?.[0]?.message?.content || '{}';
    const cleaned = content.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    let parsed;
    try { parsed = JSON.parse(cleaned); } catch { parsed = { root_cause: null, confidence: 0, reasoning: cleaned }; }

    if (parsed.root_cause) {
      await supabase.from('root_cause_analysis_events').insert({
        incident_group_id,
        root_cause_module_code: parsed.root_cause,
        confidence_score: parsed.confidence || 50,
        derived_from: 'ai_analysis',
        affected_modules: events.map((e: any) => e.impacted_module_code),
        reasoning: parsed.reasoning,
      });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
