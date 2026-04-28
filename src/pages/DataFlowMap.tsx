import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { GitBranch, AlertTriangle, Search, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DataLineageTimeline } from "@/components/data-flow/DataLineageTimeline";
import DashboardLayout from "@/components/layout/DashboardLayout";

interface Warning {
  id: string;
  entity_type: string;
  entity_id: string;
  warning_type: string;
  severity: string;
  message: string;
  status: string;
  created_at: string;
}

export default function DataFlowMap() {
  const { toast } = useToast();
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchType, setSearchType] = useState("fin_ledger_entry");
  const [searchId, setSearchId] = useState("");
  const [activeQuery, setActiveQuery] = useState<{ type: string; id: string } | null>(null);

  async function loadWarnings() {
    setLoading(true);
    const { data, error } = await supabase
      .from("data_quality_warnings")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      toast({ title: "Erro ao carregar avisos", description: error.message, variant: "destructive" });
    } else {
      setWarnings((data as Warning[]) || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadWarnings();
  }, []);

  async function acknowledge(id: string) {
    const { error } = await supabase
      .from("data_quality_warnings")
      .update({ status: "acknowledged", acknowledged_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Aviso reconhecido" });
      loadWarnings();
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchId.trim()) return;
    setActiveQuery({ type: searchType, id: searchId.trim() });
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-3">
          <GitBranch className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Mapa de Fluxo de Dados</h1>
            <p className="text-sm text-muted-foreground">
              Rastreabilidade completa: origem, destinos e qualidade de cada dado do ERP.
            </p>
          </div>
        </div>

        <Tabs defaultValue="explorer" className="w-full">
          <TabsList>
            <TabsTrigger value="explorer">
              <Search className="h-4 w-4 mr-2" />
              Explorar Registro
            </TabsTrigger>
            <TabsTrigger value="warnings">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Avisos de Qualidade
              {warnings.length > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 px-1.5">
                  {warnings.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="explorer" className="space-y-4 mt-4">
            <Card className="p-4">
              <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-[200px_1fr_auto] gap-3 items-end">
                <div>
                  <Label htmlFor="entity_type">Tipo de Registro</Label>
                  <select
                    id="entity_type"
                    value={searchType}
                    onChange={(e) => setSearchType(e.target.value)}
                    className="w-full mt-1 h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="fin_ledger_entry">Lançamento Financeiro</option>
                    <option value="financial_entry">Entrada Financeira</option>
                    <option value="payable">Conta a Pagar</option>
                    <option value="order">Pedido</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="entity_id">ID do Registro</Label>
                  <Input
                    id="entity_id"
                    value={searchId}
                    onChange={(e) => setSearchId(e.target.value)}
                    placeholder="Cole o UUID do registro"
                    className="mt-1 font-mono"
                  />
                </div>
                <Button type="submit">
                  <Search className="h-4 w-4 mr-2" />
                  Buscar
                </Button>
              </form>
            </Card>

            {activeQuery && (
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                  <Badge variant="secondary">{activeQuery.type}</Badge>
                  <span className="font-mono text-xs">{activeQuery.id}</span>
                </div>
                <DataLineageTimeline entityType={activeQuery.type} entityId={activeQuery.id} />
              </Card>
            )}
          </TabsContent>

          <TabsContent value="warnings" className="space-y-3 mt-4">
            {loading ? (
              <>
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </>
            ) : warnings.length === 0 ? (
              <Card className="p-12 text-center text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-500" />
                <p className="font-medium">Nenhum aviso de qualidade aberto</p>
                <p className="text-sm mt-1">
                  Todos os fluxos de dados estão consistentes no momento.
                </p>
              </Card>
            ) : (
              warnings.map((w) => (
                <Card key={w.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge
                          variant={w.severity === "critical" ? "destructive" : "secondary"}
                        >
                          {w.severity}
                        </Badge>
                        <Badge variant="outline">{w.warning_type}</Badge>
                        <Badge variant="outline">{w.entity_type}</Badge>
                      </div>
                      <p className="text-sm">{w.message}</p>
                      <div className="text-xs text-muted-foreground mt-2 flex gap-3">
                        <span className="font-mono">{w.entity_id.slice(0, 8)}…</span>
                        <span>
                          {format(new Date(w.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveQuery({ type: w.entity_type, id: w.entity_id })}
                      >
                        Ver fluxo
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => acknowledge(w.id)}>
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
