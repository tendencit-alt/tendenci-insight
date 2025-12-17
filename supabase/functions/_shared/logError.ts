import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

export interface SystemErrorPayload {
  title: string
  module: string
  description?: string
  severity?: 'low' | 'medium' | 'high' | 'critical'
  source?: 'edge_function' | 'frontend' | 'webhook' | 'manual'
  error_code?: string
  stack_trace?: string
  metadata?: Record<string, unknown>
}

export async function logSystemError(
  supabase: SupabaseClient,
  payload: SystemErrorPayload
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    console.log(`🐛 Logging system error: ${payload.title} (${payload.module})`)
    
    const { data, error } = await supabase
      .from('system_errors')
      .insert([{
        title: payload.title,
        description: payload.description || null,
        module: payload.module,
        severity: payload.severity || 'medium',
        source: payload.source || 'edge_function',
        error_code: payload.error_code || null,
        stack_trace: payload.stack_trace || null,
        metadata: payload.metadata || null,
        status: 'open'
      }])
      .select('id')
      .single()

    if (error) {
      console.error('❌ Failed to log system error:', error.message)
      return { success: false, error: error.message }
    }

    console.log(`✅ System error logged: ${data.id}`)
    return { success: true, id: data.id }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error('❌ Exception logging system error:', errorMessage)
    return { success: false, error: errorMessage }
  }
}
