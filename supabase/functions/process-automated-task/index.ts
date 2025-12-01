import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProcessTaskRequest {
  taskId: string
}

// Função para formatar número de telefone brasileiro
function formatBrazilianPhone(phone: string): { formatted: string | null; error?: string; original: string } {
  const original = phone
  let clean = phone.replace(/\D/g, '')
  
  console.log(`📱 Formatando número - Original: "${original}" → Limpo: "${clean}"`)
  
  while (clean.startsWith('55') && clean.length > 11) {
    clean = clean.substring(2)
    console.log(`🔄 Removendo 55 duplicado: "${clean}"`)
  }
  
  if (clean.length < 10) {
    return { 
      formatted: null, 
      error: `Número muito curto - falta DDD (${clean.length} dígitos)`,
      original 
    }
  }
  
  if (clean.length === 10) {
    clean = clean.slice(0, 2) + '9' + clean.slice(2)
    console.log(`✨ Adicionado 9° dígito (10→11): "${clean}"`)
  }
  
  if (clean.length === 12 && clean.startsWith('55')) {
    clean = clean.slice(0, 4) + '9' + clean.slice(4)
    console.log(`✨ Adicionado 9° dígito (12→13): "${clean}"`)
  }
  
  if (!clean.startsWith('55')) {
    clean = '55' + clean
    console.log(`🌍 Adicionado código do país: "${clean}"`)
  }
  
  if (clean.length !== 13) {
    return { 
      formatted: null, 
      error: `Número com tamanho inválido: ${clean.length} dígitos (esperado 13)`,
      original 
    }
  }
  
  const formatted = `${clean}@s.whatsapp.net`
  console.log(`✅ Número formatado: "${formatted}"`)
  
  return { formatted, original }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🤖 Process automated task request')

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

    const evolutionUrl = Deno.env.get('EVOLUTION_API_URL')
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY')

    if (!evolutionUrl || !evolutionApiKey) {
      throw new Error('Evolution API não configurada')
    }

    const body: ProcessTaskRequest = await req.json()
    const { taskId } = body

    if (!taskId) {
      throw new Error('taskId é obrigatório')
    }

    console.log(`📋 Processando tarefa: ${taskId}`)

    // 1️⃣ Buscar tarefa
    const { data: task, error: taskError } = await supabase
      .from('crm_tasks')
      .select('*')
      .eq('id', taskId)
      .single()

    if (taskError || !task) {
      throw new Error('Tarefa não encontrada')
    }

    // Verificar se já foi processada
    if (task.status !== 'open') {
      console.log(`⏭️ Tarefa já processada (status: ${task.status})`)
      return new Response(
        JSON.stringify({ success: false, message: 'Tarefa já foi processada' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    console.log(`✅ Tarefa encontrada - tipo: ${task.tipo_tarefa}, status: ${task.status}`)

    // 2️⃣ Marcar como 'processing' imediatamente (proteção contra race condition)
    const { error: processingError } = await supabase
      .from('crm_tasks')
      .update({ status: 'processing' })
      .eq('id', taskId)

    if (processingError) {
      console.error('❌ Erro ao marcar como processing:', processingError)
      throw new Error('Erro ao marcar tarefa como processando')
    }

    console.log('🔄 Tarefa marcada como "processing"')

    // 3️⃣ Buscar dados do deal (cliente e telefone)
    const { data: deal, error: dealError } = await supabase
      .from('crm_deals')
      .select(`
        *,
        lead:leads(
          id,
          client:clients(
            id,
            name,
            phone
          )
        )
      `)
      .eq('id', task.deal_id)
      .single()

    if (dealError || !deal) {
      console.error('❌ Deal não encontrado:', dealError)
      await supabase.from('crm_tasks').update({ status: 'open' }).eq('id', taskId)
      throw new Error('Deal não encontrado')
    }

    const clientPhone = deal.lead?.client?.phone
    const clientName = deal.lead?.client?.name || 'Cliente'

    if (!clientPhone) {
      console.error('❌ Telefone do cliente não encontrado')
      await supabase.from('crm_tasks').update({ status: 'open' }).eq('id', taskId)
      throw new Error('Telefone do cliente não encontrado')
    }

    console.log(`📞 Cliente: ${clientName}, Telefone: ${clientPhone}`)

    // 4️⃣ Buscar instância WhatsApp do vendedor (via created_by)
    const { data: connection, error: connectionError } = await supabase
      .from('tendenci_whatsapp_connections')
      .select('instance_name, instance_id, status')
      .eq('user_id', task.created_by)
      .eq('status', 'connected')
      .single()

    if (connectionError || !connection) {
      console.error('❌ Instância WhatsApp não encontrada para o vendedor:', connectionError)
      await supabase.from('crm_tasks').update({ status: 'open' }).eq('id', taskId)
      throw new Error('Vendedor não possui instância WhatsApp conectada')
    }

    console.log(`📱 Instância WhatsApp: ${connection.instance_name}`)

    // 5️⃣ Formatar número de telefone
    const phoneResult = formatBrazilianPhone(clientPhone)
    
    if (!phoneResult.formatted) {
      console.error(`❌ Número inválido:`, phoneResult.error)
      await supabase.from('crm_tasks').update({ status: 'open' }).eq('id', taskId)
      throw new Error(`Número inválido: ${phoneResult.error}`)
    }

    const formattedNumber = phoneResult.formatted

    // 6️⃣ Enviar mensagem via Evolution API
    const message = task.note || task.title
    console.log(`📤 Enviando mensagem para ${formattedNumber}`)

    const sendResponse = await fetch(`${evolutionUrl}/message/sendText/${connection.instance_name}`, {
      method: 'POST',
      headers: {
        'apikey': evolutionApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        number: formattedNumber,
        text: message,
        delay: 1000
      })
    })

    if (!sendResponse.ok) {
      const errorText = await sendResponse.text()
      console.error('❌ Erro ao enviar mensagem:', errorText)
      
      // Voltar para 'open' para tentar novamente
      await supabase.from('crm_tasks').update({ status: 'open' }).eq('id', taskId)
      throw new Error('Erro ao enviar mensagem via Evolution API')
    }

    const responseData = await sendResponse.json()
    console.log('✅ Mensagem enviada com sucesso:', responseData)

    // 7️⃣ Marcar tarefa como 'done' e registrar processed_at
    const { error: doneError } = await supabase
      .from('crm_tasks')
      .update({ 
        status: 'done',
        processed_at: new Date().toISOString()
      })
      .eq('id', taskId)

    if (doneError) {
      console.error('❌ Erro ao marcar como done:', doneError)
    } else {
      console.log('✅ Tarefa marcada como "done"')
    }

    // 8️⃣ Registrar log na timeline do deal
    await supabase
      .from('crm_timeline')
      .insert({
        deal_id: task.deal_id,
        author_id: task.created_by,
        message: `📤 Mensagem automatizada enviada: "${message}"`,
        update_type: 'Sistema'
      })

    console.log('✅ Log registrado na timeline')

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Tarefa processada e mensagem enviada com sucesso',
        taskId,
        messageId: responseData.key?.id || null
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('💥 Erro ao processar tarefa:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})