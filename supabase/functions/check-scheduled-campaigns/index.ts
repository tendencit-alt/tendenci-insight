import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { logSystemError } from '../_shared/logError.ts'
import { 
  getNowBrasil, 
  getCurrentHourBrasil, 
  getCurrentDayOfWeekBrasil,
  getStartOfDayBrasilAsUTC 
} from '../_shared/timezone.ts'

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
  ultimo_disparo_em: string | null
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

    // Usar timezone Brasil para todas as verificações
    const nowBrasil = getNowBrasil()
    const currentHour = getCurrentHourBrasil()
    const currentMinute = nowBrasil.getUTCMinutes()
    const currentDayOfWeek = getCurrentDayOfWeekBrasil() // 0 = domingo, 6 = sábado

    // Data de hoje em formato YYYY-MM-DD (Brasil)
    const hojeBrasil = `${nowBrasil.getUTCFullYear()}-${String(nowBrasil.getUTCMonth() + 1).padStart(2, '0')}-${String(nowBrasil.getUTCDate()).padStart(2, '0')}`
    
    console.log(`📅 Data Brasil: ${hojeBrasil}`)
    console.log(`⏰ Hora Brasil: ${currentHour}:${String(currentMinute).padStart(2, '0')}, Dia da semana: ${currentDayOfWeek}`)

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
          const nowUTC = new Date()
          const diffMinutes = (nowUTC.getTime() - scheduledTime.getTime()) / (1000 * 60)
          
          // Disparar se estamos dentro de 10 minutos após o horário agendado (margem maior para cron de 5 min)
          if (diffMinutes >= 0 && diffMinutes <= 10) {
            shouldDispatch = true
            reason = `Agendamento único: ${scheduledTime.toISOString()}`
          } else if (diffMinutes > 10) {
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
        
        // Verificar período de início
        if (campanha.data_inicio) {
          const dataInicio = new Date(campanha.data_inicio + 'T00:00:00')
          const dataInicioStr = campanha.data_inicio
          if (hojeBrasil < dataInicioStr) {
            console.log(`📅 Campanha ${campanha.nome} ainda não iniciou (início: ${dataInicioStr})`)
            results.push({ 
              campaignId: campanha.id, 
              nome: campanha.nome, 
              action: 'not_started' 
            })
            continue
          }
        }
        
        // Verificar período de fim
        if (campanha.data_fim) {
          const dataFimStr = campanha.data_fim
          if (hojeBrasil > dataFimStr) {
            console.log(`📅 Campanha ${campanha.nome} encerrada (fim: ${dataFimStr})`)
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
        
        // Verificar se está dentro da janela de horário INTEIRA (não só os primeiros 5 min)
        if (agoraMinutos >= inicioMinutos && agoraMinutos <= fimMinutos) {
          // Verificar se já disparou hoje usando campo ultimo_disparo_em
          if (campanha.ultimo_disparo_em) {
            const ultimoDisparo = new Date(campanha.ultimo_disparo_em)
            // Converter ultimo disparo para data Brasil
            const BRASIL_OFFSET_MS = -3 * 60 * 60 * 1000
            const ultimoDisparoBrasil = new Date(ultimoDisparo.getTime() + BRASIL_OFFSET_MS)
            const dataUltimoDisparo = `${ultimoDisparoBrasil.getUTCFullYear()}-${String(ultimoDisparoBrasil.getUTCMonth() + 1).padStart(2, '0')}-${String(ultimoDisparoBrasil.getUTCDate()).padStart(2, '0')}`
            
            if (dataUltimoDisparo === hojeBrasil) {
              console.log(`⚠️ Campanha ${campanha.nome} já foi disparada hoje (${dataUltimoDisparo})`)
              results.push({ 
                campaignId: campanha.id, 
                nome: campanha.nome, 
                action: 'already_dispatched_today' 
              })
              continue
            }
          }
          
          // Fallback: verificar dispatches de hoje também
          const startOfDayUTC = getStartOfDayBrasilAsUTC()
          const { data: dispatchesToday } = await supabase
            .from('tendenci_campaign_dispatches')
            .select('id')
            .eq('campaign_id', campanha.id)
            .gte('created_at', startOfDayUTC.toISOString())
          
          if (dispatchesToday && dispatchesToday.length > 0) {
            console.log(`⚠️ Campanha ${campanha.nome} já foi disparada hoje (via dispatches)`)
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
          // Atualizar ultimo_disparo_em ANTES de disparar (para evitar duplicatas se o cron rodar rápido)
          await supabase
            .from('tendenci_prospec_arq_campaigns')
            .update({ 
              ultimo_disparo_em: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', campanha.id)

          // Chamar a edge function execute-campaign-background usando fetch direto (bypass auth)
          const response = await fetch(
            `${supabaseUrl}/functions/v1/execute-campaign-background`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Content-Type': 'application/json',
                'apikey': Deno.env.get('SUPABASE_ANON_KEY') || ''
              },
              body: JSON.stringify({
                campanha_id: campanha.id,
                arquiteto_ids: arquitetosIds,
                from_scheduler: true
              })
            }
          )

          const result = await response.json()

          if (!response.ok || result.error) {
            console.error(`❌ Erro ao disparar campanha ${campanha.nome}:`, result.error)
            await logSystemError(supabase, {
              title: `Erro no agendamento: ${campanha.nome}`,
              module: 'campanhas',
              description: result.error || 'Erro desconhecido',
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

            // Para agendamento único, o status muda para 'enviando' pelo execute-campaign-background
            // Para recorrente, precisamos manter como 'agendado' após conclusão do dispatch
            if (campanha.tipo_agendamento === 'recorrente') {
              // Não precisa fazer nada aqui - o status será restaurado quando o dispatch concluir
              console.log(`📅 Campanha recorrente ${campanha.nome} - status será mantido como 'agendado'`)
            }
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
