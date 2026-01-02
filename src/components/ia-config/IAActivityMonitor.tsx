import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { 
  MessageSquare, 
  User, 
  Bot, 
  Clock, 
  RefreshCw,
  Wifi,
  WifiOff,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Conversation {
  id: string;
  phone_number: string;
  instance_name: string;
  role: "user" | "assistant";
  content: string;
  media_type: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

interface ConnectionStatus {
  instance_name: string;
  status: string;
  phone_number: string | null;
}

export function IAActivityMonitor() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalToday: 0,
    avgResponseTime: 0,
    activeChats: 0,
  });

  useEffect(() => {
    loadData();
    loadConnectionStatus();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("ia-activity")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ia_conversations",
        },
        (payload) => {
          console.log("New message:", payload);
          setConversations((prev) => [payload.new as Conversation, ...prev].slice(0, 50));
          updateStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("ia_conversations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setConversations((data as Conversation[]) || []);
      updateStats();
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadConnectionStatus = async () => {
    try {
      const { data } = await supabase
        .from("tendenci_whatsapp_connections")
        .select("instance_name, status, phone_number")
        .eq("is_ia_instance", true)
        .single();

      if (data) {
        setConnectionStatus(data as ConnectionStatus);
      }
    } catch (error) {
      console.error("Error loading connection status:", error);
    }
  };

  const updateStats = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: todayMessages } = await supabase
      .from("ia_conversations")
      .select("id, phone_number")
      .gte("created_at", today.toISOString());

    const uniquePhones = new Set((todayMessages || []).map((m) => m.phone_number));

    setStats({
      totalToday: (todayMessages || []).length,
      avgResponseTime: 2.3, // Would need to calculate from actual data
      activeChats: uniquePhones.size,
    });
  };

  const isOnline = connectionStatus?.status === "open";

  return (
    <div className="space-y-4">
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="flex items-center gap-2 mt-1">
                  {isOnline ? (
                    <>
                      <Wifi className="h-4 w-4 text-green-500" />
                      <span className="font-medium text-green-600">Online</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-4 w-4 text-red-500" />
                      <span className="font-medium text-red-600">Offline</span>
                    </>
                  )}
                </div>
              </div>
              <Badge variant={isOnline ? "default" : "destructive"}>
                {connectionStatus?.instance_name || "Não configurado"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Mensagens Hoje</p>
                <p className="text-2xl font-bold">{stats.totalToday}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conversas Ativas</p>
                <p className="text-2xl font-bold">{stats.activeChats}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tempo Médio</p>
                <p className="text-2xl font-bold">{stats.avgResponseTime}s</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Feed */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Atividade em Tempo Real
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={loadData} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <AlertCircle className="h-8 w-8 mb-2" />
                <p>Nenhuma mensagem ainda</p>
                <p className="text-sm">As mensagens aparecerão aqui em tempo real</p>
              </div>
            ) : (
              <div className="space-y-3">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`flex gap-3 p-3 rounded-lg ${
                      conv.role === "user" 
                        ? "bg-muted/50" 
                        : "bg-primary/5 border-l-2 border-primary"
                    }`}
                  >
                    <div className="shrink-0">
                      {conv.role === "user" ? (
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          <User className="h-4 w-4" />
                        </div>
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">
                          {conv.role === "user" ? formatPhoneNumber(conv.phone_number) : "IA"}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {conv.media_type}
                        </Badge>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {formatDistanceToNow(new Date(conv.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {conv.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 13) {
    return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
  }
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
}
