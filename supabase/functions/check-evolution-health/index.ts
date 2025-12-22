import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const evolutionUrl = Deno.env.get('EVOLUTION_API_URL')
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY')

    if (!evolutionUrl || !evolutionApiKey) {
      return new Response(
        JSON.stringify({ 
          online: false,
          error: 'Evolution API não configurada',
          checked_at: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Tentar conectar com timeout de 10 segundos
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    try {
      const response = await fetch(`${evolutionUrl}/instance/fetchInstances`, {
        method: 'GET',
        headers: { 'apikey': evolutionApiKey },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        // Atualizar last_health_check nas conexões WhatsApp
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
          { auth: { autoRefreshToken: false, persistSession: false } }
        )

        await supabase
          .from('tendenci_whatsapp_connections')
          .update({ 
            last_health_check: new Date().toISOString(),
            evolution_online: true
          })
          .neq('id', '00000000-0000-0000-0000-000000000000') // Update all

        return new Response(
          JSON.stringify({ 
            online: true,
            response_time_ms: Date.now(),
            checked_at: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else {
        return new Response(
          JSON.stringify({ 
            online: false,
            error: `Evolution API retornou status ${response.status}`,
            checked_at: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } catch (fetchError) {
      clearTimeout(timeoutId)
      
      const errorMessage = fetchError instanceof Error ? fetchError.message : 'Erro desconhecido'
      const isNetworkError = errorMessage.includes('No route to host') || 
                             errorMessage.includes('Connection refused') ||
                             errorMessage.includes('ECONNREFUSED') ||
                             errorMessage.includes('ETIMEDOUT') ||
                             errorMessage.includes('abort')

      // Atualizar status offline nas conexões
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        { auth: { autoRefreshToken: false, persistSession: false } }
      )

      await supabase
        .from('tendenci_whatsapp_connections')
        .update({ 
          last_health_check: new Date().toISOString(),
          evolution_online: false
        })
        .neq('id', '00000000-0000-0000-0000-000000000000')

      return new Response(
        JSON.stringify({ 
          online: false,
          error: isNetworkError ? 'Servidor Evolution API inacessível' : errorMessage,
          is_network_error: isNetworkError,
          checked_at: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        online: false,
        error: error instanceof Error ? error.message : 'Erro inesperado',
        checked_at: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
