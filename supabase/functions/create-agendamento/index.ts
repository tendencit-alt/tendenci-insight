import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AgendamentoRequest {
  architect_id: string
  architect_name?: string
  architect_phone?: string
  client_id?: string
  client_name?: string
  client_phone?: string
  campanha_id?: string
  data_agendamento: string // ISO 8601 format: "2024-01-15T14:30:00"
  canal: 'whatsapp' | 'telefone' | 'presencial' | 'videochamada'
  observacoes?: string
  metadata?: Record<string, any>
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🔔 Webhook received from n8n for agendamento creation')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Parse request body
    const body: AgendamentoRequest = await req.json()
    console.log('📋 Request body:', JSON.stringify(body, null, 2))

    // Validações
    if (!body.architect_id) {
      throw new Error('architect_id é obrigatório')
    }

    if (!body.data_agendamento) {
      throw new Error('data_agendamento é obrigatório')
    }

    // Verificar se arquiteto existe
    const { data: architect, error: architectError } = await supabase
      .from('architects')
      .select('id, name, vendedor_responsavel')
      .eq('id', body.architect_id)
      .single()

    if (architectError || !architect) {
      console.error('❌ Arquiteto não encontrado:', body.architect_id)
      throw new Error('Arquiteto não encontrado')
    }

    console.log('✅ Arquiteto encontrado:', architect.name)

    // Se tiver client_name mas não client_id, criar cliente
    let clientId = body.client_id
    if (body.client_name && !clientId) {
      console.log('📝 Criando novo cliente:', body.client_name)
      
      const { data: newClient, error: clientError } = await supabase
        .from('clients')
        .insert({
          name: body.client_name,
          phone: body.client_phone || null,
        })
        .select()
        .single()

      if (clientError) {
        console.error('❌ Erro ao criar cliente:', clientError)
      } else {
        clientId = newClient.id
        console.log('✅ Cliente criado com ID:', clientId)
      }
    }

    // Determinar vendedor_id (prioridade: vendedor_responsavel do arquiteto ou primeiro admin)
    let vendedorId = architect.vendedor_responsavel

    if (!vendedorId) {
      const { data: firstAdmin } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .limit(1)
        .single()

      vendedorId = firstAdmin?.id || null
    }

    // Criar agendamento
    const agendamentoData = {
      architect_id: body.architect_id,
      vendedor_id: vendedorId,
      client_id: clientId || null,
      campanha_id: body.campanha_id || null,
      data_agendamento: body.data_agendamento,
      canal: body.canal || 'whatsapp',
      observacoes: body.observacoes || null,
      status: 'agendado',
      criado_por_ia: true,
      metadata: body.metadata || {},
    }

    console.log('💾 Criando agendamento:', JSON.stringify(agendamentoData, null, 2))

    const { data: agendamento, error: agendamentoError } = await supabase
      .from('tendenci_prospec_arq_agendamentos')
      .insert(agendamentoData)
      .select()
      .single()

    if (agendamentoError) {
      console.error('❌ Erro ao criar agendamento:', agendamentoError)
      throw agendamentoError
    }

    console.log('✅ Agendamento criado com sucesso! ID:', agendamento.id)

    // Criar log de prospecção
    await supabase
      .from('tendenci_prospec_arq_logs')
      .insert({
        architect_id: body.architect_id,
        campanha_id: body.campanha_id || null,
        tipo: 'agendamento_criado',
        canal: body.canal,
        mensagem: `Agendamento criado via n8n para ${body.data_agendamento}`,
        metadata: {
          agendamento_id: agendamento.id,
          criado_por: 'n8n',
          ...body.metadata,
        },
      })

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Agendamento criado com sucesso',
        agendamento: {
          id: agendamento.id,
          architect_name: architect.name,
          data_agendamento: agendamento.data_agendamento,
          canal: agendamento.canal,
          status: agendamento.status,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('💥 Erro ao processar webhook:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
