import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, X, Settings, RefreshCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface AutomationFailure {
  id: string;
  title: string;
  message: string;
  link: string | null;
  created_at: string;
  metadata: {
    task_id?: string;
    error_type?: string;
    instance_name?: string;
    deal_title?: string;
  } | null;
}

export function AutomationFailureAlert() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dismissed, setDismissed] = useState(false);

  const { data: failures, refetch } = useQuery({
    queryKey: ['automation-failures', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'automation_failure')
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) {
        console.error('Erro ao buscar falhas de automação:', error);
        return [];
      }
      
      return (data || []) as AutomationFailure[];
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Verificar a cada 30 segundos
  });

  // Realtime subscription para alertas instantâneos
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('automation-failures-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const notification = payload.new as any;
          if (notification.type === 'automation_failure') {
            // Toast instantâneo
            toast.error(`⚠️ ${notification.title}`, {
              description: notification.message,
              duration: 10000,
            });
            // Refetch para atualizar lista
            refetch();
            setDismissed(false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refetch]);

  const handleDismissAll = async () => {
    if (!user?.id || !failures?.length) return;
    
    const ids = failures.map(f => f.id);
    
    await supabase
      .from('notifications')
      .update({ read: true })
      .in('id', ids);
    
    setDismissed(true);
    queryClient.invalidateQueries({ queryKey: ['automation-failures'] });
    toast.success('Alertas dispensados');
  };

  const handleGoToSettings = () => {
    navigate('/configuracoes');
  };

  const getErrorIcon = (errorType?: string) => {
    switch (errorType) {
      case 'whatsapp_offline':
        return '📱';
      case 'invalid_phone':
        return '📞';
      case 'api_error':
        return '🔌';
      case 'missing_client':
        return '👤';
      default:
        return '⚠️';
    }
  };

  if (dismissed || !failures || failures.length === 0) {
    return null;
  }

  return (
    <Card className="border-destructive bg-destructive/10 animate-pulse">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Falhas de Automação ({failures.length})
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive hover:text-destructive/80"
            onClick={() => setDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {failures.map((failure) => (
            <div
              key={failure.id}
              className="flex items-start gap-2 p-2 rounded bg-background/50 text-xs"
            >
              <span className="text-base">
                {getErrorIcon(failure.metadata?.error_type)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">
                  {failure.metadata?.deal_title || 'Tarefa Automatizada'}
                </p>
                <p className="text-muted-foreground line-clamp-2">
                  {failure.message}
                </p>
                {failure.metadata?.instance_name && (
                  <Badge variant="outline" className="mt-1 text-[10px]">
                    {failure.metadata.instance_name}
                  </Badge>
                )}
              </div>
              {failure.link && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px]"
                  onClick={() => navigate(failure.link!)}
                >
                  Ver
                </Button>
              )}
            </div>
          ))}
        </div>
        
        <div className="flex items-center gap-2 mt-3 pt-3 border-t">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs flex-1"
            onClick={handleGoToSettings}
          >
            <Settings className="h-3 w-3 mr-1" />
            Configurações WhatsApp
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={handleDismissAll}
          >
            Dispensar Todos
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => refetch()}
          >
            <RefreshCcw className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}