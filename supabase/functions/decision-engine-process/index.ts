import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DEEvent {
  id: string;
  event_type: string;
  tenant_id: string | null;
  payload: any;
  created_at: string;
}

interface DERule {
  id: string;
  name: string;
  event_type: string;
  condition: any;
  action: any;
  confidence_band: string;
  confidence_score: number;
  active: boolean;
  priority: number;
}

function evaluateCondition(rule: DERule, event: DEEvent, tenantCreatedAt: string | null): boolean {
  const cond = rule.condition ?? {};
  if (cond.max_activation_score !== undefined) {
    const score = event.payload?.activation_score;
    if (typeof score !== 'number' || score >= cond.max_activation_score) return false;
  }
  if (cond.min_days_since_created !== undefined) {
    if (!tenantCreatedAt) return false;
    const days = (Date.now() - new Date(tenantCreatedAt).getTime()) / 86400000;
    if (days < cond.min_days_since_created) return false;
  }
  return true;
}

async function executeAction(
  supabase: any, rule: DERule, event: DEEvent
): Promise<{ status: string; result: any; error?: string }> {
  const action = rule.action ?? {};
  try {
    switch (action.type) {
      case 'notify_owner':
        await supabase.from('ai_strategy_alerts').insert({
          tenant_id: event.tenant_id,
          alert_type: event.event_type,
          severity: action.severity ?? 'high',
          title: `[Decision Engine] ${rule.name}`,
          explanation: `Regra automática disparada: ${rule.name}`,
          recommended_action: JSON.stringify(action),
          metadata: { event_id: event.id, payload: event.payload },
        });
        return { status: 'success', result: { alert_created: true } };

      case 'start_dunning':
        await supabase.from('billing_dunning_steps').insert({
          tenant_id: event.tenant_id,
          step_level: action.step_level ?? 'L1',
          invoice_id: event.payload?.invoice_id ?? null,
          status: 'scheduled',
          reason: 'auto-triggered by decision engine',
          metadata: { rule_id: rule.id, event_id: event.id },
        });
        return { status: 'success', result: { dunning_started: true } };

      case 'suggest_upgrade':
        await supabase.from('automation_suggestions').insert({
          tenant_id: event.tenant_id,
          suggestion_type: 'plan_upgrade',
          title: 'Tenant pronto para upgrade',
          description: `Score de expansão atingiu ${event.payload?.expansion_ready_score}`,
          confidence: rule.confidence_score / 100,
          status: 'pending',
          proposed_action: action,
          evidence: event.payload,
        });
        return { status: 'success', result: { suggestion_created: true } };

      case 'trigger_assisted_onboarding':
      case 'trigger_reengagement':
      case 'send_welcome':
        // Marca evento processado e cria sugestão de touchpoint
        await supabase.from('automation_suggestions').insert({
          tenant_id: event.tenant_id,
          suggestion_type: action.type,
          title: rule.name,
          description: `Acionado por evento ${event.event_type}`,
          confidence: rule.confidence_score / 100,
          status: 'pending',
          proposed_action: action,
          evidence: event.payload,
        });
        return { status: 'success', result: { touchpoint_scheduled: true } };

      default:
        return { status: 'skipped', result: { reason: 'unknown_action_type' } };
    }
  } catch (err: any) {
    return { status: 'failed', result: {}, error: err.message };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // 1) buscar eventos não processados (até 50)
    const { data: events, error: eErr } = await supabase
      .from('decision_engine_events')
      .select('*')
      .eq('processed', false)
      .order('created_at', { ascending: true })
      .limit(50);
    if (eErr) throw eErr;

    if (!events || events.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2) buscar regras ativas
    const { data: rules } = await supabase
      .from('decision_engine_rules')
      .select('*')
      .eq('active', true)
      .order('priority', { ascending: true });

    let processedCount = 0;
    let executionCount = 0;

    for (const event of events as DEEvent[]) {
      let tenantCreatedAt: string | null = null;
      if (event.tenant_id) {
        const { data: t } = await supabase
          .from('tenants')
          .select('created_at')
          .eq('id', event.tenant_id)
          .maybeSingle();
        tenantCreatedAt = t?.created_at ?? null;
      }

      const matching = (rules ?? []).filter(
        (r: DERule) => r.event_type === event.event_type && evaluateCondition(r, event, tenantCreatedAt)
      );

      for (const rule of matching as DERule[]) {
        const exec = await executeAction(supabase, rule, event);
        await supabase.from('decision_engine_executions').insert({
          rule_id: rule.id,
          rule_name: rule.name,
          event_id: event.id,
          event_type: event.event_type,
          tenant_id: event.tenant_id,
          action_type: rule.action?.type ?? 'unknown',
          action_payload: rule.action,
          status: exec.status,
          confidence_band: rule.confidence_band,
          confidence_score: rule.confidence_score,
          result: exec.result,
          error_message: exec.error ?? null,
        });
        await supabase
          .from('decision_engine_rules')
          .update({ execution_count: (rule as any).execution_count + 1, last_executed_at: new Date().toISOString() })
          .eq('id', rule.id);
        executionCount++;
      }

      await supabase
        .from('decision_engine_events')
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq('id', event.id);
      processedCount++;
    }

    return new Response(
      JSON.stringify({ processed: processedCount, executions: executionCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('decision-engine-process error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
