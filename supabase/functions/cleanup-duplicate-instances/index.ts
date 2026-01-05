import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

/**
 * Limpeza automática de instâncias duplicadas na Evolution API
 * Identifica instâncias com mesmo nome e mantém apenas a conectada (ou mais recente)
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

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
    log(`🔍 Checking for duplicate instances in Evolution API`)

    // 1️⃣ Buscar todas as instâncias da Evolution API
    const evolutionResp = await fetch(`${evolutionUrl}/instance/fetchInstances`, {
      headers: { 'apikey': evolutionApiKey }
    })

    if (!evolutionResp.ok) {
      throw new Error(`Evolution API error: ${evolutionResp.status}`)
    }

    const evolutionInstances = await evolutionResp.json()
    log(`📊 Found ${evolutionInstances.length} total instances`)

    // 2️⃣ Agrupar por nome
    const groupedByName = new Map<string, any[]>()
    
    for (const inst of evolutionInstances) {
      const name = inst.name || inst.instanceName
      if (!groupedByName.has(name)) {
        groupedByName.set(name, [])
      }
      groupedByName.get(name)!.push(inst)
    }

    // 3️⃣ Identificar e deletar duplicatas
    const duplicatesDeleted: string[] = []
    const errors: string[] = []

    for (const [name, instances] of groupedByName) {
      if (instances.length > 1) {
        log(`⚠️ Found ${instances.length} duplicates for "${name}"`)

        // Encontrar a instância conectada (se houver)
        const connected = instances.find((i: any) => i.connectionStatus === 'open')
        
        // Instâncias para deletar (todas exceto a conectada, ou todas exceto a primeira se nenhuma conectada)
        const toKeep = connected || instances[0]
        const toDelete = instances.filter((i: any) => i !== toKeep)

        log(`✅ Keeping: ${toKeep.instanceName || toKeep.name} (status: ${toKeep.connectionStatus})`)

        for (const inst of toDelete) {
          const instName = inst.instanceName || inst.name
          log(`🗑️ Deleting duplicate: ${instName}`)

          try {
            const deleteResp = await fetch(
              `${evolutionUrl}/instance/delete/${encodeURIComponent(instName)}`,
              {
                method: 'DELETE',
                headers: { 'apikey': evolutionApiKey }
              }
            )

            if (deleteResp.ok) {
              duplicatesDeleted.push(instName)
              log(`✅ Successfully deleted: ${instName}`)
            } else {
              const errorText = await deleteResp.text()
              errors.push(`Failed to delete ${instName}: ${errorText}`)
              log(`❌ Failed to delete ${instName}: ${deleteResp.status}`)
            }
          } catch (err: any) {
            errors.push(`Error deleting ${instName}: ${err.message}`)
            log(`❌ Error deleting ${instName}: ${err.message}`)
          }
        }
      }
    }

    // 4️⃣ Logar resultado no sistema
    if (duplicatesDeleted.length > 0) {
      await supabase.from('system_errors').insert({
        title: 'Limpeza de duplicatas WhatsApp',
        description: `${duplicatesDeleted.length} instância(s) duplicada(s) removida(s)`,
        module: 'whatsapp',
        severity: 'low',
        source: 'cleanup-duplicate-instances',
        metadata: { 
          deleted: duplicatesDeleted,
          errors: errors.length > 0 ? errors : undefined
        },
        status: 'resolved'
      })
    }

    log(`✅ Cleanup completed: ${duplicatesDeleted.length} duplicates deleted`)

    return new Response(
      JSON.stringify({
        success: true,
        duplicatesDeleted,
        errors: errors.length > 0 ? errors : undefined,
        logs,
        totalInstances: evolutionInstances.length,
        uniqueNames: groupedByName.size
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('💥 Cleanup error:', error)
    
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
