import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface DispatchSession {
  id: string;
  type: 'followup' | 'group_invite';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  source: string;
  total_leads: number;
  processed: number;
  success_count: number;
  failed_count: number;
  skipped_count: number;
  started_at: string;
  completed_at: string | null;
  estimated_duration_seconds: number | null;
  avg_time_per_lead_ms: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface DispatchSessionItem {
  id: string;
  session_id: string;
  deal_id: string;
  client_name: string;
  client_phone: string | null;
  followup_number: number | null;
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'skipped';
  error_message: string | null;
  processing_started_at: string | null;
  processed_at: string | null;
  created_at: string;
}

interface UseDispatchRealtimeOptions {
  sessionId?: string;
  onSessionUpdate?: (session: DispatchSession) => void;
  onItemUpdate?: (item: DispatchSessionItem) => void;
  onComplete?: (session: DispatchSession) => void;
}

export function useDispatchRealtime(options: UseDispatchRealtimeOptions = {}) {
  const { sessionId, onSessionUpdate, onItemUpdate, onComplete } = options;
  
  const [session, setSession] = useState<DispatchSession | null>(null);
  const [items, setItems] = useState<DispatchSessionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calcular estatísticas derivadas
  const stats = {
    progress: session ? Math.round((session.processed / Math.max(session.total_leads, 1)) * 100) : 0,
    estimatedTimeRemaining: session && session.avg_time_per_lead_ms && session.total_leads > session.processed
      ? Math.ceil(((session.total_leads - session.processed) * session.avg_time_per_lead_ms) / 1000)
      : null,
    isRunning: session?.status === 'running',
    isComplete: session?.status === 'completed' || session?.status === 'failed' || session?.status === 'cancelled',
  };

  // Carregar sessão inicial
  const loadSession = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Carregar sessão
      const { data: sessionData, error: sessionError } = await supabase
        .from('dispatch_sessions')
        .select('*')
        .eq('id', id)
        .single();
      
      if (sessionError) throw sessionError;
      setSession(sessionData as DispatchSession);
      
      // Carregar itens
      const { data: itemsData, error: itemsError } = await supabase
        .from('dispatch_session_items')
        .select('*')
        .eq('session_id', id)
        .order('created_at', { ascending: true });
      
      if (itemsError) throw itemsError;
      setItems(itemsData as DispatchSessionItem[]);
      
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar sessão';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Buscar sessão ativa mais recente
  const findActiveSession = useCallback(async (type?: 'followup' | 'group_invite') => {
    setIsLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('dispatch_sessions')
        .select('*')
        .eq('status', 'running')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (type) {
        query = query.eq('type', type);
      }
      
      const { data, error: queryError } = await query;
      
      if (queryError) throw queryError;
      
      if (data && data.length > 0) {
        setSession(data[0] as DispatchSession);
        await loadSession(data[0].id);
        return data[0] as DispatchSession;
      }
      
      return null;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar sessão ativa';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [loadSession]);

  // Configurar subscriptions realtime
  useEffect(() => {
    if (!sessionId) return;

    const channels: RealtimeChannel[] = [];

    // Subscription para sessão
    const sessionChannel = supabase
      .channel(`dispatch-session-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'dispatch_sessions',
          filter: `id=eq.${sessionId}`
        },
        (payload) => {
          const updatedSession = payload.new as DispatchSession;
          setSession(updatedSession);
          onSessionUpdate?.(updatedSession);
          
          if (updatedSession.status === 'completed' || updatedSession.status === 'failed') {
            onComplete?.(updatedSession);
          }
        }
      )
      .subscribe();
    
    channels.push(sessionChannel);

    // Subscription para itens
    const itemsChannel = supabase
      .channel(`dispatch-items-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dispatch_session_items',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          const newItem = payload.new as DispatchSessionItem;
          setItems(prev => [...prev, newItem]);
          onItemUpdate?.(newItem);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'dispatch_session_items',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          const updatedItem = payload.new as DispatchSessionItem;
          setItems(prev => prev.map(item => 
            item.id === updatedItem.id ? updatedItem : item
          ));
          onItemUpdate?.(updatedItem);
        }
      )
      .subscribe();
    
    channels.push(itemsChannel);

    // Carregar dados iniciais
    loadSession(sessionId);

    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [sessionId, loadSession, onSessionUpdate, onItemUpdate, onComplete]);

  // Limpar estado
  const reset = useCallback(() => {
    setSession(null);
    setItems([]);
    setError(null);
  }, []);

  return {
    session,
    items,
    stats,
    isLoading,
    error,
    loadSession,
    findActiveSession,
    reset,
  };
}
