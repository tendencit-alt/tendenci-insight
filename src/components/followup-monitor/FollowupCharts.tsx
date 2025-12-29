import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar
} from "recharts";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

interface TrendData {
  date: string;
  enviados: number;
  respostas: number;
}

interface StatusData {
  name: string;
  value: number;
  color: string;
}

interface ConversionData {
  date: string;
  convertidos: number;
}

export function FollowupCharts() {
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [statusData, setStatusData] = useState<StatusData[]>([]);
  const [conversionData, setConversionData] = useState<ConversionData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChartData = async () => {
    try {
      const today = new Date();
      const sevenDaysAgo = subDays(today, 7);

      // Buscar stage de Follow Up com pipeline_id
      const { data: followupStage } = await supabase
        .from("crm_stages")
        .select("id, pipeline_id")
        .eq("name", "Follow Up (I.A)")
        .single();

      if (!followupStage) {
        console.error("Stage 'Follow Up (I.A)' não encontrado");
        setLoading(false);
        return;
      }

      // Buscar Lead do MESMO pipeline para evitar duplicatas
      const { data: leadStage } = await supabase
        .from("crm_stages")
        .select("id")
        .eq("name", "Lead")
        .eq("pipeline_id", followupStage.pipeline_id)
        .single();

      // Buscar logs de follow-up dos últimos 7 dias
      const { data: followupLogs } = await supabase
        .from("followup_logs")
        .select("status, sent_at, created_at")
        .gte("created_at", sevenDaysAgo.toISOString());

      // Buscar mudanças de stage dos últimos 7 dias
      const { data: stageChanges } = await supabase
        .from("crm_deal_history")
        .select("moved_at")
        .eq("from_stage_id", followupStage?.id || "")
        .eq("to_stage_id", leadStage?.id || "")
        .gte("moved_at", sevenDaysAgo.toISOString());

      // Processar dados de tendência (últimos 7 dias)
      const trendMap = new Map<string, { enviados: number; respostas: number }>();
      
      for (let i = 6; i >= 0; i--) {
        const date = subDays(today, i);
        const dateKey = format(date, "yyyy-MM-dd");
        trendMap.set(dateKey, { enviados: 0, respostas: 0 });
      }

      followupLogs?.forEach((log) => {
        if (log.status === "sent") {
          const dateKey = format(new Date(log.sent_at || log.created_at), "yyyy-MM-dd");
          const current = trendMap.get(dateKey);
          if (current) {
            current.enviados++;
          }
        }
      });

      stageChanges?.forEach((change) => {
        const dateKey = format(new Date(change.moved_at), "yyyy-MM-dd");
        const current = trendMap.get(dateKey);
        if (current) {
          current.respostas++;
        }
      });

      const trendArray: TrendData[] = [];
      trendMap.forEach((value, key) => {
        trendArray.push({
          date: format(new Date(key), "dd/MM", { locale: ptBR }),
          enviados: value.enviados,
          respostas: value.respostas,
        });
      });
      setTrendData(trendArray);

      // Processar dados de status (PieChart) - apenas sent e failed existem no banco
      const sentCount = followupLogs?.filter((l) => l.status === "sent").length || 0;
      const failedCount = followupLogs?.filter((l) => l.status === "failed").length || 0;

      setStatusData([
        { name: "Sucesso", value: sentCount, color: "#22c55e" },
        { name: "Falha", value: failedCount, color: "#ef4444" },
      ]);

      // Processar dados de conversão (BarChart)
      const conversionMap = new Map<string, number>();
      
      for (let i = 6; i >= 0; i--) {
        const date = subDays(today, i);
        const dateKey = format(date, "yyyy-MM-dd");
        conversionMap.set(dateKey, 0);
      }

      stageChanges?.forEach((change) => {
        const dateKey = format(new Date(change.moved_at), "yyyy-MM-dd");
        const current = conversionMap.get(dateKey);
        if (current !== undefined) {
          conversionMap.set(dateKey, current + 1);
        }
      });

      const conversionArray: ConversionData[] = [];
      conversionMap.forEach((value, key) => {
        conversionArray.push({
          date: format(new Date(key), "dd/MM", { locale: ptBR }),
          convertidos: value,
        });
      });
      setConversionData(conversionArray);

    } catch (error) {
      console.error("Erro ao buscar dados dos gráficos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChartData();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[200px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[200px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Tendência 7 Dias */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Tendência 7 Dias</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="colorEnviados" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorRespostas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} className="text-muted-foreground" />
              <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--background))", 
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px"
                }}
              />
              <Area
                type="monotone"
                dataKey="enviados"
                stroke="#22c55e"
                fillOpacity={1}
                fill="url(#colorEnviados)"
                name="Enviados"
              />
              <Area
                type="monotone"
                dataKey="respostas"
                stroke="#8b5cf6"
                fillOpacity={1}
                fill="url(#colorRespostas)"
                name="Respostas"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Status dos Envios */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Status dos Envios</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={statusData.filter((d) => d.value > 0)}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={5}
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--background))", 
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px"
                }}
              />
              <Legend 
                wrapperStyle={{ fontSize: "12px" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Conversão por Dia */}
      <Card className="lg:col-span-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Conversão Follow-up → Lead (7 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={conversionData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} className="text-muted-foreground" />
              <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--background))", 
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px"
                }}
              />
              <Bar 
                dataKey="convertidos" 
                fill="#8b5cf6" 
                radius={[4, 4, 0, 0]}
                name="Convertidos"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
