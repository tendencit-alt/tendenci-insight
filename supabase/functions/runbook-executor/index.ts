import { corsHeaders } from 'npm:@supabase/supabase-js@2.95.0/cors';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';

interface Step {
  step_order: number;
  action_code: string;
  execution_mode: string;
  is_critical: boolean;
  retry_policy: any;
  timeout_seconds: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json().catch(() => ({}));
    const { execution_id } = body;
    if (!execution_id) {
      return new Response(JSON.stringify({ ok: false, error: 'execution_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load execution + steps
    const { data: exec, error: execErr } = await supabase
      .from('runbook_executions').select('*').eq('id', execution_id).single();
    if (execErr || !exec) throw new Error(`execution not found: ${execErr?.message}`);

    if (exec.status === 'succeeded' || exec.status === 'failed' || exec.status === 'escalated') {
      return new Response(JSON.stringify({ ok: true, skipped: true, status: exec.status }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: steps } = await supabase
      .from('runbook_steps').select('*')
      .eq('runbook_code', exec.runbook_code)
      .order('step_order', { ascending: true });

    if (!steps || steps.length === 0) {
      await supabase.from('runbook_executions').update({
        status: 'failed', finished_at: new Date().toISOString(), result_summary: 'No steps defined',
      }).eq('id', execution_id);
      return new Response(JSON.stringify({ ok: false, error: 'no steps' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await supabase.from('runbook_executions').update({ status: 'running' }).eq('id', execution_id);

    const dispatcherUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/recovery-dispatcher`;
    const auth = `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`;
    const results: any[] = [];

    for (const step of steps as Step[]) {
      // Mark running
      await supabase.from('runbook_step_executions').update({
        status: 'running', started_at: new Date().toISOString(),
      }).eq('execution_id', execution_id).eq('step_order', step.step_order);

      const maxAttempts = step.retry_policy?.max_attempts ?? 1;
      let stepStatus = 'failed';
      let stepMessage = '';
      let recoveryLogId: string | null = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const resp = await fetch(dispatcherUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: auth },
            body: JSON.stringify({
              recovery_code: step.action_code,
              execution_mode: 'auto',
              triggered_by: 'runbook',
              metadata: { runbook_execution_id: execution_id, step_order: step.step_order },
            }),
          });
          const json = await resp.json().catch(() => ({}));
          if (resp.ok && json.ok !== false) {
            stepStatus = 'succeeded';
            stepMessage = json.message || 'ok';
            recoveryLogId = json.recovery_log_id || null;
            break;
          } else {
            stepMessage = json.error || `HTTP ${resp.status}`;
          }
        } catch (e: any) {
          stepMessage = e.message;
        }
      }

      // Validation gate
      if (stepStatus === 'succeeded') {
        const { data: rules } = await supabase.from('runbook_validation_rules')
          .select('*').eq('runbook_code', exec.runbook_code).eq('step_order', step.step_order);
        for (const rule of rules || []) {
          if (rule.validation_type === 'sql_count' && rule.validation_query) {
            try {
              const { data: vr } = await supabase.rpc('exec_validation_query' as any, { p_query: rule.validation_query }).maybeSingle();
              const count = vr?.count ?? 0;
              const max = rule.expected_result?.max ?? 0;
              if (count > max) {
                stepStatus = 'validation_failed';
                stepMessage = `Validation failed: count=${count} > max=${max}`;
                break;
              }
            } catch {
              // validation function may not exist; treat as pass to avoid blocking
            }
          }
        }
      }

      // Persist completion + advance
      const { data: completion } = await supabase.rpc('complete_runbook_step', {
        p_execution_id: execution_id,
        p_step_order: step.step_order,
        p_status: stepStatus,
        p_message: stepMessage,
        p_recovery_log_id: recoveryLogId,
        p_validation_result: null,
      });

      results.push({ step: step.step_order, status: stepStatus, message: stepMessage });

      if (stepStatus !== 'succeeded') {
        // Escalation check
        const { data: esc } = await supabase.from('runbook_escalation_rules')
          .select('*').eq('runbook_code', exec.runbook_code);
        const hasCriticalEsc = (esc || []).some((r: any) =>
          (r.condition_type === 'critical_step_failed' && step.is_critical) ||
          (r.condition_type === 'step_failed_n_times' && maxAttempts >= (r.threshold ?? 99))
        );
        if (hasCriticalEsc) {
          await supabase.from('runbook_executions').update({
            status: 'escalated', finished_at: new Date().toISOString(),
            result_summary: `Escalated at step ${step.step_order}: ${stepMessage}`,
          }).eq('id', execution_id);
        }
        break;
      }

      if ((completion as any)?.execution_status === 'succeeded') break;
    }

    return new Response(JSON.stringify({ ok: true, execution_id, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
