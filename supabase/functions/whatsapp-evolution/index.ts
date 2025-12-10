import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

interface EvolutionRequest {
  action: 'check-status' | 'create' | 'create-ia' | 'qrcode' | 'delete' | 'disconnect' | 'list-all' | 'delete-orphans'
  instanceName?: string
  instanceNames?: string[] // Para delete-orphans
  user_id?: string
  webhookUrl?: string // Para create-ia customizado
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const evolutionUrlRaw = Deno.env.get('EVOLUTION_API_URL')
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY')

    if (!evolutionUrlRaw || !evolutionApiKey) {
      throw new Error('Evolution API credentials not configured')
    }

    // Normalizar URL da Evolution API (remover barra final) - APLICAR EM TODAS AS ACTIONS
    const evolutionUrl = evolutionUrlRaw.replace(/\/$/, '')

    // Parsear body UMA ÚNICA VEZ e reutilizar (evita erro "Body is unusable")
    const body: EvolutionRequest = await req.json()
    const { action, instanceName, user_id: requestUserId } = body
    console.log(`🔧 Action: ${action} | Instance: ${instanceName} | User: ${requestUserId || 'not provided'}`)
    console.log(`🔧 Evolution URL (normalized): ${evolutionUrl}`)

    // ========== CHECK STATUS ==========
    if (action === 'check-status') {
      console.log('📊 Checking status for:', instanceName)
      
      const statusResp = await fetch(`${evolutionUrl}/instance/fetchInstances?instanceName=${instanceName}`, {
        headers: { 'apikey': evolutionApiKey }
      })

      // Se 404, instância não existe mais na API
      if (statusResp.status === 404) {
        console.log('⚠️ Instance not found in Evolution API (404) - cleaning database')
        
        await supabase
          .from('tendenci_whatsapp_connections')
          .delete()
          .eq('instance_name', instanceName)
        
        return new Response(
          JSON.stringify({ 
            status: 'deleted', 
            message: 'Instance not found in API' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!statusResp.ok) {
        const errorText = await statusResp.text()
        console.error('❌ Evolution API error:', statusResp.status, errorText)
        throw new Error(`Evolution API status check failed: ${statusResp.status}`)
      }

      const statusDataRaw = await statusResp.json()
      const statusData = Array.isArray(statusDataRaw) ? statusDataRaw[0] : statusDataRaw

      console.log('🔍 connectionStatus:', statusData?.connectionStatus)
      
      const isConnected = statusData?.connectionStatus === 'open'
      console.log('✅ CONNECTED:', isConnected)

      // Extrair número de telefone do ownerJid
      const phoneNumber = statusData.ownerJid 
        ? statusData.ownerJid.split('@')[0]
        : null

      console.log('📊 Phone number:', phoneNumber)

      const mappedStatus = isConnected ? 'connected' : 'connecting'
      console.log('📊 Final mapped status:', mappedStatus)

      // Buscar conexão atual no banco
      const { data: currentConn } = await supabase
        .from('tendenci_whatsapp_connections')
        .select('status, phone_number, connected_at')
        .eq('instance_name', instanceName)
        .single()

      console.log('📊 Current DB status:', currentConn?.status)

      // Atualizar no banco se status mudou OU se detectou telefone
      if (currentConn && (currentConn.status !== mappedStatus || (isConnected && phoneNumber && !currentConn.phone_number))) {
        console.log(`🔄 Updating: ${currentConn.status} → ${mappedStatus}`)
        
        const updateData: any = { 
          status: mappedStatus,
          last_sync: new Date().toISOString()
        }
        
        if (mappedStatus === 'connected' && phoneNumber) {
          updateData.phone_number = phoneNumber
          updateData.connected_at = currentConn.connected_at || new Date().toISOString()
          updateData.qr_code = null
          updateData.qr_code_base64 = null
        }

        console.log('📊 Update data:', JSON.stringify(updateData, null, 2))

        const { error: updateError } = await supabase
          .from('tendenci_whatsapp_connections')
          .update(updateData)
          .eq('instance_name', instanceName)

        if (updateError) {
          console.error('❌ Error updating status:', updateError)
        } else {
          console.log('✅ Status updated in database successfully')
        }
      } else {
        console.log('ℹ️ No update needed - status unchanged')
      }

      return new Response(
        JSON.stringify({ 
          status: mappedStatus, 
          phoneNumber,
          isConnected
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ========== CREATE INSTANCE (REFATORADO) ==========
    if (action === 'create') {
      console.log('🆕 Creating instance:', instanceName)
      
      // 1️⃣ Deletar instância existente na Evolution API (se existir)
      try {
        const deleteResp = await fetch(`${evolutionUrl}/instance/delete/${instanceName}`, {
          method: 'DELETE',
          headers: { 'apikey': evolutionApiKey }
        })
        if (deleteResp.ok) {
          console.log('🗑️ Deleted existing instance from Evolution API')
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      } catch (err) {
        console.log('ℹ️ No existing instance to delete')
      }
      
      // 2️⃣ Deletar registro do banco (se existir)
      await supabase
        .from('tendenci_whatsapp_connections')
        .delete()
        .eq('instance_name', instanceName)
      console.log('🗑️ Cleaned database')
      
      // 3️⃣ Criar nova instância na Evolution API
      const createResp = await fetch(`${evolutionUrl}/instance/create`, {
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
      
      if (!createResp.ok) {
        const errorText = await createResp.text()
        console.error('❌ Evolution API error:', errorText)
        throw new Error(`Evolution API failed: ${createResp.status} - ${errorText}`)
      }
      
      const createData = await createResp.json()
      console.log('✅ Instance created:', JSON.stringify(createData, null, 2))
      
      // 4️⃣ Extrair instance_id de forma robusta
      const instanceId = 
        createData?.instance?.instanceId || 
        createData?.instanceId || 
        createData?.instance?.instanceName ||
        instanceName // fallback para instance_name
      
      console.log('📝 Instance ID:', instanceId)
      
      // 5️⃣ Aguardar e obter QR Code
      await new Promise(resolve => setTimeout(resolve, 3000)) // 3 segundos
      
      let qrCodeBase64 = null
      try {
        const connectResp = await fetch(`${evolutionUrl}/instance/connect/${instanceName}`, {
          method: 'GET',
          headers: { 'apikey': evolutionApiKey }
        })
        
        if (connectResp.ok) {
          const connectData = await connectResp.json()
          qrCodeBase64 = 
            connectData?.base64 || 
            connectData?.qrcode?.base64 || 
            connectData?.qrcode?.code ||
            null
          
          console.log('📱 QR Code obtained:', qrCodeBase64 ? 'YES ✅' : 'NO ❌')
          if (qrCodeBase64) {
            console.log('📱 QR Code length:', qrCodeBase64.length)
          }
        } else {
          console.warn('⚠️ Connect endpoint failed:', connectResp.status)
        }
      } catch (err) {
        console.error('❌ Error getting QR code:', err)
      }
      
      // 6️⃣ Configurar webhook
      const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-webhook`
      try {
        const webhookResp = await fetch(`${evolutionUrl}/webhook/set/${instanceName}`, {
          method: 'POST',
          headers: {
            'apikey': evolutionApiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            webhook: {
              url: webhookUrl,
              enabled: true,
              webhookByEvents: false,
              events: ['CONNECTION_UPDATE', 'QRCODE_UPDATED', 'MESSAGES_UPSERT']
            }
          })
        })
        
        if (webhookResp.ok) {
          console.log('✅ Webhook configured:', webhookUrl)
        } else {
          console.warn('⚠️ Webhook config failed:', webhookResp.status)
        }
      } catch (err) {
        console.error('❌ Webhook error:', err)
      }
      
      // 7️⃣ Usar user_id já extraído do body no início (evita "Body is unusable")
      const userId = requestUserId || null
      
      // INSERIR no banco (com todos os campos necessários)
      const insertData = {
        instance_name: instanceName,
        instance_id: instanceId,
        status: 'connecting',
        qr_code: qrCodeBase64,
        qr_code_base64: qrCodeBase64,
        phone_number: null,
        connected_at: null,
        created_by: null,
        user_id: userId, // ✅ Salvar user_id do vendedor que está criando
        webhook_configured: true,
        webhook_url: webhookUrl
      }
      
      console.log('💾 Inserting into database:', JSON.stringify(insertData, null, 2))
      
      const { data: insertedData, error: insertError } = await supabase
        .from('tendenci_whatsapp_connections')
        .insert(insertData)
        .select()
        .single()
      
      if (insertError) {
        console.error('❌ DATABASE INSERT ERROR:', insertError)
        throw new Error(`Database insert failed: ${insertError.message}`)
      }
      
      console.log('✅ Database insert SUCCESS:', insertedData)
      
      // 8️⃣ Retornar resposta com TUDO
      return new Response(
        JSON.stringify({
          success: true,
          instanceId,
          instanceName,
          qrCode: qrCodeBase64,
          databaseId: insertedData.id,
          status: 'connecting'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ========== CREATE-IA (Instância da IA com webhook n8n) ==========
    if (action === 'create-ia') {
      const iaInstanceName = instanceName || 'IA-Atendimento'
      const n8nWebhookUrl = body.webhookUrl || 'https://n8n.agendacorretor.online/webhook/receber-mensagens'
      
      console.log('🤖 ========== CREATING IA INSTANCE ==========')
      console.log('🔧 DIAGNOSTIC INFO:')
      console.log('- Evolution URL:', evolutionUrl)
      console.log('- Instance Name:', iaInstanceName)
      console.log('- Webhook URL:', n8nWebhookUrl)
      console.log('- API Key valid:', evolutionApiKey ? 'YES' : 'NO')
      console.log('- API Key length:', evolutionApiKey?.length || 0)
      
      // 1️⃣ Deletar instância existente na Evolution API (se existir)
      console.log('1️⃣ Checking for existing instance to delete...')
      try {
        const deleteResp = await fetch(`${evolutionUrl}/instance/delete/${iaInstanceName}`, {
          method: 'DELETE',
          headers: { 'apikey': evolutionApiKey }
        })
        console.log('🗑️ Delete response status:', deleteResp.status)
        if (deleteResp.ok) {
          console.log('🗑️ ✅ Deleted existing IA instance from Evolution API')
          await new Promise(resolve => setTimeout(resolve, 2000))
        } else {
          console.log('🗑️ ℹ️ Instance not found or already deleted')
        }
      } catch (err) {
        console.log('ℹ️ No existing IA instance to delete (error caught)')
      }
      
      // 2️⃣ Deletar registro do banco (se existir) - duas queries separadas para evitar erro de sintaxe OR
      console.log('2️⃣ Cleaning database records...')
      
      // Delete por instance_name
      const { error: deleteDbError1 } = await supabase
        .from('tendenci_whatsapp_connections')
        .delete()
        .eq('instance_name', iaInstanceName)
      
      if (deleteDbError1) {
        console.warn('⚠️ Database cleanup (by name) warning:', deleteDbError1.message)
      }
      
      // Delete por is_ia_instance
      const { error: deleteDbError2 } = await supabase
        .from('tendenci_whatsapp_connections')
        .delete()
        .eq('is_ia_instance', true)
      
      if (deleteDbError2) {
        console.warn('⚠️ Database cleanup (by is_ia) warning:', deleteDbError2.message)
      } else {
        console.log('🗑️ ✅ Cleaned IA database records')
      }
      
      // 3️⃣ Criar nova instância na Evolution API
      console.log('3️⃣ Creating new instance in Evolution API...')
      const createPayload = {
        instanceName: iaInstanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS'
      }
      console.log('📤 Create payload:', JSON.stringify(createPayload))
      
      const createResp = await fetch(`${evolutionUrl}/instance/create`, {
        method: 'POST',
        headers: {
          'apikey': evolutionApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(createPayload)
      })
      
      console.log('📥 Create response status:', createResp.status)
      
      if (!createResp.ok) {
        const errorText = await createResp.text()
        console.error('❌ Evolution API create error:', errorText)
        throw new Error(`Evolution API failed: ${createResp.status} - ${errorText}`)
      }
      
      const createData = await createResp.json()
      
      // Validar resposta antes de usar
      if (!createData || typeof createData !== 'object') {
        throw new Error('Evolution API returned invalid response')
      }
      
      console.log('✅ IA Instance created successfully!')
      console.log('📝 Create response data:', JSON.stringify(createData, null, 2))
      
      // 4️⃣ Extrair instance_id de forma robusta
      const instanceId = 
        createData?.instance?.instanceId || 
        createData?.instanceId || 
        createData?.instance?.instanceName ||
        iaInstanceName
      console.log('4️⃣ Instance ID extracted:', instanceId)
      
      // 5️⃣ Obter QR Code - tentar da resposta de criação primeiro, depois retry 3x
      let qrCodeBase64 = 
        createData?.qrcode?.base64 || 
        createData?.base64 || 
        createData?.instance?.qrcode?.base64 ||
        null
      
      if (qrCodeBase64) {
        console.log('📱 QR Code obtained from create response! ✅')
      } else {
        console.log('5️⃣ QR not in create response, fetching from connect endpoint...')
        
        // Retry 3 vezes com delay de 2 segundos
        for (let attempt = 1; attempt <= 3 && !qrCodeBase64; attempt++) {
          console.log(`📱 QR Code attempt ${attempt}/3...`)
          await new Promise(resolve => setTimeout(resolve, 2000))
          
          try {
            const connectResp = await fetch(`${evolutionUrl}/instance/connect/${iaInstanceName}`, {
              method: 'GET',
              headers: { 'apikey': evolutionApiKey }
            })
            
            console.log(`📱 Connect response status (attempt ${attempt}):`, connectResp.status)
            
            if (connectResp.ok) {
              const connectData = await connectResp.json()
              console.log('📱 Connect response keys:', Object.keys(connectData))
              
              qrCodeBase64 = 
                connectData?.base64 || 
                connectData?.qrcode?.base64 || 
                connectData?.qrcode?.code ||
                connectData?.code ||
                null
              
              if (qrCodeBase64) {
                console.log(`📱 IA QR Code obtained on attempt ${attempt}! ✅`)
              }
            } else {
              const errorText = await connectResp.text()
              console.warn(`⚠️ Connect endpoint failed (attempt ${attempt}):`, connectResp.status, errorText)
            }
          } catch (err) {
            console.error(`❌ Error getting IA QR code (attempt ${attempt}):`, err)
          }
        }
      }
      
      if (!qrCodeBase64) {
        console.warn('⚠️ Could not obtain QR Code after 3 attempts')
      }
      
      // 6️⃣ Configurar webhook para N8N - testar múltiplos formatos de payload
      console.log('6️⃣ Configuring webhook for N8N...')
      let webhookConfigured = false
      
      // Formato 1: Com wrapper webhook
      const webhookPayload1 = {
        webhook: {
          url: n8nWebhookUrl,
          enabled: true,
          webhookByEvents: false,
          events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'QRCODE_UPDATED']
        }
      }
      
      // Formato 2: Sem wrapper (fallback)
      const webhookPayload2 = {
        url: n8nWebhookUrl,
        enabled: true,
        webhookByEvents: false,
        events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'QRCODE_UPDATED']
      }
      
      // Tentar primeiro /webhook/set/{instance} com formato 1
      try {
        console.log('📤 Trying /webhook/set/ with wrapper payload...')
        
        let webhookResp = await fetch(`${evolutionUrl}/webhook/set/${iaInstanceName}`, {
          method: 'POST',
          headers: {
            'apikey': evolutionApiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(webhookPayload1)
        })
        
        console.log('📥 Webhook /set/ (format 1) status:', webhookResp.status)
        
        if (webhookResp.ok) {
          console.log('✅ IA Webhook configured via /webhook/set/ (format 1)')
          webhookConfigured = true
        } else {
          // Tentar mesmo endpoint com formato 2
          console.log('📤 Trying /webhook/set/ without wrapper...')
          webhookResp = await fetch(`${evolutionUrl}/webhook/set/${iaInstanceName}`, {
            method: 'POST',
            headers: {
              'apikey': evolutionApiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(webhookPayload2)
          })
          
          console.log('📥 Webhook /set/ (format 2) status:', webhookResp.status)
          
          if (webhookResp.ok) {
            console.log('✅ IA Webhook configured via /webhook/set/ (format 2)')
            webhookConfigured = true
          } else {
            // Tentar endpoint alternativo /webhook/instance/{instance}
            console.log('📤 Trying alternative /webhook/instance/ endpoint...')
            const altResp = await fetch(`${evolutionUrl}/webhook/instance/${iaInstanceName}`, {
              method: 'POST',
              headers: {
                'apikey': evolutionApiKey,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(webhookPayload2)
            })
            
            console.log('📥 Webhook /instance/ status:', altResp.status)
            
            if (altResp.ok) {
              console.log('✅ IA Webhook configured via /webhook/instance/')
              webhookConfigured = true
            } else {
              const errorText = await altResp.text()
              console.error('❌ All webhook endpoints failed. Last error:', errorText)
            }
          }
        }
      } catch (err) {
        console.error('❌ IA Webhook configuration error:', err)
      }
      
      // 7️⃣ INSERIR no banco com is_ia_instance = true
      console.log('7️⃣ Inserting into database...')
      const insertData = {
        instance_name: iaInstanceName,
        instance_id: instanceId,
        status: 'connecting',
        qr_code: qrCodeBase64,
        qr_code_base64: qrCodeBase64,
        phone_number: null,
        connected_at: null,
        created_by: null,
        user_id: null,
        webhook_configured: webhookConfigured,
        webhook_url: n8nWebhookUrl,
        is_ia_instance: true
      }
      
      console.log('💾 Insert data:', JSON.stringify({ ...insertData, qr_code: qrCodeBase64 ? '[QR_CODE_DATA]' : null, qr_code_base64: qrCodeBase64 ? '[QR_CODE_DATA]' : null }))
      
      const { data: insertedData, error: insertError } = await supabase
        .from('tendenci_whatsapp_connections')
        .insert(insertData)
        .select()
        .single()
      
      if (insertError) {
        console.error('❌ DATABASE INSERT ERROR:', insertError)
        throw new Error(`Database insert failed: ${insertError.message}`)
      }
      
      console.log('✅ IA Database insert SUCCESS - ID:', insertedData.id)
      console.log('🤖 ========== IA INSTANCE CREATION COMPLETE ==========')
      
      return new Response(
        JSON.stringify({
          success: true,
          instanceId,
          instanceName: iaInstanceName,
          qrCode: qrCodeBase64,
          databaseId: insertedData.id,
          webhookUrl: n8nWebhookUrl,
          webhookConfigured,
          status: 'connecting'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ========== QRCODE ==========
    if (action === 'qrcode') {
      if (!instanceName) {
        throw new Error('instanceName is required for qrcode action')
      }
      
      console.log('📱 Generating new QR Code for:', instanceName)
      
      // Desconectar primeiro (com try-catch para não quebrar se instância não existir)
      try {
        await fetch(`${evolutionUrl}/instance/logout/${instanceName}`, {
          method: 'DELETE',
          headers: { 'apikey': evolutionApiKey }
        })
      } catch (err) {
        console.log('⚠️ Logout failed (continuing):', err)
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Conectar novamente para obter QR code
      const connectResp = await fetch(`${evolutionUrl}/instance/connect/${instanceName}`, {
        method: 'GET',
        headers: { 'apikey': evolutionApiKey }
      })

      if (!connectResp.ok) {
        throw new Error('Failed to generate QR code')
      }

      const connectData = await connectResp.json()
      const qrCodeBase64 = connectData?.base64 || connectData?.qrcode?.base64 || null

      if (qrCodeBase64) {
        await supabase
          .from('tendenci_whatsapp_connections')
          .update({ 
            qr_code_base64: qrCodeBase64,
            qr_code: qrCodeBase64,
            status: 'connecting'
          })
          .eq('instance_name', instanceName)
      }

      return new Response(
        JSON.stringify({ qrCode: qrCodeBase64 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ========== DELETE ==========
    if (action === 'delete') {
      console.log('🗑️ Deleting instance:', instanceName)
      
      // 1️⃣ Buscar o ID da conexão
      const { data: connection } = await supabase
        .from('tendenci_whatsapp_connections')
        .select('id')
        .eq('instance_name', instanceName)
        .single()

      if (!connection) {
        throw new Error('Connection not found in database')
      }

      console.log('📝 Connection ID:', connection.id)

      // 2️⃣ Remover referências em campanhas (setar NULL)
      const { error: updateCampaignsError } = await supabase
        .from('tendenci_prospec_arq_campaigns')
        .update({ whatsapp_connection_id: null })
        .eq('whatsapp_connection_id', connection.id)

      if (updateCampaignsError) {
        console.error('❌ Error updating campaigns:', updateCampaignsError)
        throw new Error(`Failed to remove campaign references: ${updateCampaignsError.message}`)
      }

      console.log('✅ Campaign references removed')

      // 3️⃣ Deletar da Evolution API
      try {
        const deleteResp = await fetch(`${evolutionUrl}/instance/delete/${instanceName}`, {
          method: 'DELETE',
          headers: { 'apikey': evolutionApiKey }
        })

        if (!deleteResp.ok && deleteResp.status !== 404) {
          const errorText = await deleteResp.text()
          console.error('❌ Evolution API delete error:', errorText)
          throw new Error(`Failed to delete from Evolution API: ${deleteResp.status}`)
        }

        console.log('✅ Deleted from Evolution API')
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        console.log('⚠️ Evolution API error (continuing):', errorMsg)
        // Continue mesmo se falhar na API, pelo menos limpa o banco
      }

      // 4️⃣ Deletar do banco de dados
      const { error: deleteError } = await supabase
        .from('tendenci_whatsapp_connections')
        .delete()
        .eq('instance_name', instanceName)

      if (deleteError) {
        console.error('❌ Database delete error:', deleteError)
        throw new Error(`Failed to delete from database: ${deleteError.message}`)
      }

      console.log('✅ Deleted from database')

      return new Response(
        JSON.stringify({ success: true, message: 'Instance deleted successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ========== DISCONNECT ==========
    if (action === 'disconnect') {
      console.log('🔌 Disconnecting instance:', instanceName)
      
      // 1️⃣ PRIMEIRO: Fazer logout para encerrar sessão atual
      try {
        await fetch(`${evolutionUrl}/instance/logout/${instanceName}`, {
          method: 'DELETE',
          headers: { 'apikey': evolutionApiKey }
        })
        console.log('✅ Logout realizado')
      } catch (err) {
        console.log('⚠️ Erro no logout (continuando):', err)
      }
      
      // 2️⃣ AGUARDAR um momento
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // 3️⃣ DELETAR a instância da Evolution API para realmente ficar OFFLINE
      try {
        const deleteResp = await fetch(`${evolutionUrl}/instance/delete/${instanceName}`, {
          method: 'DELETE',
          headers: { 'apikey': evolutionApiKey }
        })
        
        if (deleteResp.ok) {
          console.log('✅ Instância deletada da Evolution API - WhatsApp OFFLINE')
        } else {
          console.warn('⚠️ Falha ao deletar instância:', deleteResp.status)
        }
      } catch (err) {
        console.error('❌ Erro ao deletar instância:', err)
      }

      // 4️⃣ ATUALIZAR banco - manter registro mas marcar como desconectado
      await supabase
        .from('tendenci_whatsapp_connections')
        .update({ 
          status: 'disconnected', 
          phone_number: null,
          qr_code: null,
          qr_code_base64: null,
          connected_at: null,
          last_sync: new Date().toISOString()
        })
        .eq('instance_name', instanceName)

      console.log('✅ Banco atualizado - instância desconectada')

      return new Response(
        JSON.stringify({ success: true, message: 'Instance disconnected and offline' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ========== LIST-ALL (Listar todas instâncias e identificar órfãs) ==========
    if (action === 'list-all') {
      console.log('📋 Listing ALL instances from Evolution API...')
      
      // 1️⃣ Buscar TODAS instâncias da Evolution API
      const listResp = await fetch(`${evolutionUrl}/instance/fetchInstances`, {
        headers: { 'apikey': evolutionApiKey }
      })
      
      if (!listResp.ok) {
        const errorText = await listResp.text()
        console.error('❌ Evolution API list error:', errorText)
        throw new Error(`Failed to list instances: ${listResp.status}`)
      }
      
      const evolutionInstances = await listResp.json()
      console.log('📊 Evolution instances found:', evolutionInstances.length)
      console.log('📊 Raw Evolution data:', JSON.stringify(evolutionInstances, null, 2))
      
      // 2️⃣ Buscar todas conexões do banco
      const { data: dbConnections, error: dbError } = await supabase
        .from('tendenci_whatsapp_connections')
        .select('id, instance_name, status, phone_number, user_id')
      
      if (dbError) {
        console.error('❌ Database error:', dbError)
        throw new Error(`Database query failed: ${dbError.message}`)
      }
      
      console.log('📊 DB connections found:', dbConnections?.length || 0)
      
      // 3️⃣ Extrair nome da instância EXATAMENTE como vem da API (NÃO fazer trim!)
      // Isso é crítico porque a Evolution API usa o nome exato para deletar
      const getInstanceNameExact = (inst: any): string | null => {
        // Priorizar 'name' que é o campo exato da Evolution API
        // NÃO fazer .trim() - manter espaços exatamente como estão
        const name = inst.name || 
               inst.instanceName || 
               inst.instance?.name ||
               inst.instance?.instanceName ||
               (typeof inst === 'string' ? inst : null)
        return name // Retornar exatamente como veio, com espaços se houver
      }
      
      // 4️⃣ Encontrar instâncias órfãs (existem na Evolution mas NÃO no banco)
      // Comparar com trim para identificar, mas retornar nome exato
      const dbNames = new Set(dbConnections?.map(c => c.instance_name?.trim()) || [])
      const orphans = evolutionInstances.filter((inst: any) => {
        const name = getInstanceNameExact(inst)
        const nameTrimmed = name?.trim() || ''
        const isInDb = dbNames.has(nameTrimmed)
        console.log(`  Checking instance: "${name}" (trimmed: "${nameTrimmed}") (in DB: ${isInDb})`)
        return name && !isInDb
      })
      
      console.log('🔍 Orphan instances found:', orphans.length)
      orphans.forEach((o: any) => {
        const name = getInstanceNameExact(o)
        console.log(`  - Orphan: "${name}" (length: ${name?.length})`)
      })
      
      return new Response(
        JSON.stringify({
          evolutionInstances: evolutionInstances.map((i: any) => ({
            instanceName: getInstanceNameExact(i), // Nome EXATO com espaços
            instanceNameDisplay: getInstanceNameExact(i)?.trim(), // Para exibição
            status: i.connectionStatus || i.state || i.instance?.status || 'unknown',
            ownerJid: i.ownerJid || i.owner || i.instance?.ownerJid
          })),
          dbConnections: dbConnections || [],
          orphans: orphans.map((o: any) => ({
            instanceName: getInstanceNameExact(o), // Nome EXATO para deletar
            instanceNameDisplay: getInstanceNameExact(o)?.trim(), // Para exibição
            status: o.connectionStatus || o.state || o.instance?.status || 'unknown'
          })),
          summary: {
            totalEvolution: evolutionInstances.length,
            totalDatabase: dbConnections?.length || 0,
            totalOrphans: orphans.length
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ========== DELETE-ORPHANS (Deletar instâncias órfãs) ==========
    if (action === 'delete-orphans') {
      const instanceNamesToDelete = body.instanceNames || []
      console.log('🗑️ Deleting orphan instances:', JSON.stringify(instanceNamesToDelete))
      
      if (instanceNamesToDelete.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: 'No instances to delete', results: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      const results: { name: string; success: boolean; error?: string }[] = []
      
      for (const name of instanceNamesToDelete) {
        try {
          // Usar encodeURIComponent para lidar com espaços e caracteres especiais
          const encodedName = encodeURIComponent(name)
          console.log(`🗑️ Deleting orphan: "${name}" (encoded: "${encodedName}", length: ${name.length})`)
          
          const deleteResp = await fetch(`${evolutionUrl}/instance/delete/${encodedName}`, {
            method: 'DELETE',
            headers: { 'apikey': evolutionApiKey }
          })
          
          console.log(`📊 Delete response status for "${name}": ${deleteResp.status}`)
          
          if (deleteResp.ok || deleteResp.status === 404) {
            console.log(`✅ Orphan deleted: "${name}"`)
            results.push({ name, success: true })
          } else {
            const errorText = await deleteResp.text()
            console.error(`❌ Failed to delete "${name}":`, deleteResp.status, errorText)
            results.push({ name, success: false, error: `${deleteResp.status}: ${errorText}` })
          }
          
          // Pequeno delay entre deleções
          await new Promise(resolve => setTimeout(resolve, 500))
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err)
          console.error(`❌ Error deleting "${name}":`, errorMsg)
          results.push({ name, success: false, error: errorMsg })
        }
      }
      
      const totalDeleted = results.filter(r => r.success).length
      console.log(`✅ Cleanup complete: ${totalDeleted}/${instanceNamesToDelete.length} deleted`)
      
      return new Response(
        JSON.stringify({
          success: true,
          results,
          totalDeleted,
          totalFailed: results.filter(r => !r.success).length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error('Invalid action')

  } catch (error: any) {
    console.error('💥 Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
