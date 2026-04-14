import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ActivationCheck {
  key: string;
  label: string;
  done: boolean;
  weight: number;
  category: 'estrutura' | 'operacional' | 'analitico';
  route: string;
}

interface Recommendation {
  label: string;
  description: string;
  route: string;
  priority: number;
}

const SEGMENT_EXTRA_STEPS: Record<string, { key: string; label: string }[]> = {
  'moveis_planejados': [
    { key: 'producao', label: 'Configurar produção' },
    { key: 'montagem', label: 'Configurar montagem' },
  ],
  'arquitetura': [
    { key: 'projetos', label: 'Configurar projetos' },
  ],
  'industria': [
    { key: 'producao', label: 'Configurar produção' },
  ],
};

export function useActivationScore() {
  return useQuery({
    queryKey: ['activation-score'],
    queryFn: async () => {
      // Parallel queries for activation checks
      const [
        { data: settings },
        { data: bankAccounts },
        { data: chartAccounts },
        { data: costCenters },
        { data: ledger },
        { data: goals },
        { data: importLogs },
        { data: onboardingProgress },
      ] = await Promise.all([
        supabase.from('company_settings').select('id, company_name, onboarding_completed, tax_regime').limit(1).maybeSingle(),
        supabase.from('fin_bank_accounts' as any).select('id').eq('active', true).limit(1),
        supabase.from('fin_chart_accounts' as any).select('id').limit(1),
        supabase.from('fin_cost_centers' as any).select('id').eq('active', true).limit(1),
        supabase.from('fin_ledger_entries' as any).select('id').limit(1),
        supabase.from('fin_goals' as any).select('id').limit(1),
        supabase.from('audit_import_logs').select('id').limit(1),
        supabase.from('onboarding_progress').select('step_key, completed, data'),
      ]);

      const segmento = onboardingProgress?.find((p: any) => p.step_key === 'empresa')?.data?.segmento || '';

      const checks: ActivationCheck[] = [
        { key: 'empresa', label: 'Empresa configurada', done: !!settings?.company_name, weight: 15, category: 'estrutura', route: '/settings' },
        { key: 'contas_bancarias', label: 'Contas bancárias cadastradas', done: !!(bankAccounts as any)?.length, weight: 12, category: 'estrutura', route: '/financeiro' },
        { key: 'plano_contas', label: 'Plano de contas ativo', done: !!(chartAccounts as any)?.length, weight: 12, category: 'estrutura', route: '/financeiro' },
        { key: 'centros_custo', label: 'Centros de custo ativos', done: !!(costCenters as any)?.length, weight: 10, category: 'estrutura', route: '/financeiro' },
        { key: 'lancamentos', label: 'Primeiro lançamento financeiro', done: !!(ledger as any)?.length, weight: 12, category: 'operacional', route: '/financeiro' },
        { key: 'conciliacao', label: 'Primeira conciliação realizada', done: !!(importLogs as any)?.length, weight: 12, category: 'operacional', route: '/financeiro' },
        { key: 'dre', label: 'Primeira DRE gerada', done: !!(ledger as any)?.length, weight: 10, category: 'analitico', route: '/bi-dashboard' },
        { key: 'fluxo_caixa', label: 'Primeiro fluxo de caixa gerado', done: !!(ledger as any)?.length, weight: 7, category: 'analitico', route: '/bi-dashboard' },
        { key: 'metas', label: 'Primeira meta configurada', done: !!(goals as any)?.length, weight: 10, category: 'analitico', route: '/bi-dashboard' },
      ];

      const totalWeight = checks.reduce((s, c) => s + c.weight, 0);
      const doneWeight = checks.filter(c => c.done).reduce((s, c) => s + c.weight, 0);
      const score = Math.round((doneWeight / totalWeight) * 100);

      // Recommendations based on what's not done
      const recommendations: Recommendation[] = [];
      if (!checks.find(c => c.key === 'metas')?.done) {
        recommendations.push({ label: 'Configurar metas', description: 'Defina metas de receita e margem para acompanhar performance', route: '/bi-dashboard', priority: 1 });
      }
      if (!checks.find(c => c.key === 'conciliacao')?.done) {
        recommendations.push({ label: 'Importar extrato bancário', description: 'Importe seu primeiro OFX para conciliação automática', route: '/financeiro', priority: 2 });
      }
      if (checks.find(c => c.key === 'lancamentos')?.done && !checks.find(c => c.key === 'dre')?.done) {
        recommendations.push({ label: 'Classificar despesas pendentes', description: 'Classifique lançamentos para gerar DRE', route: '/financeiro', priority: 3 });
      }
      recommendations.push({ label: 'Ativar forecast financeiro', description: 'Habilite projeções automáticas de resultado', route: '/bi-dashboard', priority: 4 });

      const doneCount = checks.filter(c => c.done).length;
      const totalChecks = checks.length;
      const estimatedMinutesRemaining = (totalChecks - doneCount) * 3;
      const isComplete = score >= 80;

      return {
        checks,
        score,
        doneCount,
        totalChecks,
        recommendations: recommendations.filter(r => !checks.find(c => c.label === r.label)?.done).slice(0, 4),
        estimatedMinutesRemaining,
        isComplete,
        segmento,
        extraSteps: SEGMENT_EXTRA_STEPS[segmento] || [],
        onboardingCompleted: settings?.onboarding_completed || false,
      };
    },
    staleTime: 60000,
  });
}
