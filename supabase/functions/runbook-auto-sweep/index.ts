import { corsHeaders } from 'npm:@supabase/supabase-js@2.95.0/cors';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const { data: pending, error } = await supabase.rpc('find_pending_runbook_incidents');
    if (error) throw error;

    const executorUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/runbook-executor`;
    const auth = `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`;
    const launched: any[] = [];

    for (const row of (pending as any[]) || []) {
      const { data: execId, error: startErr } = await supabase.rpc('start_runbook_execution', {
        p_runbook_code: row.runbook_code,
        p_incident_id: row.incident_id,
        p_triggered_by: 'auto',
      });
      if (startErr) continue;
      // Fire-and-forget executor
      fetch(executorUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: auth },
        body: JSON.stringify({ execution_id: execId }),
      }).catch(() => {});
      launched.push({ incident_id: row.incident_id, runbook_code: row.runbook_code, execution_id: execId });
    }

    return new Response(JSON.stringify({ ok: true, launched }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
