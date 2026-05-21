import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const q = (t: string) => (supabase as any).from(t);

export function useKnowledgeArticles(category?: string) {
  return useQuery({
    queryKey: ['knowledge-articles', category],
    queryFn: async () => {
      let qb = q('knowledge_articles').select('*').eq('active', true).order('view_count', { ascending: false });
      if (category) qb = qb.eq('category', category);
      const { data } = await qb.limit(200);
      return data || [];
    },
  });
}

export function useGuidedTutorials() {
  return useQuery({
    queryKey: ['guided-tutorials'],
    queryFn: async () => {
      const { data } = await q('guided_tutorials').select('*').eq('active', true).order('created_at');
      return data || [];
    },
  });
}

export function useTutorialProgress() {
  return useQuery({
    queryKey: ['tutorial-progress'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await q('tutorial_progress').select('*').eq('user_id', user.id);
      return data || [];
    },
  });
}

export function useFaqItems(category?: string) {
  return useQuery({
    queryKey: ['faq-items', category],
    queryFn: async () => {
      let qb = q('faq_dynamic_items').select('*').eq('active', true).order('frequency', { ascending: false });
      if (category) qb = qb.eq('category', category);
      const { data } = await qb.limit(100);
      return data || [];
    },
  });
}

export function useDiagnosticRules() {
  return useQuery({
    queryKey: ['diagnostic-rules'],
    queryFn: async () => {
      const { data } = await q('diagnostic_rules').select('*, knowledge_articles(title), guided_tutorials(title)').eq('active', true).order('trigger_count', { ascending: false });
      return data || [];
    },
  });
}

export function useSelfServiceMetrics() {
  return useQuery({
    queryKey: ['self-service-metrics'],
    queryFn: async () => {
      const [{ data: events }, { data: searches }, { data: articles }, { data: tutorials }, { data: progress }] = await Promise.all([
        q('self_service_events').select('resolution_type, module'),
        q('help_search_logs').select('results_count'),
        q('knowledge_articles').select('view_count, helpful_count').eq('active', true),
        q('guided_tutorials').select('id').eq('active', true),
        q('tutorial_progress').select('completed'),
      ]);

      const ev = events || [];
      const totalResolutions = ev.length;
      const byType: Record<string, number> = {};
      ev.forEach((e: any) => { byType[e.resolution_type] = (byType[e.resolution_type] || 0) + 1; });

      const arts = articles || [];
      const totalViews = arts.reduce((s: number, a: any) => s + (a.view_count || 0), 0);
      const totalHelpful = arts.reduce((s: number, a: any) => s + (a.helpful_count || 0), 0);

      const prog = progress || [];
      const completedTutorials = prog.filter((p: any) => p.completed).length;
      const totalProgress = prog.length;

      const srch = searches || [];
      const searchesWithResults = srch.filter((s: any) => s.results_count > 0).length;

      return {
        totalResolutions,
        resolutionsByType: byType,
        totalArticleViews: totalViews,
        totalHelpful,
        totalArticles: arts.length,
        totalTutorials: (tutorials || []).length,
        completedTutorials,
        totalProgress,
        completionRate: totalProgress > 0 ? Math.round((completedTutorials / totalProgress) * 100) : 0,
        totalSearches: srch.length,
        searchSuccessRate: srch.length > 0 ? Math.round((searchesWithResults / srch.length) * 100) : 0,
      };
    },
  });
}

export const KNOWLEDGE_CATEGORIES = [
  'primeiros_passos', 'financeiro', 'dre', 'fluxo_de_caixa',
  'conciliacao_bancaria', 'crm', 'relatorios', 'usuarios',
  'integracoes', 'automacoes',
];

export const CATEGORY_LABELS: Record<string, string> = {
  primeiros_passos: 'Primeiros Passos',
  financeiro: 'Financeiro',
  dre: 'DRE',
  fluxo_de_caixa: 'Fluxo de Caixa',
  conciliacao_bancaria: 'Conciliação Bancária',
  crm: 'CRM',
  relatorios: 'KPI's',
  usuarios: 'Usuários',
  integracoes: 'Integrações',
  automacoes: 'Automações',
};
