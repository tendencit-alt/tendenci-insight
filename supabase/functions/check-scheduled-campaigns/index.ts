import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { logSystemError } from '../_shared/logError.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Campaign {
  id: string
  nome: string
  status: string
  arquitetos_selecionados: string[]
  data_inicio: string | null
  data_fim: string | null
  dias_semana: number[] | null
  horarios: string | null
  agendar_automatico: boolean | null
  tipo_agendamento: string | null
  data_hora_unica: string | null
  horario_inicio: string | null
  horario_fim: string | null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    console.log('🕐 [check-scheduled-campaigns] Verificando campanhas agendadas...')

    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentDayOfWeek = now.getDay() // 0 = domingo, 6 = sábado

    console.log(`📅 Data/Hora atual: ${now.toISOString()}`)
    console.log(`⏰ Hora: ${currentHour}:${currentMinute}, Dia da semana: ${currentDayOfWeek}`)

    // Buscar campanhas com status 'agendado'
    const { data: campanhasAgendadas, error: fetchError } = await supabase
      .from('tendenci_prospec_arq_campaigns')
      .select('*')
      .eq('status', 'agendado')
      .eq('agendar_automatico', true)

    if (fetchError) {
      console.error('❌ Erro ao buscar campanhas agendadas:', fetchError)
      throw fetchError
    }

    if (!campanhasAgendadas || campanhasAgendadas.length === 0) {
      console.log('✅ Nenhuma campanha agendada encontrada')
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Nenhuma campanha agendada',
        processed: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`📋 ${campanhasAgendadas.length} campanha(s) agendada(s) encontrada(s)`)

    let processedCount = 0
    const results: { campaignId: string; nome: string; action: string }[] = []

    for (const campanha of campanhasAgendadas as Campaign[]) {
      console.log(`\n🔍 Verificando campanha: ${campanha.nome} (${campanha.id})`)
      
      let shouldDispatch = false
      let reason = ''

      // Verificar tipo de agendamento
      if (campanha.tipo_agendamento === 'unico') {
        // Agendamento único - verificar data/hora exata
        if (campanha.data_hora_unica) {
          const scheduledTime = new Date(campanha.data_hora_unica)
          const diffMinutes = (now.getTime() - scheduledTime.getTime()) / (1000 * 60)
          
          // Disparar se estamos dentro de 5 minutos após o horário agendado
          if (diffMinutes >= 0 && diffMinutes <= 5) {
            shouldDispatch = true
            reason = `Agendamento único: ${scheduledTime.toISOString()}`
          } else if (diffMinutes > 5) {
            // Passou do horário - marcar como erro
            console.log(`⏰ Campanha ${campanha.nome} passou do horário agendado`)
            await supabase
              .from('tendenci_prospec_arq_campaigns')
              .update({ 
                status: 'erro',
                updated_at: new Date().toISOString()
              })
              .eq('id', campanha.id)
            
            results.push({ 
              campaignId: campanha.id, 
              nome: campanha.nome, 
              action: 'marked_expired' 
            })
            continue
          }
        }
      } else if (campanha.tipo_agendamento === 'recorrente') {
        // Agendamento recorrente
        const diasSemana = campanha.dias_semana || []
        const horarioInicio = campanha.horario_inicio || '09:00'
        const horarioFim = campanha.horario_fim || '18:00'
        
        // Verificar período
        if (campanha.data_inicio) {
          const dataInicio = new Date(campanha.data_inicio)
          if (now < dataInicio) {
            console.log(`📅 Campanha ${campanha.nome} ainda não iniciou (início: ${dataInicio.toISOString()})`)
            results.push({ 
              campaignId: campanha.id, 
              nome: campanha.nome, 
              action: 'not_started' 
            })
            continue
          }
        }
        
        if (campanha.data_fim) {
          const dataFim = new Date(campanha.data_fim)
          dataFim.setHours(23, 59, 59, 999)
          if (now > dataFim) {
            console.log(`📅 Campanha ${campanha.nome} encerrada (fim: ${dataFim.toISOString()})`)
            await supabase
              .from('tendenci_prospec_arq_campaigns')
              .update({ 
                status: 'enviado',
                updated_at: new Date().toISOString()
              })
              .eq('id', campanha.id)
            
            results.push({ 
              campaignId: campanha.id, 
              nome: campanha.nome, 
              action: 'period_ended' 
            })
            continue
          }
        }
        
        // Verificar dia da semana
        if (!diasSemana.includes(currentDayOfWeek)) {
          console.log(`📅 Hoje não é dia de disparo para ${campanha.nome}`)
          results.push({ 
            campaignId: campanha.id, 
            nome: campanha.nome, 
            action: 'not_today' 
          })
          continue
        }
        
        // Verificar horário
        const [horaInicio, minInicio] = horarioInicio.split(':').map(Number)
        const [horaFim, minFim] = horarioFim.split(':').map(Number)
        
        const inicioMinutos = horaInicio * 60 + (minInicio || 0)
        const fimMinutos = horaFim * 60 + (minFim || 0)
        const agoraMinutos = currentHour * 60 + currentMinute
        
        // Verificar se está dentro da janela de horário (com 5 min de tolerância no início)
        if (agoraMinutos >= inicioMinutos && agoraMinutos <= inicioMinutos + 5) {
          // Verificar se já disparou hoje
          const hoje = now.toISOString().split('T')[0]
          const { data: dispatchesToday } = await supabase
            .from('tendenci_campaign_dispatches')
            .select('id')
            .eq('campaign_id', campanha.id)
            .gte('created_at', `${hoje}T00:00:00`)
            .lt('created_at', `${hoje}T23:59:59`)
          
          if (dispatchesToday && dispatchesToday.length > 0) {
            console.log(`⚠️ Campanha ${campanha.nome} já foi disparada hoje`)
            results.push({ 
              campaignId: campanha.id, 
              nome: campanha.nome, 
              action: 'already_dispatched_today' 
            })
            continue
          }
          
          shouldDispatch = true
          reason = `Agendamento recorrente: ${horarioInicio} - ${horarioFim}, dia ${currentDayOfWeek}`
        } else if (agoraMinutos < inicioMinutos) {
          console.log(`⏰ Ainda não é hora de disparar ${campanha.nome} (início: ${horarioInicio})`)
          results.push({ 
            campaignId: campanha.id, 
            nome: campanha.nome, 
            action: 'not_time_yet' 
          })
          continue
        } else if (agoraMinutos > fimMinutos) {
          console.log(`⏰ Janela de disparo encerrada para ${campanha.nome} (fim: ${horarioFim})`)
          results.push({ 
            campaignId: campanha.id, 
            nome: campanha.nome, 
            action: 'window_closed' 
          })
          continue
        }
      }

      // Executar disparo se necessário
      if (shouldDispatch) {
        console.log(`🚀 Iniciando disparo da campanha ${campanha.nome}: ${reason}`)
        
        const arquitetosIds = campanha.arquitetos_selecionados || []
        
        if (arquitetosIds.length === 0) {
          console.log(`⚠️ Campanha ${campanha.nome} não tem arquitetos selecionados`)
          results.push({ 
            campaignId: campanha.id, 
            nome: campanha.nome, 
            action: 'no_architects' 
          })
          continue
        }

        try {
          // Chamar a edge function execute-campaign-background
          const { data: execData, error: execError } = await supabase.functions.invoke(
            'execute-campaign-background',
            {
              body: {
                campanha_id: campanha.id,
                arquiteto_ids: arquitetosIds,
                from_scheduler: true
              }
            }
          )

          if (execError) {
            console.error(`❌ Erro ao disparar campanha ${campanha.nome}:`, execError)
            await logSystemError(supabase, {
              title: `Erro no agendamento: ${campanha.nome}`,
              module: 'campanhas',
              description: execError.message,
              severity: 'high',
              source: 'edge_function',
              metadata: { campaign_id: campanha.id }
            })
            results.push({ 
              campaignId: campanha.id, 
              nome: campanha.nome, 
              action: 'dispatch_error' 
            })
          } else {
            console.log(`✅ Campanha ${campanha.nome} disparada com sucesso`)
            processedCount++
            results.push({ 
              campaignId: campanha.id, 
              nome: campanha.nome, 
              action: 'dispatched' 
            })

            // Para agendamento único, mudar status para 'enviando' (execute-campaign-background faz isso)
            // Para recorrente, manter como 'agendado' para próximos disparos
          }
        } catch (invokeError: any) {
          console.error(`❌ Exceção ao invocar disparo:`, invokeError)
          await logSystemError(supabase, {
            title: `Exceção no agendamento: ${campanha.nome}`,
            module: 'campanhas',
            description: invokeError.message,
            severity: 'high',
            source: 'edge_function',
            stack_trace: invokeError.stack,
            metadata: { campaign_id: campanha.id }
          })
          results.push({ 
            campaignId: campanha.id, 
            nome: campanha.nome, 
            action: 'exception' 
          })
        }
      }
    }

    console.log(`\n✅ Verificação concluída. ${processedCount} campanha(s) disparada(s)`)

    return new Response(JSON.stringify({
      success: true,
      message: `${processedCount} campanha(s) disparada(s)`,
      processed: processedCount,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error('❌ Erro fatal em check-scheduled-campaigns:', error)
    
    await logSystemError(supabase, {
      title: 'Erro fatal em check-scheduled-campaigns',
      module: 'campanhas',
      description: error.message,
      severity: 'critical',
      source: 'edge_function',
      stack_trace: error.stack
    })

    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
