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
        throw new Error('Instância já existe')
      }

      // Criar instância na Evolution API
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
        const error = await createResponse.text()
        console.error('❌ Error creating instance:', error)
        throw new Error('Erro ao criar instância no Evolution API')
      }

      const instanceData = await createResponse.json()
      console.log('✅ Instance created:', instanceData)

      // Conectar (gerar QR Code)
      const connectResponse = await fetch(`${evolutionUrl}/instance/connect/${instanceName}`, {
        method: 'GET',
        headers: {
          'apikey': evolutionApiKey
        }
      })

      const connectData = await connectResponse.json()
      console.log('📱 QR Code generated:', connectData)

      // Configurar webhook automaticamente na Evolution API
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const webhookUrl = `${supabaseUrl}/functions/v1/whatsapp-webhook`
      
      console.log('🔗 Configuring webhook:', webhookUrl)
      
      const webhookResponse = await fetch(`${evolutionUrl}/webhook/set/${instanceName}`, {
        method: 'POST',
        headers: {
          'apikey': evolutionApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          webhook: {
            url: webhookUrl,
            webhook_by_events: false,
            webhook_base64: true,
            events: [
              'APPLICATION_STARTUP',
              'QRCODE_UPDATED',
              'MESSAGES_SET',
              'MESSAGES_UPSERT',
              'MESSAGES_UPDATE',
              'MESSAGES_DELETE',
              'SEND_MESSAGE',
              'CONNECTION_UPDATE',
              'CALL',
              'NEW_JWT_TOKEN'
            ]
          }
        })
      })

      if (webhookResponse.ok) {
        console.log('✅ Webhook configured successfully')
      } else {
        const webhookError = await webhookResponse.text()
        console.error('⚠️ Webhook configuration failed:', webhookError)
      }

      // Salvar no banco
      const { data: dbConnection, error: dbError } = await supabase
        .from('tendenci_whatsapp_connections')
        .insert({
          instance_name: instanceName,
          instance_id: instanceData.instance?.instanceId || null,
          status: 'connecting',
          qr_code: connectData.base64 || null,
          qr_code_base64: connectData.base64 || null,
          created_by: null, // Será preenchido pelo frontend via RLS
          metadata: instanceData
        })
        .select()
        .single()

      if (dbError) throw dbError

      return new Response(
        JSON.stringify({ 
          success: true, 
          connection: dbConnection,
          qrCode: connectData.base64
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // GET QR CODE de instância específica
    if (action === 'qrcode') {
      console.log('📱 Getting QR Code for:', instanceName)
      
      const response = await fetch(`${evolutionUrl}/instance/connect/${instanceName}`, {
        method: 'GET',
        headers: {
          'apikey': evolutionApiKey
        }
      })

      const data = await response.json()

      // Atualizar QR code no banco
      await supabase
        .from('tendenci_whatsapp_connections')
        .update({
          qr_code: data.base64 || null,
          qr_code_base64: data.base64 || null,
          status: 'connecting'
        })
        .eq('instance_name', instanceName)

      return new Response(
        JSON.stringify({ success: true, qrCode: data.base64 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
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
      
      // Deletar da Evolution API
      await fetch(`${evolutionUrl}/instance/delete/${instanceName}`, {
        method: 'DELETE',
        headers: {
          'apikey': evolutionApiKey
        }
      })

      // Deletar do banco
      await supabase
        .from('tendenci_whatsapp_connections')
        .delete()
        .eq('instance_name', instanceName)

      return new Response(
        JSON.stringify({ success: true }),
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
