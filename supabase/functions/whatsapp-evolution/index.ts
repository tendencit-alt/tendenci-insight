import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EvolutionRequest {
  action: string
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
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const evolutionUrl = Deno.env.get('EVOLUTION_API_URL')
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY')

    if (!evolutionUrl || !evolutionApiKey) {
      throw new Error('Missing Evolution API configuration')
    }

    const body: EvolutionRequest = await req.json()
    const { action, instanceName } = body
    
    console.log('📋 Request:', { action, instanceName })

    // ========== CHECK STATUS ==========
    if (action === 'check-status') {
      console.log('🔍 Checking status for:', instanceName)
      
      const response = await fetch(`${evolutionUrl}/instance/connectionState/${instanceName}`, {
        method: 'GET',
        headers: { 'apikey': evolutionApiKey }
      })
      
      if (!response.ok) {
        throw new Error(`Evolution API error: ${response.status}`)
      }
      
      const statusData = await response.json()
      console.log('📊 Raw status:', JSON.stringify(statusData, null, 2))
      
      // 🎯 CORREÇÃO CRÍTICA: O estado está em instance.state, não em state!
      const currentState = statusData.instance?.state || statusData.state
      let mappedStatus = 'connecting'
      let phoneNumber = null
      
      console.log(`🔍 Extracted state: "${currentState}"`)
      
      if (currentState === 'open') {
        mappedStatus = 'connected'
        phoneNumber = statusData.instance?.wuid?.split('@')[0] || 
                     statusData.instance?.phoneNumber || 
                     null
        console.log('✅ CONNECTED! Phone:', phoneNumber)
      } else if (currentState === 'close') {
        mappedStatus = 'disconnected'
        console.log('❌ DISCONNECTED')
      } else {
        console.log('⏳ CONNECTING...')
      }
      
      // Buscar registro atual
      const { data: currentConn } = await supabase
        .from('tendenci_whatsapp_connections')
        .select('status, phone_number, connected_at')
        .eq('instance_name', instanceName)
        .single()
      
      const needsUpdate = currentConn?.status !== mappedStatus || 
                         currentConn?.phone_number !== phoneNumber
      
      console.log('🔍 Comparison:', {
        dbStatus: currentConn?.status,
        newStatus: mappedStatus,
        needsUpdate
      })
      
      if (needsUpdate) {
        console.log('💾 Updating database...')
        await supabase
          .from('tendenci_whatsapp_connections')
          .update({
            status: mappedStatus,
            phone_number: phoneNumber,
            connected_at: mappedStatus === 'connected' ? new Date().toISOString() : currentConn?.connected_at,
            last_sync: new Date().toISOString()
          })
          .eq('instance_name', instanceName)
        console.log('✅ Database updated!')
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          status: mappedStatus, 
          phoneNumber,
          updated: needsUpdate
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ========== CREATE INSTANCE ==========
    if (action === 'create') {
      console.log('🆕 Creating:', instanceName)
      
      // Verificar se já existe na Evolution API
      try {
        const checkResponse = await fetch(`${evolutionUrl}/instance/fetchInstances?instanceName=${instanceName}`, {
          headers: { 'apikey': evolutionApiKey }
        })
        
        if (checkResponse.ok) {
          const instances = await checkResponse.json()
          if (instances && instances.length > 0) {
            console.log('⚠️ Instance already exists, deleting...')
            await fetch(`${evolutionUrl}/instance/delete/${instanceName}`, {
              method: 'DELETE',
              headers: { 'apikey': evolutionApiKey }
            })
            await new Promise(resolve => setTimeout(resolve, 2000))
          }
        }
      } catch (err) {
        console.log('ℹ️ No existing instance to delete')
      }
      
      // Criar na Evolution API
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
        throw new Error('Failed to create instance in Evolution API')
      }
      
      const createData = await createResponse.json()
      console.log('✅ Instance created:', createData)
      
      const instanceId = createData.instance?.instanceId || createData.instanceId || createData.instance?.instanceName
      
      // Aguardar e obter QR Code
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      let qrCodeBase64 = null
      try {
        const connectResponse = await fetch(`${evolutionUrl}/instance/connect/${instanceName}`, {
          method: 'GET',
          headers: { 'apikey': evolutionApiKey }
        })
        
        if (connectResponse.ok) {
          const connectData = await connectResponse.json()
          qrCodeBase64 = connectData.base64 || connectData.qrcode?.base64 || connectData.qrcode?.code
          console.log('📱 QR Code obtained:', qrCodeBase64 ? 'Yes' : 'No')
        }
      } catch (err) {
        console.log('⚠️ QR Code not ready yet')
      }
      
      // Configurar webhook
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const webhookUrl = `${supabaseUrl}/functions/v1/whatsapp-webhook`
      
      try {
        await fetch(`${evolutionUrl}/webhook/set/${instanceName}`, {
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
        console.log('✅ Webhook configured')
      } catch (err) {
        console.warn('⚠️ Webhook config failed:', err)
      }
      
      // Verificar se já existe no banco
      const { data: existing } = await supabase
        .from('tendenci_whatsapp_connections')
        .select('id')
        .eq('instance_name', instanceName)
        .single()
      
      if (existing) {
        // Atualizar
        await supabase
          .from('tendenci_whatsapp_connections')
          .update({
            instance_id: instanceId,
            status: 'connecting',
            qr_code: qrCodeBase64,
            qr_code_base64: qrCodeBase64,
            phone_number: null,
            connected_at: null,
            last_sync: new Date().toISOString()
          })
          .eq('instance_name', instanceName)
      } else {
        // Inserir
        await supabase
          .from('tendenci_whatsapp_connections')
          .insert({
            instance_name: instanceName,
            instance_id: instanceId,
            status: 'connecting',
            qr_code: qrCodeBase64,
            qr_code_base64: qrCodeBase64,
            phone_number: null
          })
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          instanceId, 
          qrCode: qrCodeBase64 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ========== GENERATE QR CODE ==========
    if (action === 'qrcode') {
      console.log('📱 Generating QR for:', instanceName)
      
      // Desconectar
      await fetch(`${evolutionUrl}/instance/logout/${instanceName}`, {
        method: 'DELETE',
        headers: { 'apikey': evolutionApiKey }
      })
      
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Reconectar para novo QR
      const connectResponse = await fetch(`${evolutionUrl}/instance/connect/${instanceName}`, {
        method: 'GET',
        headers: { 'apikey': evolutionApiKey }
      })
      
      if (!connectResponse.ok) {
        throw new Error('Failed to generate QR code')
      }
      
      const connectData = await connectResponse.json()
      const qrCodeBase64 = connectData.base64 || connectData.qrcode?.base64 || connectData.qrcode?.code
      
      // Reconfigurar webhook
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const webhookUrl = `${supabaseUrl}/functions/v1/whatsapp-webhook`
      
      await fetch(`${evolutionUrl}/webhook/set/${instanceName}`, {
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
      
      // Atualizar banco
      await supabase
        .from('tendenci_whatsapp_connections')
        .update({
          status: 'connecting',
          qr_code: qrCodeBase64,
          qr_code_base64: qrCodeBase64,
          phone_number: null,
          last_sync: new Date().toISOString()
        })
        .eq('instance_name', instanceName)
      
      return new Response(
        JSON.stringify({ success: true, qrCode: qrCodeBase64 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ========== DELETE ==========
    if (action === 'delete') {
      console.log('🗑️ Deleting:', instanceName)
      
      await fetch(`${evolutionUrl}/instance/delete/${instanceName}`, {
        method: 'DELETE',
        headers: { 'apikey': evolutionApiKey }
      })
      
      await supabase
        .from('tendenci_whatsapp_connections')
        .delete()
        .eq('instance_name', instanceName)
      
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
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

    throw new Error('Invalid action')

  } catch (error) {
    console.error('💥 Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
