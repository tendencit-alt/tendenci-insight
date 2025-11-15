import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

console.log('Log Prospecção Interaction Function Started')

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Obter usuário autenticado
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      console.error('Erro de autenticação:', userError)
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { 
      architect_id, 
      tipo, 
      canal, 
      mensagem, 
      campanha_id,
      metadata 
    } = await req.json()

    console.log('Registrando log de interação:', { 
      architect_id, 
      tipo, 
      canal, 
      mensagem,
      user_id: user.id 
    })

    // Validações
    if (!architect_id || !tipo || !mensagem) {
      return new Response(
        JSON.stringify({ 
          error: 'Campos obrigatórios: architect_id, tipo, mensagem' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validar tipo
    const tiposValidos = ['ia', 'vendedor', 'sistema', 'agendamento']
    if (!tiposValidos.includes(tipo)) {
      return new Response(
        JSON.stringify({ 
          error: `Tipo inválido. Use: ${tiposValidos.join(', ')}` 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Inserir log
    const { data: log, error: logError } = await supabaseClient
      .from('tendenci_prospec_arq_logs')
      .insert({
        architect_id,
        tipo,
        canal: canal || 'manual',
        mensagem,
        enviado_por: user.id,
        campanha_id,
        metadata: metadata || null,
      })
      .select()
      .single()

    if (logError) {
      console.error('Erro ao inserir log:', logError)
      throw logError
    }

    // Atualizar data_ultimo_contato se for contato de vendedor
    if (tipo === 'vendedor') {
      // Primeiro, buscar o arquiteto para ver se já tem primeiro contato
      const { data: architect } = await supabaseClient
        .from('architects')
        .select('data_primeiro_contato')
        .eq('id', architect_id)
        .single()

      const now = new Date().toISOString()
      const updateData: any = { 
        data_ultimo_contato: now
      }

      // Se não tem primeiro contato, registrar
      if (architect && !architect.data_primeiro_contato) {
        updateData.data_primeiro_contato = now
      }

      const { error: updateError } = await supabaseClient
        .from('architects')
        .update(updateData)
        .eq('id', architect_id)

      if (updateError) {
        console.error('Erro ao atualizar data de contato:', updateError)
      }
    }

    console.log('Log registrado com sucesso:', log)

    return new Response(
      JSON.stringify({ 
        success: true, 
        log 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Erro na function:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro ao registrar log'
    return new Response(
      JSON.stringify({ 
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
