import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EvolutionAPIRequest {
  action: 'create' | 'status' | 'qrcode' | 'disconnect' | 'delete'
  instanceName?: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🔔 Evolution API request received')

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
      throw new Error('Evolution API não está configurada')
    }

    const body: EvolutionAPIRequest = await req.json()
    console.log('📋 Request:', body)

    const { action, instanceName } = body

    // GET status de todas as instâncias
    if (action === 'status') {
      const response = await fetch(`${evolutionUrl}/instance/fetchInstances`, {
        method: 'GET',
        headers: {
          'apikey': evolutionApiKey,
          'Content-Type': 'application/json'
        }
      })

      const instances = await response.json()
      console.log('📱 Instances:', instances)

      return new Response(
        JSON.stringify({ success: true, instances }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!instanceName) {
      throw new Error('instanceName é obrigatório')
    }

    // CREATE nova instância
    if (action === 'create') {
      console.log('🆕 Creating instance:', instanceName)
      
      // Verificar se já existe no banco
      const { data: existing } = await supabase
        .from('tendenci_whatsapp_connections')
        .select('*')
        .eq('instance_name', instanceName)
        .single()

      if (existing) {
        console.error('❌ Instance already exists:', instanceName)
        throw new Error('Instância já existe. Use outro nome ou delete a existente.')
      }

      // PASSO 1: Criar instância na Evolution API
      console.log('📡 Calling Evolution API to create instance...')
      const createResponse = await fetch(`${evolutionUrl}/instance/create`, {
        method: 'POST',
        headers: {
          'apikey': evolutionApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          instanceName,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS'
        })
      })

      if (!createResponse.ok) {
        const errorText = await createResponse.text()
        console.error('❌ Evolution API error:', errorText)
        throw new Error(`Evolution API falhou: ${errorText}`)
      }

      const instanceData = await createResponse.json()
      console.log('✅ Instance created in Evolution:', instanceData)

      // PASSO 2: Aguardar 3 segundos para Evolution processar
      console.log('⏳ Waiting 3 seconds for Evolution to initialize...')
      await new Promise(resolve => setTimeout(resolve, 3000))

      // PASSO 3: Conectar e gerar QR Code
      console.log('📱 Generating QR Code...')
      const connectResponse = await fetch(`${evolutionUrl}/instance/connect/${instanceName}`, {
        method: 'GET',
        headers: {
          'apikey': evolutionApiKey
        }
      })

      if (!connectResponse.ok) {
        const errorText = await connectResponse.text()
        console.error('❌ Failed to generate QR Code:', errorText)
        throw new Error(`Falha ao gerar QR Code: ${errorText}`)
      }

      const connectData = await connectResponse.json()
      console.log('✅ QR Code generated successfully')

      // PASSO 4: Configurar webhook CRÍTICO para receber atualizações
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const webhookUrl = `${supabaseUrl}/functions/v1/whatsapp-webhook`
      
      console.log('🔗 Configuring webhook:', webhookUrl)
      console.log('📝 Webhook payload:', JSON.stringify({
        url: webhookUrl,
        enabled: true,
        webhookByEvents: false,
        events: ['CONNECTION_UPDATE', 'QRCODE_UPDATED', 'MESSAGES_UPSERT']
      }, null, 2))
      
      try {
        const webhookResponse = await fetch(`${evolutionUrl}/webhook/set/${instanceName}`, {
          method: 'POST',
          headers: {
            'apikey': evolutionApiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            url: webhookUrl,
            enabled: true,
            webhookByEvents: false,
            events: [
              'CONNECTION_UPDATE',
              'QRCODE_UPDATED',
              'MESSAGES_UPSERT',
              'MESSAGES_UPDATE'
            ]
          })
        })

        const webhookResult = await webhookResponse.text()
        console.log('🔗 Webhook response status:', webhookResponse.status)
        console.log('🔗 Webhook response:', webhookResult)

        if (webhookResponse.ok) {
          console.log('✅ Webhook configured successfully')
        } else {
          console.error('⚠️ Webhook configuration failed but continuing:', webhookResult)
          // NÃO bloquear criação se webhook falhar - pode ser configurado depois
        }
      } catch (webhookError) {
        console.error('⚠️ Webhook error (non-blocking):', webhookError)
      }

      // PASSO 5: Salvar no banco de dados
      console.log('💾 Saving to database...')
      const { data: dbConnection, error: dbError } = await supabase
        .from('tendenci_whatsapp_connections')
        .insert({
          instance_name: instanceName,
          instance_id: instanceData.instance?.instanceId || instanceData.instance?.id || null,
          status: 'connecting',
          qr_code: connectData.base64 || connectData.qrcode?.base64 || null,
          qr_code_base64: connectData.base64 || connectData.qrcode?.base64 || null,
          created_by: null,
          metadata: instanceData
        })
        .select()
        .single()

      if (dbError) {
        console.error('❌ Database error:', dbError)
        throw new Error(`Erro no banco de dados: ${dbError.message}`)
      }

      console.log('✅ Instance saved to database:', dbConnection.id)

      return new Response(
        JSON.stringify({ 
          success: true, 
          connection: dbConnection,
          qrCode: connectData.base64 || connectData.qrcode?.base64
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // GET QR CODE de instância específica
    if (action === 'qrcode') {
      console.log('📱 Getting NEW QR Code for:', instanceName)
      
      try {
        // Primeiro desconectar se estiver preso
        console.log('🔄 Disconnecting stuck instance...')
        await fetch(`${evolutionUrl}/instance/logout/${instanceName}`, {
          method: 'DELETE',
          headers: {
            'apikey': evolutionApiKey
          }
        }).catch(e => console.log('Logout attempt (may fail if not connected):', e))

        // Aguardar 2 segundos
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Reconectar para gerar novo QR
        console.log('🔄 Reconnecting to generate fresh QR Code...')
        const response = await fetch(`${evolutionUrl}/instance/connect/${instanceName}`, {
          method: 'GET',
          headers: {
            'apikey': evolutionApiKey
          }
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error('❌ Failed to generate QR Code:', errorText)
          throw new Error(`Falha ao gerar QR Code: ${errorText}`)
        }

        const data = await response.json()
        console.log('✅ Fresh QR Code generated')

        // Atualizar QR code no banco
        const { error: updateError } = await supabase
          .from('tendenci_whatsapp_connections')
          .update({
            qr_code: data.base64 || data.qrcode?.base64 || null,
            qr_code_base64: data.base64 || data.qrcode?.base64 || null,
            status: 'connecting',
            last_sync: new Date().toISOString()
          })
          .eq('instance_name', instanceName)

        if (updateError) {
          console.error('❌ Database update error:', updateError)
          throw updateError
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            qrCode: data.base64 || data.qrcode?.base64,
            message: 'QR Code renovado com sucesso'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (error) {
        console.error('💥 Error in qrcode action:', error)
        throw error
      }
    }

    // DISCONNECT instância
    if (action === 'disconnect') {
      console.log('🔌 Disconnecting:', instanceName)
      
      const response = await fetch(`${evolutionUrl}/instance/logout/${instanceName}`, {
        method: 'DELETE',
        headers: {
          'apikey': evolutionApiKey
        }
      })

      // Atualizar status no banco
      await supabase
        .from('tendenci_whatsapp_connections')
        .update({
          status: 'disconnected',
          qr_code: null,
          qr_code_base64: null,
          phone_number: null
        })
        .eq('instance_name', instanceName)

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // DELETE instância
    if (action === 'delete') {
      console.log('🗑️ Deleting:', instanceName)
      
      // Verificar se existe no banco primeiro
      const { data: existingConnection, error: checkError } = await supabase
        .from('tendenci_whatsapp_connections')
        .select('*')
        .eq('instance_name', instanceName)
        .maybeSingle()

      const existsInDatabase = !!existingConnection
      console.log(`📊 Exists in database: ${existsInDatabase}`)
      
      // Tentar deletar da Evolution API (sempre, mesmo se não existir)
      let evolutionSuccess = false
      try {
        console.log('🔥 Attempting to delete from Evolution API...')
        const evolutionResponse = await fetch(`${evolutionUrl}/instance/delete/${instanceName}`, {
          method: 'DELETE',
          headers: {
            'apikey': evolutionApiKey
          }
        })
        
        if (evolutionResponse.ok) {
          evolutionSuccess = true
          console.log('✅ Deleted from Evolution API successfully')
        } else {
          const errorText = await evolutionResponse.text()
          console.log('⚠️ Evolution API response:', evolutionResponse.status, errorText)
          
          // Se retornou 404 ou mensagem de "not found", considerar sucesso
          if (evolutionResponse.status === 404 || errorText.toLowerCase().includes('not found') || errorText.toLowerCase().includes('instance not exists')) {
            evolutionSuccess = true
            console.log('✅ Instance not found in Evolution API (already deleted or never existed)')
          } else {
            console.warn('⚠️ Evolution API delete failed but continuing...', errorText)
            evolutionSuccess = true // Continuar mesmo assim para limpar o banco
          }
        }
      } catch (evolutionError) {
        console.warn('⚠️ Evolution API error (continuing):', evolutionError)
        evolutionSuccess = true // Continuar para limpar o banco
      }

      // Deletar do banco se existir
      if (existsInDatabase) {
        console.log('🗑️ Deleting from database...')
        const { error: deleteError } = await supabase
          .from('tendenci_whatsapp_connections')
          .delete()
          .eq('instance_name', instanceName)
        
        if (deleteError) {
          console.error('❌ Database delete error:', deleteError)
          throw new Error('Erro ao deletar do banco de dados')
        }
        console.log('✅ Deleted from database')
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          message: existsInDatabase 
            ? 'Instância removida com sucesso' 
            : 'Instância removida (não estava no sistema)'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error('Ação inválida')

  } catch (error) {
    console.error('💥 Error:', error)
    
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
