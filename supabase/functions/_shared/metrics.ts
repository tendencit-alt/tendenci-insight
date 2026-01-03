// AI Quality Metrics Logger

interface AIMetric {
  phone_number: string;
  model: string;
  response_time_ms: number;
  tokens_used?: number;
  success: boolean;
  error_code?: string;
  fallback_used?: boolean;
  retry_count?: number;
}

export async function logAIMetric(
  supabase: any,
  metric: AIMetric
): Promise<void> {
  try {
    await supabase.from("ia_metrics").insert({
      phone_number: metric.phone_number.slice(-4), // Only last 4 digits for privacy
      model: metric.model,
      response_time_ms: metric.response_time_ms,
      tokens_used: metric.tokens_used,
      success: metric.success,
      error_code: metric.error_code,
      fallback_used: metric.fallback_used || false,
      retry_count: metric.retry_count || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    // Don't fail the main operation if metrics logging fails
    console.warn("Failed to log AI metric:", error);
  }
}

export async function getMetricsSummary(
  supabase: any,
  hours: number = 24
): Promise<{
  total_requests: number;
  success_rate: number;
  avg_response_time: number;
  fallback_rate: number;
  model_distribution: Record<string, number>;
}> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  
  const { data, error } = await supabase
    .from("ia_metrics")
    .select("*")
    .gte("timestamp", since);
  
  if (error || !data || data.length === 0) {
    return {
      total_requests: 0,
      success_rate: 0,
      avg_response_time: 0,
      fallback_rate: 0,
      model_distribution: {}
    };
  }
  
  const total = data.length;
  const successful = data.filter((m: any) => m.success).length;
  const fallbacks = data.filter((m: any) => m.fallback_used).length;
  const totalTime = data.reduce((sum: number, m: any) => sum + (m.response_time_ms || 0), 0);
  
  const modelCounts: Record<string, number> = {};
  data.forEach((m: any) => {
    modelCounts[m.model] = (modelCounts[m.model] || 0) + 1;
  });
  
  return {
    total_requests: total,
    success_rate: (successful / total) * 100,
    avg_response_time: Math.round(totalTime / total),
    fallback_rate: (fallbacks / total) * 100,
    model_distribution: modelCounts
  };
}
