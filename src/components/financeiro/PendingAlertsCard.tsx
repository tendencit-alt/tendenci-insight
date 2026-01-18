import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Clock, Bell, ArrowRight, XCircle } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

interface PendingItem {
  id: string;
  type: "payable" | "receivable";
  description: string;
  amount: number;
  due_date: string;
  status: string;
  days_overdue: number;
  party_name: string;
}

export function PendingAlertsCard() {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const { data: pendingItems, isLoading } = useQuery({
    queryKey: ["fin-pending-alerts"],
    queryFn: async () => {
      const today = new Date();
      const items: PendingItem[] = [];

      // Fetch overdue payables
      const { data: payables } = await supabase
        .from("fin_payables")
        .select(`
          id,
          description,
          amount,
          due_date,
          status,
          supplier:suppliers(name)
        `)
        .in("status", ["ABERTO", "VENCIDO"])
        .lte("due_date", format(today, "yyyy-MM-dd"))
        .order("due_date", { ascending: true })
        .limit(10);

      payables?.forEach((p) => {
        const dueDate = new Date(p.due_date);
        items.push({
          id: p.id,
          type: "payable",
          description: p.description || "Conta a Pagar",
          amount: Number(p.amount),
          due_date: p.due_date,
          status: p.status,
          days_overdue: differenceInDays(today, dueDate),
          party_name: (p.supplier as any)?.name || "Fornecedor",
        });
      });

      // Fetch overdue receivables
      const { data: receivables } = await supabase
        .from("fin_receivables")
        .select(`
          id,
          description,
          amount,
          due_date,
          status,
          customer:clients(name)
        `)
        .in("status", ["ABERTO", "VENCIDO"])
        .lte("due_date", format(today, "yyyy-MM-dd"))
        .order("due_date", { ascending: true })
        .limit(10);

      receivables?.forEach((r) => {
        const dueDate = new Date(r.due_date);
        items.push({
          id: r.id,
          type: "receivable",
          description: r.description || "Conta a Receber",
          amount: Number(r.amount),
          due_date: r.due_date,
          status: r.status,
          days_overdue: differenceInDays(today, dueDate),
          party_name: (r.customer as any)?.name || "Cliente",
        });
      });

      // Sort by days overdue (most overdue first)
      return items.sort((a, b) => b.days_overdue - a.days_overdue);
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const visibleItems = pendingItems?.filter((item) => !dismissed.has(item.id)) || [];

  if (isLoading) {
    return null;
  }

  if (visibleItems.length === 0) {
    return null;
  }

  const totalOverdue = visibleItems.reduce((sum, item) => sum + item.amount, 0);

  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2 text-destructive">
          <Bell className="h-5 w-5 animate-pulse" />
          Alertas de Pendências
          <Badge variant="destructive" className="ml-2">
            {visibleItems.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total pendente/vencido:</span>
            <span className="font-bold text-destructive">{formatCurrency(totalOverdue)}</span>
          </div>

          <ScrollArea className="h-[200px] pr-2">
            <div className="space-y-2">
              {visibleItems.map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-background border border-destructive/20 gap-3"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {item.days_overdue > 0 ? (
                      <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                    ) : (
                      <Clock className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {item.party_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          variant={item.type === "payable" ? "destructive" : "default"}
                          className="text-xs"
                        >
                          {item.type === "payable" ? "Pagar" : "Receber"}
                        </Badge>
                        {item.days_overdue > 0 && (
                          <span className="text-xs text-destructive font-medium">
                            {item.days_overdue} dia(s) atraso
                          </span>
                        )}
                        {item.days_overdue === 0 && (
                          <span className="text-xs text-amber-600 font-medium">
                            Vence hoje
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-right">
                      <p className="font-semibold text-sm">{formatCurrency(item.amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(item.due_date), "dd/MM", { locale: ptBR })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setDismissed((prev) => new Set([...prev, item.id]))}
                    >
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {dismissed.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => setDismissed(new Set())}
            >
              Mostrar {dismissed.size} alerta(s) oculto(s)
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
