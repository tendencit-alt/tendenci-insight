import { useQuery } from '@tanstack/react-query';
import { auditStub } from "@/lib/audit-stub";
import { supabase } from '@/integrations/supabase/client';

// ── Types ──

export interface ActivationCheck {
  key: string;
  label: string;
  done: boolean;
  weight: number;
  category: 'estrutura' | 'operacional' | 'analitico';
  route: string;
  completedAt?: string | null;
}

export interface Recommendation {
  label: string;
  description: string;
  route: string;
  priority: number;
}

export type ReliabilityLevel = 'alta' | 'media' | 'baixa';
export type AbandonmentRisk = 'baixo' | 'medio' | 'alto' | 'critico';

export interface ReliabilityScore {
  level: ReliabilityLevel;
  score: number;
  factors: { label: string; value: number; weight: number }[];
}

export interface ActivationTimeline {
  key: string;
  label: string;
  date: string | null;
}

export interface ActivationIntelligence {
  // Basic activation
  checks: ActivationCheck[];
  score: number;
  doneCount: number;
  totalChecks: number;
  recommendations: Recommendation[];
  estimatedMinutesRemaining: number;
  isComplete: boolean;
  segmento: string;
  extraSteps: { key: string; label: string }[];
  onboardingCompleted: boolean;

  // Reliability scores
  dreReliability: ReliabilityScore;
  cashFlowReliability: ReliabilityScore;

  // Risk & timeline
  abandonmentRisk: AbandonmentRisk;
  abandonmentReasons: string[];
  timeline: ActivationTimeline[];

  // Ready for management
  readyForManagement: boolean;
}

// ── Helpers ──

const SEGMENT_EXTRA_STEPS: Record<string, { key: string; label: string }[]> = {
  moveis_planejados: [
    { key: 'producao', label: 'Configurar produção' },
    { key: 'montagem', label: 'Configurar montagem' },
  ],
  arquitetura: [{ key: 'projetos', label: 'Configurar projetos' }],
  industria: [{ key: 'producao', label: 'Configurar produção' }],
};

function classifyReliability(score: number): ReliabilityLevel {
  if (score >= 75) return 'alta';
  if (score >= 45) return 'media';
  return 'baixa';
}

function classifyAbandonmentRisk(
  score: number,
  daysSinceCreation: number,
  hasRecentActivity: boolean
): { risk: AbandonmentRisk; reasons: string[] } {
  const reasons: string[] = [];

  if (daysSinceCreation > 30 && score < 30) {
    reasons.push('Score de ativação muito baixo após 30 dias');
  }
  if (daysSinceCreation > 14 && !hasRecentActivity) {
    reasons.push('Sem atividade nos últimos 14 dias');
  }
  if (score < 20) {
    reasons.push('Estrutura financeira mínima não configurada');
  }

  if (reasons.length >= 2 || (daysSinceCreation > 30 && score < 20)) return { risk: 'critico', reasons };
  if (reasons.length >= 1) return { risk: 'alto', reasons };
  if (daysSinceCreation > 14 && score < 50) return { risk: 'medio', reasons: ['Ativação abaixo de 50% após 14 dias'] };
  return { risk: 'baixo', reasons: [] };
}

// ── Main Hook ──

export function useActivationScore() {
  return useQuery({
    queryKey: ['activation-score'],
    queryFn: async (): Promise<ActivationIntelligence> => {
      const [
        { data: settings },
        { data: bankAccounts },
        { data: chartAccounts },
        { data: costCenters },
        { data: ledger },
        { data: goals },
        { data: importLogs },
        { data: onboardingProgress },
        { data: classifiedEntries },
        { data: reconciledEntries },
        { data: totalEntries },
        { data: autoEntries },
        { data: receivables },
        { data: payables },
      ] = await Promise.all([
        supabase.from('company_settings').select('id, company_name, onboarding_completed, tax_regime, created_at').limit(1).maybeSingle(),
        supabase.from('fin_bank_accounts' as any).select('id').eq('active', true).limit(1),
        supabase.from('fin_chart_accounts' as any).select('id').limit(1),
        supabase.from('fin_cost_centers' as any).select('id').eq('active', true).limit(1),
        supabase.from('fin_ledger_entries' as any).select('id').limit(1),
        supabase.from('fin_goals' as any).select('id').limit(1),auditStub().select('id').limit(1),
        supabase.from('onboarding_progress').select('step_key, completed, data'),
        // For reliability: classified entries (have chart_account_id)
        supabase.from('fin_ledger_entries' as any).select('id', { count: 'exact', head: true }).not('chart_account_id', 'is', null),
        // Reconciled entries
        supabase.from('fin_ledger_entries' as any).select('id', { count: 'exact', head: true }).eq('status', 'CONCILIADO'),
        // Total entries
        supabase.from('fin_ledger_entries' as any).select('id', { count: 'exact', head: true }),
        // Auto-classified entries
        supabase.from('fin_ledger_entries' as any).select('id', { count: 'exact', head: true }).not('classification_source', 'is', null),
        // Receivables for cash flow reliability
        supabase.from('fin_receivables' as any).select('id', { count: 'exact', head: true }),
        supabase.from('fin_payables' as any).select('id', { count: 'exact', head: true }),
      ]);

      const segmento = (onboardingProgress?.find((p: any) => p.step_key === 'empresa')?.data as any)?.segmento || '';

      // ── Activation checks ──
      const hasLedger = !!(ledger as any)?.length;
      const hasImports = !!(importLogs as any)?.length;
      const hasGoals = !!(goals as any)?.length;

      const checks: ActivationCheck[] = [
        { key: 'empresa', label: 'Empresa configurada', done: !!settings?.company_name, weight: 15, category: 'estrutura', route: '/settings' },
        { key: 'contas_bancarias', label: 'Contas bancárias cadastradas', done: !!(bankAccounts as any)?.length, weight: 12, category: 'estrutura', route: '/financeiro' },
        { key: 'plano_contas', label: 'Plano de contas ativo', done: !!(chartAccounts as any)?.length, weight: 12, category: 'estrutura', route: '/financeiro' },
        { key: 'centros_custo', label: 'Centros de custo ativos', done: !!(costCenters as any)?.length, weight: 10, category: 'estrutura', route: '/financeiro' },
        { key: 'extrato_importado', label: 'Extrato bancário importado', done: hasImports, weight: 10, category: 'operacional', route: '/financeiro' },
        { key: 'categorias_classificadas', label: 'Categorias classificadas', done: (classifiedEntries as any) > 0, weight: 8, category: 'operacional', route: '/financeiro' },
        { key: 'conciliacao', label: 'Primeira conciliação realizada', done: (reconciledEntries as any) > 0, weight: 10, category: 'operacional', route: '/financeiro' },
        { key: 'dre', label: 'Primeira DRE válida', done: hasLedger && (classifiedEntries as any) > 0, weight: 8, category: 'analitico', route: '/bi-dashboard' },
        { key: 'fluxo_caixa', label: 'Primeiro fluxo de caixa válido', done: hasLedger, weight: 7, category: 'analitico', route: '/bi-dashboard' },
        { key: 'metas', label: 'Primeira meta criada', done: hasGoals, weight: 8, category: 'analitico', route: '/bi-dashboard' },
      ];

      const totalWeight = checks.reduce((s, c) => s + c.weight, 0);
      const doneWeight = checks.filter(c => c.done).reduce((s, c) => s + c.weight, 0);
      const score = Math.round((doneWeight / totalWeight) * 100);

      // ── Recommendations ──
      const recommendations: Recommendation[] = [];
      if (!hasImports) {
        recommendations.push({ label: 'Importar extrato bancário', description: 'Importe seu primeiro OFX para conciliação automática', route: '/financeiro', priority: 1 });
      }
      if (hasLedger && (classifiedEntries as any) === 0) {
        recommendations.push({ label: 'Classificar despesas pendentes', description: 'Classifique lançamentos para gerar DRE válida', route: '/financeiro', priority: 2 });
      }
      if (!hasGoals) {
        recommendations.push({ label: 'Configurar metas financeiras', description: 'Defina metas de receita e margem para acompanhar performance', route: '/bi-dashboard', priority: 3 });
      }
      if (score >= 60) {
        recommendations.push({ label: 'Ativar forecast financeiro', description: 'Habilite projeções automáticas de resultado', route: '/bi-dashboard', priority: 4 });
      }

      // ── DRE Reliability ──
      const total = (totalEntries as any) || 0;
      const classified = (classifiedEntries as any) || 0;
      const reconciled = (reconciledEntries as any) || 0;
      const auto = (autoEntries as any) || 0;

      const classificationRate = total > 0 ? Math.round((classified / total) * 100) : 0;
      const reconciliationRate = total > 0 ? Math.round((reconciled / total) * 100) : 0;
      const automationRate = total > 0 ? Math.round((auto / total) * 100) : 0;

      const dreScore = Math.round(classificationRate * 0.5 + reconciliationRate * 0.3 + automationRate * 0.2);
      const dreReliability: ReliabilityScore = {
        level: classifyReliability(dreScore),
        score: dreScore,
        factors: [
          { label: 'Classificações corretas', value: classificationRate, weight: 50 },
          { label: 'Lançamentos conciliados', value: reconciliationRate, weight: 30 },
          { label: 'Lançamentos automáticos', value: automationRate, weight: 20 },
        ],
      };

      // ── Cash Flow Reliability ──
      const hasReceivables = ((receivables as any) || 0) > 0;
      const hasPayables = ((payables as any) || 0) > 0;
      const futureReliable = hasReceivables || hasPayables ? 80 : 0;
      const conciliationActive = reconciliationRate > 0 ? Math.min(reconciliationRate, 100) : 0;

      const cfScore = Math.round(futureReliable * 0.4 + conciliationActive * 0.35 + classificationRate * 0.25);
      const cashFlowReliability: ReliabilityScore = {
        level: classifyReliability(cfScore),
        score: cfScore,
        factors: [
          { label: 'Previsões futuras confiáveis', value: futureReliable, weight: 40 },
          { label: 'Conciliação ativa', value: conciliationActive, weight: 35 },
          { label: 'Classificação financeira completa', value: classificationRate, weight: 25 },
        ],
      };

      // ── Timeline ──
      const timeline: ActivationTimeline[] = [
        { key: 'criacao', label: 'Empresa criada', date: settings?.created_at || null },
        { key: 'contas', label: 'Contas bancárias cadastradas', date: !!(bankAccounts as any)?.length ? 'done' : null },
        { key: 'extrato', label: 'Extrato importado', date: hasImports ? 'done' : null },
        { key: 'dre', label: 'Primeira DRE válida', date: hasLedger && classified > 0 ? 'done' : null },
        { key: 'metas', label: 'Primeira meta criada', date: hasGoals ? 'done' : null },
      ];

      // ── Abandonment risk ──
      const daysSinceCreation = settings?.created_at
        ? Math.floor((Date.now() - new Date(settings.created_at).getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      const hasRecentActivity = hasLedger || hasImports;
      const { risk: abandonmentRisk, reasons: abandonmentReasons } = classifyAbandonmentRisk(score, daysSinceCreation, hasRecentActivity);

      // ── Ready for management ──
      const readyForManagement =
        dreReliability.level !== 'baixa' &&
        cashFlowReliability.level !== 'baixa' &&
        hasGoals &&
        reconciled > 0;

      const doneCount = checks.filter(c => c.done).length;
      const totalChecks = checks.length;

      return {
        checks,
        score,
        doneCount,
        totalChecks,
        recommendations: recommendations.slice(0, 4),
        estimatedMinutesRemaining: (totalChecks - doneCount) * 3,
        isComplete: score >= 80,
        segmento,
        extraSteps: SEGMENT_EXTRA_STEPS[segmento] || [],
        onboardingCompleted: settings?.onboarding_completed || false,
        dreReliability,
        cashFlowReliability,
        abandonmentRisk,
        abandonmentReasons,
        timeline,
        readyForManagement,
      };
    },
    staleTime: 60000,
  });
}
