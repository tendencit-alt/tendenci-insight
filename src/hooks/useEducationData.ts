import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const q = (t: string) => (supabase as any).from(t);

export function useEducationTracks() {
  return useQuery({
    queryKey: ['education-tracks'],
    queryFn: async () => {
      const { data } = await q('education_tracks').select('*').eq('active', true).order('created_at');
      return data || [];
    },
  });
}

export function useEducationModules(trackId?: string) {
  return useQuery({
    queryKey: ['education-modules', trackId],
    queryFn: async () => {
      let qb = q('education_modules').select('*').eq('active', true).order('position');
      if (trackId) qb = qb.eq('track_id', trackId);
      const { data } = await qb;
      return data || [];
    },
    enabled: !!trackId || trackId === undefined,
  });
}

export function useEducationProgress() {
  return useQuery({
    queryKey: ['education-progress'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await q('education_progress').select('*').eq('user_id', user.id);
      return data || [];
    },
  });
}

export function useEducationCertifications() {
  return useQuery({
    queryKey: ['education-certifications'],
    queryFn: async () => {
      const { data } = await q('education_certifications').select('*, tenants(name)').order('score', { ascending: false });
      return data || [];
    },
  });
}

export function useEducationRecommendations() {
  return useQuery({
    queryKey: ['education-recommendations'],
    queryFn: async () => {
      const { data } = await q('education_recommendations').select('*, tenants(name), education_tracks(title)').eq('status', 'active').order('created_at', { ascending: false }).limit(100);
      return data || [];
    },
  });
}

export function useEducationMetrics() {
  return useQuery({
    queryKey: ['education-metrics'],
    queryFn: async () => {
      const [{ data: tracks }, { data: progress }, { data: certs }, { data: events }] = await Promise.all([
        q('education_tracks').select('id').eq('active', true),
        q('education_progress').select('completed, track_id'),
        q('education_certifications').select('level, tenant_id'),
        q('education_completion_events').select('event_type'),
      ]);

      const prog = progress || [];
      const completedTracks = prog.filter((p: any) => p.completed).length;
      const startedTracks = prog.length;
      const completionRate = startedTracks > 0 ? Math.round((completedTracks / startedTracks) * 100) : 0;

      const ct = certs || [];
      const levelCounts: Record<string, number> = {};
      ct.forEach((c: any) => { levelCounts[c.level] = (levelCounts[c.level] || 0) + 1; });

      const ev = events || [];
      const eventCounts: Record<string, number> = {};
      ev.forEach((e: any) => { eventCounts[e.event_type] = (eventCounts[e.event_type] || 0) + 1; });

      return {
        totalTracks: (tracks || []).length,
        startedTracks,
        completedTracks,
        completionRate,
        totalCertifications: ct.length,
        levelCounts,
        eventCounts,
      };
    },
  });
}

export const CERTIFICATION_LEVELS = [
  { key: 'iniciado', label: 'ERP Iniciado', color: 'bg-muted text-muted-foreground', minScore: 0 },
  { key: 'operacional', label: 'ERP Operacional', color: 'bg-blue-500/10 text-blue-500', minScore: 20 },
  { key: 'estruturado', label: 'ERP Estruturado', color: 'bg-yellow-500/10 text-yellow-500', minScore: 40 },
  { key: 'gerencial', label: 'ERP Gerencial', color: 'bg-green-500/10 text-green-500', minScore: 70 },
  { key: 'estrategico', label: 'ERP Estratégico', color: 'bg-primary/10 text-primary', minScore: 90 },
];
