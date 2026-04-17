import { corsHeaders } from 'npm:@supabase/supabase-js@2.95.0/cors';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

interface DispatchRequest {
  recovery_code: string;
  failure_code: string;
  target_module?: string;
  incident_group_id?: string;
  execution_mode?: 'auto' | 'manual' | 'assisted' | 'scheduled';
  idempotency_key?: string;
  reason?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  let body: DispatchRequest;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: 'invalid json' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  if (!body.recovery_code || !body.failure_code) {
    return new Response(JSON.stringify({ error: 'recovery_code and failure_code required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 1. Buscar definição da ação
  const { data: action, error: catalogErr } = await supabase
    .from('recovery_catalog')
    .select('*')
    .eq('code', body.recovery_code)
    .eq('active', true)
    .single();

  if (catalogErr || !action) {
    return new Response(JSON.stringify({ error: 'recovery action not found or inactive' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 2. Validação: protected requer mode != auto
  if (action.recovery_type === 'protected_recovery' && body.execution_mode === 'auto') {
    return new Response(JSON.stringify({ error: 'protected_recovery cannot run in auto mode' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 3. Registrar log (idempotente via RPC)
  const idemKey = body.idempotency_key || `${body.recovery_code}:${body.failure_code}:${body.target_module || 'global'}:${Math.floor(Date.now() / 60000)}`;
  const { data: logId, error: regErr } = await supabase.rpc('register_recovery_execution', {
    p_failure_code: body.failure_code,
    p_recovery_code: body.recovery_code,
    p_execution_mode: body.execution_mode || 'manual',
    p_target_module: body.target_module || action.target_module,
    p_incident_group_id: body.incident_group_id || null,
    p_idempotency_key: idemKey,
  });

  if (regErr) {
    return new Response(JSON.stringify({ error: 'failed to register', detail: regErr.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const startedAt = Date.now();
  let result: 'success' | 'failed' = 'success';
  let message = 'Recovery executada com sucesso';
  let response: any = {};

  try {
    if (action.handler_kind === 'edge_function' && action.handler_target) {
      const { data, error } = await supabase.functions.invoke(action.handler_target, {
        body: { triggered_by: 'recovery_dispatcher', recovery_code: body.recovery_code, target_module: body.target_module },
      });
      if (error) throw new Error(error.message);
      response = data || {};
    } else if (action.handler_kind === 'sql_rpc' && action.handler_target) {
      const { data, error } = await supabase.rpc(action.handler_target);
      if (error) throw new Error(error.message);
      response = { rpc_result: data };
    } else if (action.handler_kind === 'noop') {
      response = { noop: true };
    } else {
      throw new Error('handler_target not configured');
    }
  } catch (e: any) {
    result = 'failed';
    message = e?.message || 'erro desconhecido na execução';
    response = { error: message };
  }

  const duration = Date.now() - startedAt;
  await supabase
    .from('recovery_execution_logs')
    .update({
      result,
      message,
      response,
      finished_at: new Date().toISOString(),
      duration_ms: duration,
    })
    .eq('id', logId);

  return new Response(JSON.stringify({
    log_id: logId,
    result,
    message,
    duration_ms: duration,
    response,
  }), {
    status: result === 'success' ? 200 : 500,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
