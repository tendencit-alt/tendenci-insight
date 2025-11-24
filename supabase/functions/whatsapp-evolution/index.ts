import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

interface EvolutionRequest {
  action: 'check-status' | 'create' | 'qrcode' | 'delete' | 'disconnect'
  instanceName: string
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

    const evolutionUrl = Deno.env.get('EVOLUTION_API_URL')
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY')

    if (!evolutionUrl || !evolutionApiKey) {
      throw new Error('Evolution API credentials not configured')
    }

    const { action, instanceName }: EvolutionRequest = await req.json()
    console.log(`🔧 Action: ${action} | Instance: ${instanceName}`)

    // ========== CHECK STATUS ==========
    if (action === 'check-status') {
      console.log('📊 Checking status for:', instanceName)
      
      const statusResp = await fetch(`${evolutionUrl}/instance/fetchInstances?instanceName=${instanceName}`, {
        headers: { 'apikey': evolutionApiKey }
      })

      if (!statusResp.ok) {
        throw new Error(`Evolution API status check failed: ${statusResp.status}`)
      }

      const statusData = await statusResp.json()
      console.log('📊 Evolution API response:', JSON.stringify(statusData, null, 2))

      const currentState = statusData.instance?.state || statusData.state
      console.log('📊 Current state:', currentState)

      const mappedStatus = currentState === 'open' ? 'connected' : 
                          currentState === 'close' ? 'disconnected' : 
                          'connecting'

      const phoneNumber = statusData.instance?.owner || 
                         statusData.owner || 
                         statusData.phone_number ||
                         null

      console.log('📊 Mapped status:', mappedStatus, '| Phone:', phoneNumber)

      // Buscar conexão atual no banco
      const { data: currentConn } = await supabase
        .from('tendenci_whatsapp_connections')
        .select('status, phone_number, connected_at')
        .eq('instance_name', instanceName)
        .single()

      // Atualizar no banco se status mudou
      if (currentConn && currentConn.status !== mappedStatus) {
        console.log(`🔄 Status changed: ${currentConn.status} → ${mappedStatus}`)
        
        const updateData: any = { status: mappedStatus }
        
        if (mappedStatus === 'connected' && phoneNumber) {
          updateData.phone_number = phoneNumber
          updateData.connected_at = new Date().toISOString()
          updateData.qr_code = null
          updateData.qr_code_base64 = null
        }
        
        if (mappedStatus === 'disconnected') {
          updateData.phone_number = null
          updateData.connected_at = null
          updateData.qr_code = null
          updateData.qr_code_base64 = null
        }

        const { error: updateError } = await supabase
          .from('tendenci_whatsapp_connections')
          .update(updateData)
          .eq('instance_name', instanceName)

        if (updateError) {
          console.error('❌ Error updating status:', updateError)
        } else {
          console.log('✅ Status updated in database')
        }
      }

      return new Response(
        JSON.stringify({ 
          status: mappedStatus, 
          phoneNumber,
          rawState: currentState 
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
      
      // 7️⃣ INSERIR no banco (com todos os campos necessários)
      const insertData = {
        instance_name: instanceName,
        instance_id: instanceId,
        status: 'connecting',
        qr_code: qrCodeBase64,
        qr_code_base64: qrCodeBase64,
        phone_number: null,
        connected_at: null,
        created_by: null, // Agora é opcional!
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

    // ========== QRCODE ==========
    if (action === 'qrcode') {
      console.log('📱 Generating new QR Code for:', instanceName)
      
      // Desconectar primeiro
      await fetch(`${evolutionUrl}/instance/logout/${instanceName}`, {
        method: 'DELETE',
        headers: { 'apikey': evolutionApiKey }
      })
      
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
      console.log('🔌 Disconnecting instance:', instanceName)
      
      await fetch(`${evolutionUrl}/instance/logout/${instanceName}`, {
        method: 'DELETE',
        headers: { 'apikey': evolutionApiKey }
      })

      await supabase
        .from('tendenci_whatsapp_connections')
        .update({ status: 'disconnected', phone_number: null })
        .eq('instance_name', instanceName)

      return new Response(
        JSON.stringify({ success: true }),
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
