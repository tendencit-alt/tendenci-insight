import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Users, Loader2, CheckCircle, XCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DispatchResult {
  type: 'followup' | 'group';
  success: boolean;
  dispatched: number;
  failed: number;
  message: string;
  timestamp: Date;
}

export function FollowupDispatchPanel() {
  const [isDispatchingFollowup, setIsDispatchingFollowup] = useState(false);
  const [isDispatchingGroup, setIsDispatchingGroup] = useState(false);
  const [lastResults, setLastResults] = useState<DispatchResult[]>([]);
  const { toast } = useToast();

  const dispatchFollowups = async () => {
    setIsDispatchingFollowup(true);
    try {
      const { data, error } = await supabase.functions.invoke("dispatch-followup", {
        body: { 
          mode: "direct", 
          limit: 10,
          ignore_business_hours: false 
        }
      });

      if (error) throw error;

      const result: DispatchResult = {
        type: 'followup',
        success: true,
        dispatched: data?.dispatched || 0,
        failed: data?.failed || 0,
        message: data?.message || `${data?.dispatched || 0} follow-ups enviados`,
        timestamp: new Date()
      };

      setLastResults(prev => [result, ...prev].slice(0, 5));

      toast({
        title: "Follow-ups Disparados",
        description: result.message,
      });
    } catch (err: any) {
      const result: DispatchResult = {
        type: 'followup',
        success: false,
        dispatched: 0,
        failed: 0,
        message: err.message || "Erro ao disparar follow-ups",
        timestamp: new Date()
      };

      setLastResults(prev => [result, ...prev].slice(0, 5));

      toast({
        title: "Erro",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsDispatchingFollowup(false);
    }
  };

  const dispatchGroupInvites = async () => {
    setIsDispatchingGroup(true);
    try {
      const { data, error } = await supabase.functions.invoke("dispatch-group-invites", {
        body: { 
          limit: 30,
          ignore_business_hours: false 
        }
      });

      if (error) throw error;

      const result: DispatchResult = {
        type: 'group',
        success: true,
        dispatched: data?.dispatched || 0,
        failed: data?.failed || 0,
        message: data?.message || `${data?.dispatched || 0} convites enviados`,
        timestamp: new Date()
      };

      setLastResults(prev => [result, ...prev].slice(0, 5));

      toast({
        title: "Convites de Grupo Disparados",
        description: result.message,
      });
    } catch (err: any) {
      const result: DispatchResult = {
        type: 'group',
        success: false,
        dispatched: 0,
        failed: 0,
        message: err.message || "Erro ao enviar convites",
        timestamp: new Date()
      };

      setLastResults(prev => [result, ...prev].slice(0, 5));

      toast({
        title: "Erro",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsDispatchingGroup(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Disparo Manual de Follow-ups
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Grid 2 colunas para os botões */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Follow-up Normal */}
          <div className="p-4 border rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-500" />
                  Follow-ups I.A.
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Envia mensagens de acompanhamento para deals sem resposta há mais de 48 horas na etapa Follow Up.
                </p>
              </div>
              <Badge variant="outline" className="text-xs flex-shrink-0">
                <Clock className="h-3 w-3 mr-1" />
                48h
              </Badge>
            </div>
            <Button 
              onClick={dispatchFollowups} 
              disabled={isDispatchingFollowup}
              className="w-full"
            >
              {isDispatchingFollowup ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Disparar Follow-ups
                </>
              )}
            </Button>
          </div>

          {/* Convites de Grupo */}
          <div className="p-4 border rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium flex items-center gap-2">
                  <Users className="h-4 w-4 text-green-500" />
                  Convites de Grupo
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Envia convite para o grupo do WhatsApp. Válido para deals há mais de 7 dias no pipeline (1x por cliente).
                </p>
              </div>
              <Badge variant="outline" className="text-xs flex-shrink-0">
                <Clock className="h-3 w-3 mr-1" />
                7 dias
              </Badge>
            </div>
            <Button 
              onClick={dispatchGroupInvites} 
              disabled={isDispatchingGroup}
              variant="outline"
              className="w-full"
            >
              {isDispatchingGroup ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Users className="h-4 w-4 mr-2" />
                  Enviar Convites
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Histórico de Disparos */}
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
                    <span className="text-xs text-muted-foreground truncate">
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

        {/* Aviso de Horário */}
        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded text-center">
          ⏰ <strong>Horário comercial:</strong> 9h às 18h (Seg-Sex). Disparos fora deste horário serão ignorados pelo sistema.
        </div>
      </CardContent>
    </Card>
  );
}
