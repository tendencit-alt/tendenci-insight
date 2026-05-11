import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { DashboardFiltersData } from "./DashboardFilters";

interface KPIRendererProps {
  kpiId: string;
  type: "card" | "graph" | "table";
  config?: any;
  filters?: DashboardFiltersData;
}

export function KPIRenderer({ kpiId, type, config, filters }: KPIRendererProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKPIData();
  }, [kpiId, filters]);

  const fetchKPIData = async () => {
    setLoading(true);
    try {
      // Buscar dados do KPI baseado no ID
      const kpiData = await getKPIData(kpiId);
      setData(kpiData);
    } catch (error) {
      console.error("Erro ao buscar dados do KPI:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (query: any) => {
    if (filters?.dateRange?.from) {
      query = query.gte("created_at", filters.dateRange.from.toISOString());
    }
    if (filters?.dateRange?.to) {
      query = query.lte("created_at", filters.dateRange.to.toISOString());
    }
    if (filters?.vendedor) {
      query = query.eq("owner_id", filters.vendedor);
    }
    if (filters?.arquiteto) {
      query = query.eq("architect_id", filters.arquiteto);
    }
    if (filters?.pipeline) {
      query = query.eq("pipeline_id", filters.pipeline);
    }
    if (filters?.categoria) {
      // Filtro de categoria se aplicável
    }
    return query;
  };

  const getKPIData = async (kpiId: string) => {
    // Mapear KPIs para suas queries
    switch (kpiId) {
      case "crm_contatos_feitos":
        let query1 = supabase.from("crm_deals").select("id", { count: "exact" });
        query1 = applyFilters(query1);
        const { data: deals1 } = await query1;
        return { value: deals1?.length || 0, label: "Contatos" };

      case "crm_projetos_captados":
        let query2 = supabase.from("crm_deals").select("id", { count: "exact" }).eq("status", "aberto");
        query2 = applyFilters(query2);
        const { data: deals2 } = await query2;
        return { value: deals2?.length || 0, label: "Captados" };

      case "crm_em_orcamento":
        let query3 = supabase.from("crm_deals").select("*, crm_stages(name)");
        query3 = applyFilters(query3);
        const { data: deals3 } = await query3;
        const orcamento = deals3?.filter(d => d.crm_stages?.name?.toLowerCase().includes("orçamento")).length || 0;
        return { value: orcamento, label: "Em Orçamento" };

      case "crm_apresentado":
        let query4 = supabase.from("crm_deals").select("*, crm_stages(name)");
        query4 = applyFilters(query4);
        const { data: deals4 } = await query4;
        const apresentado = deals4?.filter(d => d.crm_stages?.name?.toLowerCase().includes("apresent")).length || 0;
        return { value: apresentado, label: "Apresentados" };

      case "crm_perdido":
        let query5 = supabase.from("crm_deals").select("id", { count: "exact" }).eq("status", "perdido");
        query5 = applyFilters(query5);
        const { data: deals5 } = await query5;
        return { value: deals5?.length || 0, label: "Perdidos" };

      case "crm_conquistado":
        let query6 = supabase.from("crm_deals").select("id", { count: "exact" }).eq("status", "ganho");
        query6 = applyFilters(query6);
        const { data: deals6 } = await query6;
        return { value: deals6?.length || 0, label: "Conquistados" };

      case "crm_valor_conquistado":
        let query7 = supabase.from("crm_deals").select("value").eq("status", "ganho");
        query7 = applyFilters(query7);
        const { data: deals7 } = await query7;
        const total = deals7?.reduce((acc, d) => acc + (d.value || 0), 0) || 0;
        return { value: total, label: "Valor Total", isCurrency: true };

      case "projetos_recebido":
        const { data: proj1 } = await supabase.from("projects").select("id", { count: "exact" }).eq("stage", "recebido");
        return { value: proj1?.length || 0, label: "Recebidos" };

      case "projetos_desenvolvimento":
        const { data: proj2 } = await supabase.from("projects").select("id", { count: "exact" }).eq("stage", "em_desenvolvimento");
        return { value: proj2?.length || 0, label: "Em Desenvolvimento" };

      case "projetos_aprovado":
        const { data: proj3 } = await supabase.from("projects").select("id", { count: "exact" }).eq("stage", "aprovado");
        return { value: proj3?.length || 0, label: "Aprovados" };

      case "projetos_valor_aprovado":
        const { data: proj4 } = await supabase.from("projects").select("value").eq("stage", "aprovado");
        const totalProj = proj4?.reduce((acc, p) => acc + (p.value || 0), 0) || 0;
        return { value: totalProj, label: "Valor Aprovado", isCurrency: true };

      case "profissionais parceiros_ativos":
        const { data: arch1 } = await supabase.from("architects").select("id", { count: "exact" }).eq("active", true);
        return { value: arch1?.length || 0, label: "Ativos" };

      case "profissionais parceiros_aniversarios":
        const { data: birthdays } = await supabase.from("architects").select("name, birthday").not("birthday", "is", null).eq("active", true).limit(10);
        return { type: "table", data: birthdays || [], columns: ["name", "birthday"] };

      case "meta_progresso":
        // Exemplo de gráfico
        return {
          type: "graph",
          data: [
            { name: "Jan", value: 30 },
            { name: "Fev", value: 45 },
            { name: "Mar", value: 60 },
            { name: "Abr", value: 75 },
          ],
        };

      case "meta_ranking":
        const { data: ranking } = await supabase.from("profiles").select("full_name, email").limit(5);
        return { type: "table", data: ranking || [], columns: ["full_name", "email"] };

      case "conversao_origem":
        return {
          type: "pie",
          data: [
            { name: "Facebook", value: 400 },
            { name: "Instagram", value: 300 },
            { name: "Google", value: 200 },
            { name: "Direto", value: 100 },
          ],
        };

      case "evolucao_vendas":
        return {
          type: "line",
          data: [
            { name: "Sem 1", value: 12000 },
            { name: "Sem 2", value: 15000 },
            { name: "Sem 3", value: 18000 },
            { name: "Sem 4", value: 22000 },
          ],
        };

      default:
        return { value: 0, label: "Não configurado" };
    }
  };

  if (loading) {
    return <Skeleton className="h-full w-full" />;
  }

  // Renderizar baseado no tipo
  if (type === "card" && data?.value !== undefined) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-4xl font-bold mb-2">
          {data.isCurrency ? formatCurrency(data.value) : data.value.toLocaleString("pt-BR")}
        </div>
        <div className="text-sm text-muted-foreground">{data.label}</div>
      </div>
    );
  }

  if (type === "graph") {
    if (data?.type === "pie") {
      const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--chart-2))", "hsl(var(--chart-3))"];
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data.data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label>
              {data.data.map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (data?.type === "line") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data.data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    // Gráfico de barras padrão
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data?.data || []}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="hsl(var(--primary))" />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (type === "table" && data?.type === "table") {
    return (
      <div className="overflow-auto h-full">
        <table className="w-full text-sm">
          <thead className="border-b">
            <tr>
              {data.columns.map((col: string) => (
                <th key={col} className="text-left p-2 font-semibold">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.data.map((row: any, idx: number) => (
              <tr key={idx} className="border-b">
                {data.columns.map((col: string) => (
                  <td key={col} className="p-2">
                    {row[col] || "-"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return <div className="text-muted-foreground text-sm">Dados não disponíveis</div>;
}
