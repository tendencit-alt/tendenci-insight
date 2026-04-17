import { corsHeaders } from 'npm:@supabase/supabase-js@2.95.0/cors';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: pending, error } = await supabase.rpc('find_pending_auto_recoveries');
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const list = (pending || []) as Array<{
    failure_code: string;
    recovery_code: string;
    target_module: string;
    attempts_so_far: number;
    max_attempts: number;
  }>;

  const results: any[] = [];

  for (const p of list) {
    const idemKey = `auto:${p.recovery_code}:${p.failure_code}:${p.target_module}:${Math.floor(Date.now() / 60000 / 5)}`;
    try {
      const { data, error: dispErr } = await supabase.functions.invoke('recovery-dispatcher', {
        body: {
          recovery_code: p.recovery_code,
          failure_code: p.failure_code,
          target_module: p.target_module,
          execution_mode: 'auto',
          idempotency_key: idemKey,
        },
      });
      if (dispErr) throw new Error(dispErr.message);
      results.push({ ...p, dispatched: true, result: data?.result, duration_ms: data?.duration_ms });
    } catch (e: any) {
      results.push({ ...p, dispatched: false, error: e?.message || String(e) });
    }
  }

  return new Response(JSON.stringify({
    swept_at: new Date().toISOString(),
    candidates: list.length,
    executed: results.filter(r => r.dispatched).length,
    succeeded: results.filter(r => r.result === 'success').length,
    failed: results.filter(r => r.result === 'failed' || !r.dispatched).length,
    results,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
