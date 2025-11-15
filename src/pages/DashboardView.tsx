import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import GridLayout from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { DashboardWidget } from "@/components/dashboard-personalizado/DashboardWidget";
import { DashboardFilters, DashboardFiltersData } from "@/components/dashboard-personalizado/DashboardFilters";

interface WidgetData {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  kpi_id: string;
  type: "card" | "graph" | "table";
  config?: any;
}

export default function DashboardView() {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const [nome, setNome] = useState("");
  const [layout, setLayout] = useState<WidgetData[]>([]);
  const [filters, setFilters] = useState<DashboardFiltersData>({});
  const [loading, setLoading] = useState(false);

  const isMaster = profile?.role === 'admin';

  useEffect(() => {
    if (!isMaster) {
      navigate('/');
      toast({
        title: "Acesso negado",
        description: "Apenas usuários MASTER podem acessar esta área",
        variant: "destructive",
      });
      return;
    }

    if (id) {
      fetchDashboard();
    }
  }, [isMaster, id]);

  const fetchDashboard = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("dashboards_personalizados")
        .select("*")
        .eq("id", id)
        .eq("user_id", user?.id)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        toast({
          title: "Dashboard não encontrado",
          description: "O dashboard que você está tentando visualizar não existe",
          variant: "destructive",
        });
        navigate("/dashboards");
        return;
      }

      setNome(data.nome);
      const layoutData = data.layout as { widgets?: WidgetData[] };
      setLayout(layoutData?.widgets || []);
      
      // Carregar filtros salvos
      if (data.filtros && typeof data.filtros === 'object') {
        const savedFilters = data.filtros as any;
        setFilters({
          dateRange: savedFilters.dateRange ? {
            from: savedFilters.dateRange.from ? new Date(savedFilters.dateRange.from) : undefined,
            to: savedFilters.dateRange.to ? new Date(savedFilters.dateRange.to) : undefined,
          } : undefined,
          vendedor: savedFilters.vendedor,
          arquiteto: savedFilters.arquiteto,
          pipeline: savedFilters.pipeline,
          categoria: savedFilters.categoria,
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao carregar dashboard",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isMaster) return null;

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {/* Barra superior */}
        <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboards")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <h1 className="text-2xl font-bold">{nome}</h1>
          </div>
        </div>

        {/* Filtros do dashboard */}
        <div className="px-6 pt-4">
          <DashboardFilters filters={filters} onChange={setFilters} />
        </div>

        {/* Dashboard visualização */}
        <div className="flex-1 overflow-auto p-6 bg-muted/20">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Carregando dashboard...</p>
              </div>
            </div>
          ) : (
            <GridLayout
              className="layout"
              layout={layout}
              cols={12}
              rowHeight={80}
              width={1200}
              isDraggable={false}
              isResizable={false}
              compactType="vertical"
            >
              {layout.map((widget) => (
                <div key={widget.i} className="bg-background rounded-lg shadow-sm border">
                  <DashboardWidget
                    widget={widget}
                    filters={filters}
                    onRemove={() => {}}
                  />
                </div>
              ))}
            </GridLayout>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
