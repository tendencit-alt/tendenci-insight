import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ExternalLink, Send, MessageCircle, ArrowRight, AlertTriangle, Users } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { isTodayBrasil, isYesterdayBrasil } from "@/utils/taskTimezone";
import { useToast } from "@/hooks/use-toast";

// Formatar data/hora de forma inteligente - com timezone de Brasília
const formatEventTime = (timestamp: string) => {
  const date = new Date(timestamp);
  // Formatar hora em Brasília
  const timeStr = date.toLocaleTimeString('pt-BR', { 
    timeZone: 'America/Sao_Paulo', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  if (isTodayBrasil(timestamp)) {
    return `Hoje ${timeStr}`;
  }
  if (isYesterdayBrasil(timestamp)) {
    return `Ontem ${timeStr}`;
  }
  // Formatar data completa em Brasília
  return date.toLocaleDateString('pt-BR', { 
    timeZone: 'America/Sao_Paulo', 
    day: '2-digit', 
    month: '2-digit' 
  }) + ' ' + timeStr;
};

interface FollowupEvent {
  id: string;
  type: "sent" | "response" | "moved" | "failed" | "group_invite";
  timestamp: string;
  dealId: string;
  dealTitle: string;
  message: string;
  followupNumber?: number;
  errorMessage?: string;
}

interface FollowupActivityFeedProps {
  isRealtime?: boolean;
}

export function FollowupActivityFeed({ isRealtime = true }: FollowupActivityFeedProps) {
  const [events, setEvents] = useState<FollowupEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchEvents = async () => {
    try {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Buscar stage de Follow Up com pipeline_id
      const { data: followupStage } = await supabase
        .from("crm_stages")
        .select("id, pipeline_id")
        .eq("name", "Follow Up (I.A)")
        .single();

      if (!followupStage) {
        console.error("Stage 'Follow Up (I.A)' não encontrado");
        setLoading(false);
        return;
      }

      // Buscar Lead do MESMO pipeline para evitar duplicatas
      const { data: leadStage } = await supabase
        .from("crm_stages")
        .select("id")
        .eq("name", "Lead")
        .eq("pipeline_id", followupStage.pipeline_id)
        .single();

      // 1. Follow-up logs (enviados e falhas)
      const { data: followupLogs } = await supabase
        .from("followup_logs")
        .select(`
          id,
          deal_id,
          status,
          followup_number,
          sent_at,
          created_at,
          error_message,
          crm_deals!inner(title)
        `)
        .gte("created_at", weekAgo)
        .order("created_at", { ascending: false })
        .limit(100);

      // 2. Mudanças de stage (Follow Up -> Lead)
      const { data: stageChanges } = await supabase
        .from("crm_deal_history")
        .select(`
          id,
          deal_id,
          moved_at,
          crm_deals!inner(title)
        `)
        .eq("from_stage_id", followupStage?.id || "")
        .eq("to_stage_id", leadStage?.id || "")
        .gte("moved_at", weekAgo)
        .order("moved_at", { ascending: false })
        .limit(50);

      // 3. Convites de grupo enviados (buscar diretamente de crm_deals)
      const { data: groupInviteDeals } = await supabase
        .from("crm_deals")
        .select("id, title, group_invite_sent_at")
        .eq("group_invite_sent", true)
        .not("group_invite_sent_at", "is", null)
        .gte("group_invite_sent_at", weekAgo)
        .order("group_invite_sent_at", { ascending: false })
        .limit(30);

      // Mapear eventos
      const allEvents: FollowupEvent[] = [];

      followupLogs?.forEach((log: any) => {
        allEvents.push({
          id: log.id,
          type: log.status === "sent" ? "sent" : "failed",
          timestamp: log.sent_at || log.created_at,
          dealId: log.deal_id,
          dealTitle: log.crm_deals?.title || "Deal desconhecido",
          message: log.status === "sent" 
            ? `Follow-up #${log.followup_number} enviado` 
            : `Follow-up falhou: ${log.error_message || "Erro desconhecido"}`,
          followupNumber: log.followup_number,
          errorMessage: log.error_message,
        });
      });

      stageChanges?.forEach((change: any) => {
        allEvents.push({
          id: change.id,
          type: "moved",
          timestamp: change.moved_at,
          dealId: change.deal_id,
          dealTitle: change.crm_deals?.title || "Deal desconhecido",
          message: "Cliente respondeu - Movido para Lead",
        });
      });

      groupInviteDeals?.forEach((deal: any) => {
        allEvents.push({
          id: `group-${deal.id}`,
          type: "group_invite",
          timestamp: deal.group_invite_sent_at,
          dealId: deal.id,
          dealTitle: deal.title || "Deal desconhecido",
          message: "Convite de grupo WhatsApp enviado",
        });
      });

      // Ordenar por timestamp
      allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setEvents(allEvents.slice(0, 100));
    } catch (error) {
      console.error("Erro ao buscar eventos de follow-up:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Realtime subscription
  useEffect(() => {
    if (!isRealtime) return;

    const channel = supabase
      .channel("followup-activity-feed")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "followup_logs",
        },
        async (payload) => {
          const log = payload.new as any;
          
          // Buscar título do deal
          const { data: deal } = await supabase
            .from("crm_deals")
            .select("title")
            .eq("id", log.deal_id)
            .single();

          const newEvent: FollowupEvent = {
            id: log.id,
            type: log.status === "sent" ? "sent" : "failed",
            timestamp: log.sent_at || log.created_at,
            dealId: log.deal_id,
            dealTitle: deal?.title || "Deal desconhecido",
            message: log.status === "sent" 
              ? `Follow-up #${log.followup_number} enviado` 
              : `Follow-up falhou: ${log.error_message || "Erro desconhecido"}`,
            followupNumber: log.followup_number,
            errorMessage: log.error_message,
          };

          setEvents((prev) => [newEvent, ...prev].slice(0, 100));

          toast({
            title: log.status === "sent" ? "Follow-up enviado" : "Follow-up falhou",
            description: `${deal?.title}: ${newEvent.message}`,
            variant: log.status === "sent" ? "default" : "destructive",
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "crm_deal_history",
          filter: "action_type=eq.stage_change",
        },
        async (payload) => {
          const history = payload.new as any;
          
          // Verificar se é mudança Follow Up -> Lead
          const { data: fromStage } = await supabase
            .from("crm_stages")
            .select("name")
            .eq("id", history.from_stage_id)
            .single();

          const { data: toStage } = await supabase
            .from("crm_stages")
            .select("name")
            .eq("id", history.to_stage_id)
            .single();

          if (fromStage?.name === "Follow Up (I.A)" && toStage?.name === "Lead") {
            const { data: deal } = await supabase
              .from("crm_deals")
              .select("title")
              .eq("id", history.deal_id)
              .single();

            const newEvent: FollowupEvent = {
              id: history.id,
              type: "moved",
              timestamp: history.moved_at || history.created_at,
              dealId: history.deal_id,
              dealTitle: deal?.title || "Deal desconhecido",
              message: "Cliente respondeu - Movido para Lead",
            };

            setEvents((prev) => [newEvent, ...prev].slice(0, 100));

            toast({
              title: "Cliente respondeu!",
              description: `${deal?.title} foi movido para Lead`,
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "crm_deals",
        },
        async (payload) => {
          const deal = payload.new as any;
          const oldDeal = payload.old as any;
          
          // Verificar se é uma nova atualização de convite de grupo
          if (deal.group_invite_sent && deal.group_invite_sent_at && !oldDeal.group_invite_sent) {
            const newEvent: FollowupEvent = {
              id: `group-${deal.id}`,
              type: "group_invite",
              timestamp: deal.group_invite_sent_at,
              dealId: deal.id,
              dealTitle: deal.title || "Deal desconhecido",
              message: "Convite de grupo WhatsApp enviado",
            };

            setEvents((prev) => {
              // Evitar duplicatas
              if (prev.some(e => e.id === newEvent.id)) return prev;
              return [newEvent, ...prev].slice(0, 100);
            });

            toast({
              title: "Convite de grupo enviado!",
              description: deal.title,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isRealtime, toast]);

  const getEventConfig = (type: FollowupEvent["type"]) => {
    switch (type) {
      case "sent":
        return {
          icon: Send,
          color: "text-green-500",
          bgColor: "bg-green-500/10",
          badgeVariant: "default" as const,
          badgeClass: "bg-green-500",
        };
      case "response":
        return {
          icon: MessageCircle,
          color: "text-blue-500",
          bgColor: "bg-blue-500/10",
          badgeVariant: "default" as const,
          badgeClass: "bg-blue-500",
        };
      case "moved":
        return {
          icon: ArrowRight,
          color: "text-purple-500",
          bgColor: "bg-purple-500/10",
          badgeVariant: "default" as const,
          badgeClass: "bg-purple-500",
        };
      case "failed":
        return {
          icon: AlertTriangle,
          color: "text-red-500",
          bgColor: "bg-red-500/10",
          badgeVariant: "destructive" as const,
          badgeClass: "bg-red-500",
        };
      case "group_invite":
        return {
          icon: Users,
          color: "text-cyan-500",
          bgColor: "bg-cyan-500/10",
          badgeVariant: "default" as const,
          badgeClass: "bg-cyan-500",
        };
      default:
        return {
          icon: Send,
          color: "text-muted-foreground",
          bgColor: "bg-muted/10",
          badgeVariant: "secondary" as const,
          badgeClass: "bg-muted",
        };
    }
  };

  const getEventLabel = (type: FollowupEvent["type"]) => {
    switch (type) {
      case "sent": return "Enviado";
      case "response": return "Respondeu";
      case "moved": return "Movido";
      case "failed": return "Falha";
      case "group_invite": return "Convite";
      default: return "Evento";
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="h-3 w-[150px]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma atividade de follow-up nos últimos 7 dias
      </div>
    );
  }

  return (
    <TooltipProvider>
      <ScrollArea className="h-[400px]">
        <div className="space-y-2">
          {events.map((event) => {
            const config = getEventConfig(event.type);
            const Icon = config.icon;

            return (
              <div
                key={event.id}
                className={`flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors ${
                  event.type === "failed" ? "border border-destructive/30 bg-destructive/5" : ""
                }`}
              >
                <div className={`p-2 rounded-full ${config.bgColor} shrink-0 mt-0.5`}>
                  <Icon className={`h-4 w-4 ${config.color}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={config.badgeClass}>
                      {getEventLabel(event.type)}
                    </Badge>
                    <span className="font-medium truncate">{event.dealTitle}</span>
                    <span className="text-xs text-muted-foreground ml-auto shrink-0">
                      {formatEventTime(event.timestamp)}
                    </span>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mt-1">
                    {event.type === "failed" 
                      ? `Follow-up #${event.followupNumber} falhou`
                      : event.message
                    }
                  </p>

                  {/* Mostrar motivo do erro para falhas */}
                  {event.type === "failed" && event.errorMessage && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1.5 mt-2 p-2 rounded bg-destructive/10 border border-destructive/20 cursor-help">
                          <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
                          <span className="text-xs text-destructive font-medium truncate">
                            {event.errorMessage}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[400px]">
                        <p className="text-sm font-medium mb-1">Motivo do erro:</p>
                        <p className="text-sm">{event.errorMessage}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => window.open(`/crm?deal=${event.dealId}`, "_blank")}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </TooltipProvider>
  );
}
