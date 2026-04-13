import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GitBranch, Clock } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "destructive" | "secondary" | "outline" }> = {
  solicitado: { label: "Pendente", variant: "default" },
  em_revisao: { label: "Em revisão", variant: "secondary" },
  aprovado: { label: "Aprovado", variant: "outline" },
  rejeitado: { label: "Rejeitado", variant: "destructive" },
};

export function ApprovalsBlock() {
  const navigate = useNavigate();

  const { data: approvals, isLoading } = useQuery({
    queryKey: ["central-op-approvals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("approval_instances")
        .select("id, description, status, created_at, urgency, source_table, amount")
        .in("status", ["solicitado", "em_revisao"])
        .order("created_at", { ascending: true })
        .limit(15);
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-primary" />
          Aprovações
          {(approvals?.length || 0) > 0 && (
            <Badge variant="secondary" className="ml-auto text-xs">{approvals?.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-10 bg-muted rounded" />
            <div className="h-10 bg-muted rounded" />
          </div>
        ) : !approvals?.length ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma aprovação pendente</p>
        ) : (
          <ScrollArea className="h-[220px]">
            <div className="space-y-2">
              {approvals.map((a) => {
                const cfg = STATUS_BADGE[a.status] || STATUS_BADGE.solicitado;
                return (
                  <div
                    key={a.id}
                    onClick={() => navigate("/aprovacoes")}
                    className="flex items-start gap-3 p-2.5 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
                  >
                    <Clock className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{a.description || a.source_table}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant={cfg.variant} className="text-[10px] h-4">{cfg.label}</Badge>
                        {a.urgency && (
                          <span className={`text-[10px] ${a.urgency === "critica" ? "text-destructive font-bold" : a.urgency === "alta" ? "text-orange-600" : "text-muted-foreground"}`}>
                            {a.urgency}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(a.created_at!), "dd/MM")}
                        </span>
                      </div>
                    </div>
                    {a.amount && (
                      <span className="text-xs font-semibold whitespace-nowrap">
                        R$ {Number(a.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
        <Button variant="ghost" size="sm" className="w-full mt-2 text-xs" onClick={() => navigate("/aprovacoes")}>
          Ver todas as aprovações →
        </Button>
      </CardContent>
    </Card>
  );
}
