import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

/**
 * Sincronização forçada de status do WhatsApp
 * Busca todas as instâncias na Evolution API e sincroniza com o banco de dados
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startTime = Date.now()
  const logs: string[] = []
  const log = (msg: string) => {
    console.log(msg)
    logs.push(msg)
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

    const evolutionUrl = evolutionUrlRaw.replace(/\/$/, '')
    log(`🔄 Starting sync with Evolution API: ${evolutionUrl}`)

    // 1️⃣ Buscar todas as instâncias da Evolution API
    const evolutionResp = await fetch(`${evolutionUrl}/instance/fetchInstances`, {
      headers: { 'apikey': evolutionApiKey }
    })

    if (!evolutionResp.ok) {
      throw new Error(`Evolution API error: ${evolutionResp.status}`)
    }

    const evolutionInstances = await evolutionResp.json()
    log(`📊 Found ${evolutionInstances.length} instances in Evolution API`)

    // 2️⃣ Buscar todas as conexões do banco de dados
    const { data: dbConnections, error: dbError } = await supabase
      .from('tendenci_whatsapp_connections')
      .select('id, instance_name, status, phone_number, is_ia_instance')

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`)
    }

    log(`📊 Found ${dbConnections?.length || 0} connections in database`)

    // 3️⃣ Criar mapa de instâncias da Evolution para rápido acesso
    const evolutionMap = new Map<string, any>()
    for (const inst of evolutionInstances) {
      const name = inst.name || inst.instanceName
      evolutionMap.set(name, inst)
    }

    // 4️⃣ Sincronizar cada conexão do banco
    const results = {
      updated: 0,
      disconnected: 0,
      alreadySync: 0,
      errors: 0
    }

    for (const conn of (dbConnections || [])) {
      try {
        const evolutionInst = evolutionMap.get(conn.instance_name)

        if (!evolutionInst) {
          // Instância não existe mais na Evolution - marcar como desconectada
          log(`❌ Instance "${conn.instance_name}" not found in Evolution - marking disconnected`)
          
          const { error: updateError } = await supabase
            .from('tendenci_whatsapp_connections')
            .update({
              status: 'disconnected',
              phone_number: null,
              last_sync: new Date().toISOString()
            })
            .eq('id', conn.id)

          if (updateError) {
            log(`⚠️ Error updating ${conn.instance_name}: ${updateError.message}`)
            results.errors++
          } else {
            results.disconnected++
          }
          continue
        }

        // Verificar status real
        const isConnected = evolutionInst.connectionStatus === 'open'
        const newStatus = isConnected ? 'connected' : 'connecting'
        const phoneNumber = evolutionInst.ownerJid?.split('@')[0] || null

        // Verificar se precisa atualizar
        const needsUpdate = 
          conn.status !== newStatus ||
          (isConnected && phoneNumber && conn.phone_number !== phoneNumber)

        if (needsUpdate) {
          log(`🔄 Updating "${conn.instance_name}": ${conn.status} → ${newStatus}, phone: ${phoneNumber}`)

          const updateData: any = {
            status: newStatus,
            last_sync: new Date().toISOString()
          }

          if (isConnected && phoneNumber) {
            updateData.phone_number = phoneNumber
            updateData.connected_at = new Date().toISOString()
            updateData.qr_code = null
            updateData.qr_code_base64 = null
          }

          const { error: updateError } = await supabase
            .from('tendenci_whatsapp_connections')
            .update(updateData)
            .eq('id', conn.id)

          if (updateError) {
            log(`⚠️ Error updating ${conn.instance_name}: ${updateError.message}`)
            results.errors++
          } else {
            results.updated++
          }
        } else {
          log(`✅ "${conn.instance_name}" already in sync`)
          results.alreadySync++
        }
      } catch (err: any) {
        log(`❌ Error processing ${conn.instance_name}: ${err.message}`)
        results.errors++
      }
    }

    // 5️⃣ Detectar duplicatas na Evolution
    const duplicates: { name: string; count: number }[] = []
    const nameCount = new Map<string, number>()
    
    for (const inst of evolutionInstances) {
      const name = inst.name || inst.instanceName
      nameCount.set(name, (nameCount.get(name) || 0) + 1)
    }

    for (const [name, count] of nameCount) {
      if (count > 1) {
        duplicates.push({ name, count })
        log(`⚠️ Duplicate found: "${name}" appears ${count} times`)
      }
    }

    const duration = Date.now() - startTime

    log(`✅ Sync completed in ${duration}ms`)
    log(`📊 Results: ${results.updated} updated, ${results.disconnected} disconnected, ${results.alreadySync} already sync, ${results.errors} errors`)

    return new Response(
      JSON.stringify({
        success: true,
        duration,
        results,
        duplicates,
        logs,
        evolutionInstanceCount: evolutionInstances.length,
        dbConnectionCount: dbConnections?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('💥 Sync error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        logs
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
