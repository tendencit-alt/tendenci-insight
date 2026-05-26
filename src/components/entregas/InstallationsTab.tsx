import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, List, CalendarDays } from "lucide-react";
import { useInstallations, type InstallationOrder } from "@/hooks/useFulfillment";
import { InstallStatusBadge } from "./StatusBadge";
import { InstallationDetailSheet } from "./InstallationDetailSheet";
import { CreateInstallationDialog } from "./CreateInstallationDialog";
import { useCan } from "@/hooks/useCan";
import { format, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export function InstallationsTab() {
  const { data: items = [], isLoading } = useInstallations();
  const canCreate = useCan("operacional", "create");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<InstallationOrder | null>(null);

  const byDay = useMemo(() => {
    const map = new Map<string, InstallationOrder[]>();
    items.forEach((i) => {
      if (!i.scheduled_date) return;
      const key = i.scheduled_date.slice(0, 10);
      const arr = map.get(key) ?? [];
      arr.push(i);
      map.set(key, arr);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [items]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{items.length} montagem(ns)</p>
        <Button size="sm" disabled={!canCreate} onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Nova montagem
        </Button>
      </div>

      <Tabs defaultValue="lista">
        <TabsList>
          <TabsTrigger value="lista"><List className="h-4 w-4 mr-1" />Lista</TabsTrigger>
          <TabsTrigger value="agenda"><CalendarDays className="h-4 w-4 mr-1" />Agenda</TabsTrigger>
        </TabsList>

        <TabsContent value="lista">
          <Card className="divide-y">
            {isLoading && <div className="p-4 text-sm text-muted-foreground">Carregando…</div>}
            {!isLoading && items.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">Nenhuma montagem cadastrada.</div>
            )}
            {items.map((i) => (
              <button
                key={i.id}
                onClick={() => setSelected(i)}
                className="w-full flex items-center justify-between gap-3 p-3 text-left hover:bg-muted/40 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <InstallStatusBadge status={i.status} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium">Pedido #{i.order?.order_number ?? "—"}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {i.equipe_responsavel ?? "Sem equipe"} • {i.endereco ?? "Sem endereço"}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  {i.scheduled_date ? format(new Date(i.scheduled_date), "dd/MM HH:mm", { locale: ptBR }) : "Sem data"}
                </div>
              </button>
            ))}
          </Card>
        </TabsContent>

        <TabsContent value="agenda">
          <div className="space-y-3">
            {byDay.length === 0 && <p className="text-sm text-muted-foreground">Sem montagens agendadas.</p>}
            {byDay.map(([day, list]) => (
              <Card key={day} className="p-3">
                <div className="text-sm font-semibold mb-2">
                  {format(parseISO(day), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  {isSameDay(parseISO(day), new Date()) && (
                    <span className="ml-2 text-xs text-primary">(hoje)</span>
                  )}
                </div>
                <div className="space-y-1">
                  {list.map((i) => (
                    <button
                      key={i.id}
                      onClick={() => setSelected(i)}
                      className="w-full flex items-center justify-between gap-2 p-2 rounded hover:bg-muted/40"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <InstallStatusBadge status={i.status} />
                        <span className="text-sm truncate">
                          Pedido #{i.order?.order_number} — {i.equipe_responsavel ?? "—"}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {i.scheduled_date && format(new Date(i.scheduled_date), "HH:mm")}
                      </span>
                    </button>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <CreateInstallationDialog open={open} onOpenChange={setOpen} />
      <InstallationDetailSheet install={selected} open={!!selected} onOpenChange={(v) => !v && setSelected(null)} />
    </div>
  );
}
