import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ErrorLogPayload {
  title: string;
  description?: string;
  module: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  source?: 'manual' | 'edge_function' | 'frontend' | 'webhook';
  error_code?: string;
  stack_trace?: string;
  metadata?: Record<string, unknown>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: ErrorLogPayload = await req.json();

    // Validação
    if (!payload.title || !payload.module) {
      return new Response(
        JSON.stringify({ error: 'title and module are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🐛 Logging system error: ${payload.title} (${payload.module})`);

    const { data, error } = await supabase
      .from('system_errors')
      .insert({
        title: payload.title,
        description: payload.description || null,
        module: payload.module,
        severity: payload.severity || 'medium',
        source: payload.source || 'edge_function',
        error_code: payload.error_code || null,
        stack_trace: payload.stack_trace || null,
        metadata: payload.metadata || null,
        status: 'open'
      })
      .select('id')
      .single();

    if (error) {
      console.error('❌ Error logging system error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ System error logged with id: ${data?.id}`);

    return new Response(
      JSON.stringify({ success: true, id: data?.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ Unexpected error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
