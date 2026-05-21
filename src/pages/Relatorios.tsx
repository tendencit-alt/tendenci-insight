import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleShell } from "@/components/layout/ModuleShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReportBuilder } from "@/components/relatorios/ReportBuilder";
import {
  FileBarChart,
  BarChart3,
  Cog,
  ShieldCheck,
  BookmarkCheck,
  ChevronRight,
  Plus,
  Upload,
  CalendarClock,
  Download,
  Sparkles,
  FileSpreadsheet,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const GROUPS = [
  { key: "saved", label: "Salvos", icon: BookmarkCheck, desc: "Visões personalizadas armazenadas." },
  { key: "executivo", label: "Executivos", icon: FileBarChart, desc: "DRE, Fluxo, Orçamento vs Realizado, KPIs." },
  { key: "analitico", label: "Analíticos", icon: BarChart3, desc: "Contas a Pagar/Receber, Conciliação, DRE detalhada." },
  { key: "operacional", label: "Operacionais", icon: Cog, desc: "Pedidos, Produção, Entregas." },
  { key: "auditoria", label: "Auditoria", icon: ShieldCheck, desc: "Alterações críticas, lançamentos manuais." },
  { key: "builder", label: "Report Builder", icon: FileSpreadsheet, desc: "Construa um relatório do zero." },
] as const;

type GroupKey = (typeof GROUPS)[number]["key"];

const SUGGESTIONS: { label: string; group: GroupKey; hint: string }[] = [
  { label: "DRE Mensal", group: "executivo", hint: "Resumo executivo do mês." },
  { label: "Fluxo de Caixa 30d", group: "executivo", hint: "Projeção de caixa." },
  { label: "Pedidos por Vendedor", group: "operacional", hint: "Performance comercial." },
  { label: "DRE Gerencial", group: "executivo", hint: "Visão gerencial completa." },
];

export default function Relatorios() {
  const [activeGroup, setActiveGroup] = useState<GroupKey>("saved");

  const { data: savedReports } = useQuery({
    queryKey: ["saved-reports"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("fin_saved_reports")
        .select("*")
        .or(`created_by.eq.${user.id},is_public.eq.true`)
        .order("updated_at", { ascending: false });
      return data || [];
    },
  });

  const handleNew = () => setActiveGroup("builder");
  const handleImport = () => toast.info("Importação de templates em breve");
  const handleSchedule = () => toast.info("Agendamento de envio em breve");
  const handleExport = () => {
    if (!savedReports?.length) {
      toast.error("Nenhum relatório salvo para exportar");
      return;
    }
    const headers = ["Nome", "Grupo", "Visualização", "Atualizado"];
    const rows = savedReports.map((r: any) => [
      r.name,
      r.report_group,
      r.visualization,
      r.updated_at ? format(new Date(r.updated_at), "dd/MM/yyyy") : "",
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorios-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Lista exportada");
  };

  const headerActions = (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground hidden md:inline">Ações:</span>
      <Button size="sm" onClick={handleNew}>
        <Plus className="h-4 w-4 mr-1.5" />
        Novo KPI
      </Button>
      <Button size="sm" variant="outline" onClick={handleImport}>
        <Upload className="h-4 w-4 mr-1.5" />
        Importar Template
      </Button>
      <Button size="sm" variant="outline" onClick={handleSchedule}>
        <CalendarClock className="h-4 w-4 mr-1.5" />
        Agendar Envio
      </Button>
      <Button size="sm" variant="outline" onClick={handleExport}>
        <Download className="h-4 w-4 mr-1.5" />
        Exportar
      </Button>
    </div>
  );

  const subTabClass =
    "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-all hover:text-foreground data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-sm";

  const records = (
    <div className="space-y-4">
      {/* Próximo: sugestões contextuais */}
      <Card>
        <CardContent className="py-3 flex flex-wrap items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs font-medium text-muted-foreground">Próximo:</span>
          {SUGGESTIONS.map((s) => (
            <Button
              key={s.label}
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              title={s.hint}
              onClick={() => setActiveGroup(s.group)}
            >
              {s.label}
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* Sub-tabs com as 6 categorias */}
      <Tabs
        value={activeGroup}
        onValueChange={(v) => setActiveGroup(v as GroupKey)}
        className="space-y-4"
      >
        <div className="w-full rounded-xl bg-card border border-border p-1.5 overflow-x-auto">
          <TabsList className="flex h-auto justify-start gap-1 rounded-none bg-transparent p-0 min-w-max">
            {GROUPS.map((g) => (
              <TabsTrigger key={g.key} value={g.key} className={subTabClass}>
                <g.icon className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="whitespace-nowrap">{g.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Salvos */}
        <TabsContent value="saved" className="space-y-4">
          {!savedReports?.length ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BookmarkCheck className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum relatório salvo ainda</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Use o Report Builder ou os grupos para criar e salvar visões personalizadas.
                </p>
                <Button size="sm" className="mt-3" onClick={() => setActiveGroup("builder")}>
                  Criar KPI
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {savedReports.map((report: any) => (
                <Card
                  key={report.id}
                  className="hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => setActiveGroup("builder")}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{report.name}</p>
                        {report.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {report.description}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    </div>
                    <div className="flex items-center gap-1.5 mt-2">
                      <Badge variant="outline" className="text-[10px]">
                        {(
                          {
                            executivo: "Executivo",
                            analitico: "Analítico",
                            operacional: "Operacional",
                            auditoria: "Auditoria",
                          } as Record<string, string>
                        )[report.report_group] || report.report_group}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {report.visualization}
                      </Badge>
                      {report.is_public && (
                        <Badge className="text-[10px] bg-blue-100 text-blue-700">
                          Público
                        </Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      Atualizado:{" "}
                      {report.updated_at
                        ? format(new Date(report.updated_at), "dd/MM/yyyy")
                        : "—"}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Grupos com ReportBuilder pré-filtrado */}
        {GROUPS.filter((g) => g.key !== "saved" && g.key !== "builder").map((g) => (
          <TabsContent key={g.key} value={g.key} className="space-y-4">
            <Card>
              <CardContent className="py-3 flex items-center gap-3">
                <g.icon className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium">KPI's {g.label}</p>
                  <p className="text-xs text-muted-foreground">{g.desc}</p>
                </div>
              </CardContent>
            </Card>
            <ReportBuilder initialGroup={g.key} />
          </TabsContent>
        ))}

        {/* Report Builder livre */}
        <TabsContent value="builder" className="space-y-4">
          <ReportBuilder />
        </TabsContent>
      </Tabs>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-[1600px] p-4 md:p-6">
        <ModuleShell
          moduleKey="relatorios"
          title="KPI's"
          description="Executivos, analíticos, operacionais e de auditoria."
          icon={<FileBarChart className="h-5 w-5" />}
          headerActions={headerActions}
          records={records}
        />
      </div>
    </DashboardLayout>
  );
}
