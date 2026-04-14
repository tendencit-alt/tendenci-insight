import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReportBuilder } from "@/components/relatorios/ReportBuilder";
import {
  FileBarChart, BarChart3, Cog, ShieldCheck, BookmarkCheck,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";

const GROUPS = [
  { key: "executivo", label: "Executivos", icon: FileBarChart, desc: "DRE, Fluxo, Orçamento vs Realizado, KPIs" },
  { key: "analitico", label: "Analíticos", icon: BarChart3, desc: "Contas a Pagar/Receber, Conciliação, DRE detalhada" },
  { key: "operacional", label: "Operacionais", icon: Cog, desc: "Pedidos, Produção, Entregas" },
  { key: "auditoria", label: "Auditoria", icon: ShieldCheck, desc: "Alterações críticas, Lançamentos manuais" },
] as const;

export default function Relatorios() {
  const [activeTab, setActiveTab] = useState("saved");
  const [_selectedGroup, setSelectedGroup] = useState<string | null>(null);

  // Saved reports
  const { data: savedReports } = useQuery({
    queryKey: ["saved-reports"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("fin_saved_reports")
        .select("*")
        .or(`created_by.eq.${user.id},is_public.eq.true`)
        .order("updated_at", { ascending: false });
      return data || [];
    },
  });

  const tabClass = "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-all hover:text-foreground data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-sm";

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground text-sm">
            Relatórios executivos, analíticos, operacionais e de auditoria
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="w-full rounded-xl bg-card border border-border p-1.5 overflow-x-auto">
            <TabsList className="flex h-auto justify-start gap-1 rounded-none bg-transparent p-0 min-w-max">
              <TabsTrigger value="saved" className={tabClass}>
                <BookmarkCheck className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="whitespace-nowrap">Salvos</span>
              </TabsTrigger>
              {GROUPS.map((g) => (
                <TabsTrigger key={g.key} value={g.key} className={tabClass}>
                  <g.icon className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="whitespace-nowrap">{g.label}</span>
                </TabsTrigger>
              ))}
              <TabsTrigger value="builder" className={tabClass}>
                <BarChart3 className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="whitespace-nowrap">Report Builder</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Saved Reports */}
          <TabsContent value="saved" className="space-y-4">
            {!savedReports?.length ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <BookmarkCheck className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum relatório salvo ainda</p>
                  <p className="text-xs text-muted-foreground mt-1">Use o Report Builder ou os grupos de relatórios para criar e salvar visões personalizadas</p>
                  <Button size="sm" className="mt-3" onClick={() => setActiveTab("builder")}>
                    Criar Relatório
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {savedReports.map((report: any) => (
                  <Card key={report.id} className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => {
                    setSelectedGroup(null);
                    setActiveTab("builder");
                  }}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{report.name}</p>
                          {report.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{report.description}</p>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      </div>
                      <div className="flex items-center gap-1.5 mt-2">
                        <Badge variant="outline" className="text-[10px]">
                          {{ executivo: "Executivo", analitico: "Analítico", operacional: "Operacional", auditoria: "Auditoria" }[report.report_group] || report.report_group}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">{report.visualization}</Badge>
                        {report.is_public && <Badge className="text-[10px] bg-blue-100 text-blue-700">Público</Badge>}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1.5">
                        Atualizado: {report.updated_at ? format(new Date(report.updated_at), "dd/MM/yyyy") : "—"}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Group tabs */}
          {GROUPS.map((g) => (
            <TabsContent key={g.key} value={g.key} className="space-y-4">
              <Card className="mb-4">
                <CardContent className="py-3 flex items-center gap-3">
                  <g.icon className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Relatórios {g.label}</p>
                    <p className="text-xs text-muted-foreground">{g.desc}</p>
                  </div>
                </CardContent>
              </Card>
              <ReportBuilder initialGroup={g.key} />
            </TabsContent>
          ))}

          {/* Free builder */}
          <TabsContent value="builder" className="space-y-4">
            <ReportBuilder />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
