import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EvolutionAPIRequest {
  action: 'create' | 'status' | 'qrcode' | 'disconnect' | 'delete' | 'check-webhook' | 'reconfigure-webhook'
  instanceName?: string
}

Deno.serve(async (req) => {
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

    // ========== GET STATUS ==========
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

    // ========== ✅ FASE 3: CHECK WEBHOOK ==========
    if (action === 'check-webhook') {
      if (!instanceName) {
        throw new Error('instanceName é obrigatório para check-webhook')
      }

      console.log('🔍 Checking webhook config for:', instanceName)
      
      try {
        const response = await fetch(`${evolutionUrl}/webhook/find/${instanceName}`, {
          method: 'GET',
          headers: { 'apikey': evolutionApiKey }
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error('❌ Failed to fetch webhook:', errorText)
          throw new Error(`Failed to fetch webhook: ${errorText}`)
        }

        const webhookConfig = await response.json()
        console.log('📡 Current webhook config:', JSON.stringify(webhookConfig, null, 2))

        return new Response(
          JSON.stringify({ 
            success: true, 
            webhook: webhookConfig,
            instance: instanceName
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (error) {
        console.error('💥 Check webhook error:', error)
        throw error
      }
    }

    if (!instanceName) {
      throw new Error('instanceName é obrigatório')
    }

    // ========== CREATE ==========
    if (action === 'create') {
      console.log('🆕 Creating instance:', instanceName)
      
      // Obter usuário autenticado
      const authHeader = req.headers.get('Authorization')
      let currentUserId: string | null = null
      
      if (authHeader) {
        const { data: { user }, error: authError } = await supabase.auth.getUser(
          authHeader.replace('Bearer ', '')
        )
        if (!authError && user) {
          currentUserId = user.id
          console.log('✅ User authenticated:', currentUserId)
        }
      }
      
      // PASSO 1: Verificar se já existe NA EVOLUTION API
      console.log('🔍 Verificando se instância existe na Evolution API...')
      const checkResponse = await fetch(`${evolutionUrl}/instance/fetchInstances`, {
        method: 'GET',
        headers: {
          'apikey': evolutionApiKey
        }
      })
      
      if (checkResponse.ok) {
        const allInstances = await checkResponse.json()
        const existsInEvolution = allInstances.some((i: any) => i.name === instanceName)
        
        if (existsInEvolution) {
          console.error('❌ Instance already exists in Evolution API:', instanceName)
          throw new Error(`Instância "${instanceName}" já existe na Evolution API. Use outro nome ou delete a existente primeiro.`)
        }
        console.log('✅ Instance name is available in Evolution API')
      }
      
      // PASSO 2: Verificar se existe no banco
      const { data: existingDb } = await supabase
        .from('tendenci_whatsapp_connections')
        .select('*')
        .eq('instance_name', instanceName)
        .maybeSingle()

      if (existingDb) {
        console.error('❌ Instance exists in database:', instanceName)
        throw new Error(`Instância "${instanceName}" já existe no banco de dados. Use outro nome.`)
      }
      console.log('✅ Instance name is available in database')

      // PASSO 3: Criar instância na Evolution API
      console.log('📡 Creating instance in Evolution API...')
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

      // PASSO 4: Aguardar processamento
      console.log('⏳ Waiting 2 seconds for Evolution to initialize...')
      await new Promise(resolve => setTimeout(resolve, 2000))

      // PASSO 5: Gerar QR Code
      console.log('📱 Generating QR Code...')
      const connectResponse = await fetch(`${evolutionUrl}/instance/connect/${instanceName}`, {
        method: 'GET',
        headers: {
          'apikey': evolutionApiKey
        }
      })

      let qrCodeBase64 = null
      if (connectResponse.ok) {
        const connectData = await connectResponse.json()
        qrCodeBase64 = connectData.base64 || connectData.qrcode?.base64 || null
        console.log('✅ QR Code generated:', qrCodeBase64 ? 'Yes' : 'No')
      } else {
        console.warn('⚠️ QR Code generation failed (will retry later)')
      }

      // PASSO 6: Configurar webhook COM RETRY
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const webhookUrl = `${supabaseUrl}/functions/v1/whatsapp-webhook`
      
      console.log('🔗 Configuring webhook with retry...')
      
      const configureWebhook = async (retries = 3): Promise<boolean> => {
        for (let i = 0; i < retries; i++) {
          try {
            const res = await fetch(`${evolutionUrl}/webhook/set/${instanceName}`, {
              method: 'POST',
              headers: {
                'apikey': evolutionApiKey,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                url: webhookUrl,
                enabled: true,
                webhookByEvents: false,
                events: ['CONNECTION_UPDATE', 'QRCODE_UPDATED', 'MESSAGES_UPSERT', 'MESSAGES_UPDATE']
              })
            })

            if (res.ok) {
              console.log(`✅ Webhook configured successfully (attempt ${i + 1})`)
              return true
            } else {
              const error = await res.text()
              console.warn(`⚠️ Webhook config failed (attempt ${i + 1}):`, error)
            }
          } catch (err) {
            console.warn(`⚠️ Webhook config error (attempt ${i + 1}):`, err)
          }

          if (i < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000))
          }
        }
        return false
      }

      const webhookConfigured = await configureWebhook()

      // PASSO 7: Salvar no banco com created_by
      console.log('💾 Saving to database...')
      const { data: dbConnection, error: dbError } = await supabase
        .from('tendenci_whatsapp_connections')
        .insert({
          instance_name: instanceName,
          instance_id: instanceData.instance?.instanceId || instanceData.instance?.id || null,
          status: 'connecting',
          qr_code: qrCodeBase64,
          qr_code_base64: qrCodeBase64,
          created_by: currentUserId, // ✅ AUTO-FILL created_by
          webhook_configured: webhookConfigured,
          webhook_url: webhookUrl,
          metadata: instanceData
        })
        .select()
        .single()

      if (dbError) {
        console.error('❌ Database error:', dbError)
        throw new Error(`Erro no banco: ${dbError.message}`)
      }

      console.log('✅ SUCCESS! Instance created:', dbConnection.id)

      return new Response(
        JSON.stringify({ 
          success: true, 
          connection: dbConnection,
          qrCode: qrCodeBase64
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ========== QRCODE ==========
    if (action === 'qrcode') {
      console.log('📱 Getting QR Code for:', instanceName)
      
      try {
        // Desconectar primeiro
        console.log('🔄 Disconnecting...')
        await fetch(`${evolutionUrl}/instance/logout/${instanceName}`, {
          method: 'DELETE',
          headers: { 'apikey': evolutionApiKey }
        }).catch(() => {})

        await new Promise(resolve => setTimeout(resolve, 1000))

        // Reconectar
        console.log('🔄 Reconnecting...')
        const response = await fetch(`${evolutionUrl}/instance/connect/${instanceName}`, {
          method: 'GET',
          headers: { 'apikey': evolutionApiKey }
        })

        if (!response.ok) {
          throw new Error('Failed to generate QR Code')
        }

        const data = await response.json()
        const qrCode = data.base64 || data.qrcode?.base64

        // ✅ RECONFIGURAR webhook após reconexão
        console.log('🔗 Reconfiguring webhook after reconnect...')
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const webhookUrl = `${supabaseUrl}/functions/v1/whatsapp-webhook`

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
            events: ['CONNECTION_UPDATE', 'QRCODE_UPDATED', 'MESSAGES_UPSERT', 'MESSAGES_UPDATE']
          })
        })

        const webhookConfigured = webhookResponse.ok
        if (!webhookConfigured) {
          console.warn('⚠️ Webhook reconfig failed (non-critical)')
        } else {
          console.log('✅ Webhook reconfigured successfully')
        }

        // Atualizar banco
        await supabase
          .from('tendenci_whatsapp_connections')
          .update({
            qr_code: qrCode,
            qr_code_base64: qrCode,
            status: 'connecting',
            last_sync: new Date().toISOString(),
            webhook_configured: webhookConfigured
          })
          .eq('instance_name', instanceName)

        return new Response(
          JSON.stringify({ success: true, qrCode, webhookConfigured }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (error) {
        console.error('💥 QR Code error:', error)
        throw error
      }
    }

    // ========== DISCONNECT ==========
    if (action === 'disconnect') {
      console.log('🔌 Disconnecting:', instanceName)
      
      await fetch(`${evolutionUrl}/instance/logout/${instanceName}`, {
        method: 'DELETE',
        headers: { 'apikey': evolutionApiKey }
      })

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

    // ========== CHECK WEBHOOK ==========
    if (action === 'check-webhook') {
      console.log('🔍 Checking webhook for:', instanceName)
      
      const response = await fetch(`${evolutionUrl}/webhook/find/${instanceName}`, {
        method: 'GET',
        headers: { 'apikey': evolutionApiKey }
      })
      
      const webhookConfig = await response.json()
      console.log('📡 Current webhook config:', webhookConfig)
      
      return new Response(
        JSON.stringify({ success: true, webhook: webhookConfig }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ========== RECONFIGURE WEBHOOK ==========
    if (action === 'reconfigure-webhook') {
      console.log('🔧 Reconfiguring webhook for:', instanceName)
      
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const webhookUrl = `${supabaseUrl}/functions/v1/whatsapp-webhook`
      
      try {
        // Configurar webhook na Evolution API
        const webhookResponse = await fetch(`${evolutionUrl}/webhook/set/${instanceName}`, {
          method: 'POST',
          headers: {
            'apikey': evolutionApiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            url: webhookUrl,
            enabled: true,
            webhookByEvents: false, // ✅ Receber TODOS os eventos
            events: [
              'CONNECTION_UPDATE',
              'QRCODE_UPDATED',
              'MESSAGES_UPSERT',
              'MESSAGES_UPDATE'
            ]
          })
        })

        if (!webhookResponse.ok) {
          const errorText = await webhookResponse.text()
          console.error('❌ Webhook config failed:', errorText)
          throw new Error(`Webhook config failed: ${errorText}`)
        }

        console.log('✅ Webhook configured successfully')

        // Atualizar banco de dados
        const { error: dbError } = await supabase
          .from('tendenci_whatsapp_connections')
          .update({
            webhook_configured: true,
            webhook_url: webhookUrl,
            last_sync: new Date().toISOString()
          })
          .eq('instance_name', instanceName)

        if (dbError) {
          console.warn('⚠️ Database update warning:', dbError)
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Webhook reconfigurado com sucesso',
            webhookUrl 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (error) {
        console.error('💥 Reconfigure webhook error:', error)
        throw error
      }
    }

    // ========== DELETE ==========
    if (action === 'delete') {
      console.log('🗑️ Deleting:', instanceName)
      
      let deletedFromEvolution = false
      let deletedFromDatabase = false
      
      // PASSO 1: Deletar da Evolution API (SEMPRE tentar primeiro)
      try {
        console.log('🔥 Attempting to delete from Evolution API...')
        const evolutionResponse = await fetch(`${evolutionUrl}/instance/delete/${instanceName}`, {
          method: 'DELETE',
          headers: { 'apikey': evolutionApiKey }
        })
        
        if (evolutionResponse.ok) {
          deletedFromEvolution = true
          console.log('✅ Deleted from Evolution API')
        } else {
          const errorText = await evolutionResponse.text()
          console.log(`⚠️ Evolution API response (${evolutionResponse.status}):`, errorText)
          
          // Se retornou 404 ou "not found", considerar como sucesso (já estava deletado)
          if (evolutionResponse.status === 404 || errorText.toLowerCase().includes('not found')) {
            deletedFromEvolution = true
            console.log('✅ Instance not found in Evolution (already deleted or never existed)')
          }
        }
      } catch (error) {
        console.warn('⚠️ Evolution API error (continuing):', error)
        // Continuar mesmo com erro - tentar deletar do banco
      }

      // PASSO 2: Deletar do banco Lovable
      try {
        console.log('🗑️ Attempting to delete from database...')
        const { error: deleteError } = await supabase
          .from('tendenci_whatsapp_connections')
          .delete()
          .eq('instance_name', instanceName)
        
        if (deleteError) {
          console.warn('⚠️ Database delete error:', deleteError)
        } else {
          deletedFromDatabase = true
          console.log('✅ Deleted from database')
        }
      } catch (error) {
        console.warn('⚠️ Database error:', error)
      }

      // Mensagem de sucesso baseada no que foi deletado
      let message = 'Instância removida com sucesso'
      if (deletedFromEvolution && deletedFromDatabase) {
        message = 'Instância removida completamente (Evolution + Sistema)'
      } else if (deletedFromEvolution && !deletedFromDatabase) {
        message = 'Instância removida da Evolution API (não estava no sistema)'
      } else if (!deletedFromEvolution && deletedFromDatabase) {
        message = 'Instância removida do sistema (não estava na Evolution API)'
      } else {
        message = 'Instância não encontrada em nenhum lugar (já foi removida)'
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          message,
          deleted_from_evolution: deletedFromEvolution,
          deleted_from_database: deletedFromDatabase
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
