import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MessageSquare, Users, Loader2, CheckCircle, XCircle, Clock, AlertCircle, Timer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { DispatchProgressMonitor } from "./DispatchProgressMonitor";

interface DispatchResult {
  type: 'followup' | 'group';
  success: boolean;
  dispatched: number;
  failed: number;
  message: string;
  timestamp: Date;
  source?: 'cron' | 'manual';
}

interface CooldownInfo {
  active: boolean;
  lastDispatch?: { time: string; source: string; type: 'followup' | 'group' };
  minutesRemaining?: number;
}

const COOLDOWN_MINUTES = 30;

export function FollowupDispatchPanel() {
  const [isDispatchingFollowup, setIsDispatchingFollowup] = useState(false);
  const [isDispatchingGroup, setIsDispatchingGroup] = useState(false);
  const [lastResults, setLastResults] = useState<DispatchResult[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showMonitor, setShowMonitor] = useState(false);
  const { toast } = useToast();

  const { data: cooldownInfo, refetch: refetchCooldown } = useQuery({
    queryKey: ['dispatch-cooldown'],
    queryFn: async (): Promise<{ followup: CooldownInfo; group: CooldownInfo }> => {
      const cooldownMinutesAgo = new Date(Date.now() - COOLDOWN_MINUTES * 60 * 1000).toISOString();
      
      const { data: lastFollowup } = await supabase
        .from('followup_logs')
        .select('created_at, source, status')
        .in('status', ['sent', 'pending'])
        .gte('created_at', cooldownMinutesAgo)
        .order('created_at', { ascending: false })
        .limit(1);
      
      const { data: lastGroup } = await supabase
        .from('crm_deals')
        .select('group_invite_sent_at')
        .eq('group_invite_sent', true)
        .gte('group_invite_sent_at', cooldownMinutesAgo)
        .order('group_invite_sent_at', { ascending: false })
        .limit(1);
      
      const followupCooldown: CooldownInfo = { active: false };
      const groupCooldown: CooldownInfo = { active: false };
      
      if (lastFollowup?.[0]) {
        const lastTime = new Date(lastFollowup[0].created_at);
        const minutesRemaining = COOLDOWN_MINUTES - Math.floor((Date.now() - lastTime.getTime()) / 60000);
        if (minutesRemaining > 0) {
          followupCooldown.active = true;
          followupCooldown.minutesRemaining = minutesRemaining;
          followupCooldown.lastDispatch = {
            time: lastTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            source: lastFollowup[0].source || 'cron',
            type: 'followup'
          };
        }
      }
      
      if (lastGroup?.[0]?.group_invite_sent_at) {
        const lastTime = new Date(lastGroup[0].group_invite_sent_at);
        const minutesRemaining = COOLDOWN_MINUTES - Math.floor((Date.now() - lastTime.getTime()) / 60000);
        if (minutesRemaining > 0) {
          groupCooldown.active = true;
          groupCooldown.minutesRemaining = minutesRemaining;
          groupCooldown.lastDispatch = { 
            time: lastTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), 
            source: 'unknown', 
            type: 'group' 
          };
        }
      }
      
      return { followup: followupCooldown, group: groupCooldown };
    },
    refetchInterval: 60000
  });

  const dispatchFollowups = async () => {
    setIsDispatchingFollowup(true);
    setShowMonitor(true);
    try {
      const { data, error } = await supabase.functions.invoke("dispatch-followup", {
        body: { mode: "direct", limit: 10, ignore_business_hours: false, source: "manual" }
      });

      if (error) throw error;

      if (data?.session_id) {
        setActiveSessionId(data.session_id);
      }

      const result: DispatchResult = {
        type: 'followup',
        success: true,
        dispatched: data?.dispatched || 0,
        failed: data?.failed || 0,
        message: data?.message || `${data?.dispatched || 0} follow-ups enviados`,
        timestamp: new Date(),
        source: 'manual'
      };

      setLastResults(prev => [result, ...prev].slice(0, 5));
      refetchCooldown();
      toast({ title: "Follow-ups Disparados", description: result.message });
    } catch (err: any) {
      const errorResult: DispatchResult = {
        type: 'followup',
        success: false,
        dispatched: 0,
        failed: 0,
        message: err.message || "Erro ao disparar follow-ups",
        timestamp: new Date(),
        source: 'manual'
      };
      setLastResults(prev => [errorResult, ...prev].slice(0, 5));
      toast({ title: "Erro", description: err.message, variant: "destructive" });
      setShowMonitor(false);
    } finally {
      setIsDispatchingFollowup(false);
    }
  };

  const dispatchGroupInvites = async () => {
    setIsDispatchingGroup(true);
    setShowMonitor(true);
    try {
      const { data, error } = await supabase.functions.invoke("dispatch-group-invites", {
        body: { limit: 30, ignore_business_hours: false, source: "manual" }
      });

      if (error) throw error;

      if (data?.session_id) {
        setActiveSessionId(data.session_id);
      }

      const result: DispatchResult = {
        type: 'group',
        success: true,
        dispatched: data?.dispatched || 0,
        failed: data?.failed || 0,
        message: data?.message || `${data?.dispatched || 0} convites enviados`,
        timestamp: new Date(),
        source: 'manual'
      };

      setLastResults(prev => [result, ...prev].slice(0, 5));
      refetchCooldown();
      toast({ title: "Convites de Grupo Disparados", description: result.message });
    } catch (err: any) {
      const errorResult: DispatchResult = {
        type: 'group',
        success: false,
        dispatched: 0,
        failed: 0,
        message: err.message || "Erro ao enviar convites",
        timestamp: new Date(),
        source: 'manual'
      };
      setLastResults(prev => [errorResult, ...prev].slice(0, 5));
      toast({ title: "Erro", description: err.message, variant: "destructive" });
      setShowMonitor(false);
    } finally {
      setIsDispatchingGroup(false);
    }
  };

  const formatTime = (date: Date) => date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const handleCloseMonitor = () => {
    setShowMonitor(false);
    setActiveSessionId(null);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Disparo Manual de Follow-ups
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Follow-up */}
            <div className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-blue-500" />
                    Follow-ups I.A.
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Envia mensagens para deals sem resposta há 48h.
                  </p>
                </div>
                <Badge variant="outline" className="text-xs flex-shrink-0">
                  <Clock className="h-3 w-3 mr-1" />48h
                </Badge>
              </div>
              {cooldownInfo?.followup?.active && (
                <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-500/10 px-2 py-1.5 rounded">
                  <Timer className="h-3 w-3" />
                  <span>
                    Último ({cooldownInfo.followup.lastDispatch?.source}) às {cooldownInfo.followup.lastDispatch?.time} • {cooldownInfo.followup.minutesRemaining}min restantes
                  </span>
                </div>
              )}
              <Button onClick={dispatchFollowups} disabled={isDispatchingFollowup} className="w-full">
                {isDispatchingFollowup ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Disparar Follow-ups
                    {cooldownInfo?.followup?.active && <AlertCircle className="h-3 w-3 ml-2 text-amber-500" />}
                  </>
                )}
              </Button>
            </div>

            {/* Grupo */}
            <div className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium flex items-center gap-2">
                    <Users className="h-4 w-4 text-green-500" />
                    Convites de Grupo
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Convites para grupo WhatsApp após 7 dias.
                  </p>
                </div>
                <Badge variant="outline" className="text-xs flex-shrink-0">
                  <Clock className="h-3 w-3 mr-1" />7 dias
                </Badge>
              </div>
              {cooldownInfo?.group?.active && (
                <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-500/10 px-2 py-1.5 rounded">
                  <Timer className="h-3 w-3" />
                  <span>
                    Último às {cooldownInfo.group.lastDispatch?.time} • {cooldownInfo.group.minutesRemaining}min restantes
                  </span>
                </div>
              )}
              <Button onClick={dispatchGroupInvites} disabled={isDispatchingGroup} variant="outline" className="w-full">
                {isDispatchingGroup ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4 mr-2" />
                    Enviar Convites
                    {cooldownInfo?.group?.active && <AlertCircle className="h-3 w-3 ml-2 text-amber-500" />}
                  </>
                )}
              </Button>
            </div>
          </div>

          {lastResults.length > 0 && (
            <div className="border-t pt-4 space-y-2">
              <h5 className="text-sm font-medium">Últimos Disparos</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {lastResults.map((result, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-2 rounded text-sm ${
                      result.success ? 'bg-green-500/10' : 'bg-destructive/10'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                      <span className="text-xs font-medium">
                        {result.type === 'followup' ? 'Follow-up' : 'Grupo'}
                      </span>
                      {result.source === 'manual' && (
                        <Badge variant="secondary" className="text-[10px] px-1 py-0">manual</Badge>
                      )}
                      <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                        {result.message}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {formatTime(result.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded text-center">
            ⏰ <strong>Horário comercial:</strong> 9h às 18h (Seg-Sex).
          </div>
        </CardContent>
      </Card>

      {/* Modal de Progresso */}
      <Dialog open={showMonitor} onOpenChange={setShowMonitor}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Acompanhamento do Disparo</DialogTitle>
          </DialogHeader>
          <DispatchProgressMonitor sessionId={activeSessionId} onClose={handleCloseMonitor} />
        </DialogContent>
      </Dialog>
    </>
  );
}
