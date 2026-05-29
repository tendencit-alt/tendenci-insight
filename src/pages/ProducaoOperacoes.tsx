import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Factory, CalendarRange, LineChart } from "lucide-react";
import { OpsWorkTab } from "@/components/ops/OpsWorkTab";
import { OpsCronogramaTab } from "@/components/ops/OpsCronogramaTab";
import { OpsInsightsTab } from "@/components/ops/OpsInsightsTab";

const VALID_TABS = ["producao", "cronograma", "insights"];
// legacy → new mapping for backward compatibility
const LEGACY: Record<string, string> = {
  ordens: "producao",
  projetos: "producao",
  planejamento: "cronograma",
  execucao: "cronograma",
  custos: "insights",
  analytics: "insights",
};

export default function ProducaoOperacoes() {
  const [params, setParams] = useSearchParams();
  const raw = params.get("tab") ?? "";
  const mapped = LEGACY[raw] ?? raw;
  const activeTab = VALID_TABS.includes(mapped) ? mapped : "producao";

  useEffect(() => {
    if (raw && !VALID_TABS.includes(raw)) {
      const next = new URLSearchParams(params);
      if (LEGACY[raw]) next.set("tab", LEGACY[raw]); else next.delete("tab");
      setParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw]);

  const handleChange = (v: string) => {
    const next = new URLSearchParams(params);
    if (v === "producao") next.delete("tab"); else next.set("tab", v);
    setParams(next, { replace: true });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Produção e Operações</h1>
          <p className="text-muted-foreground text-sm">
            Acompanhe ordens, cronograma e indicadores em uma visão única.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={handleChange} className="space-y-4">
          <TabsList>
            <TabsTrigger value="producao" className="gap-1.5"><Factory className="h-4 w-4" />Produção</TabsTrigger>
            <TabsTrigger value="cronograma" className="gap-1.5"><CalendarRange className="h-4 w-4" />Cronograma</TabsTrigger>
            <TabsTrigger value="insights" className="gap-1.5"><LineChart className="h-4 w-4" />Custos & Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="producao"><OpsWorkTab /></TabsContent>
          <TabsContent value="cronograma"><OpsCronogramaTab /></TabsContent>
          <TabsContent value="insights"><OpsInsightsTab /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
