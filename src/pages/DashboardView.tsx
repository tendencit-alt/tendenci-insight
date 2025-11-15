import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus } from "lucide-react";
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
      <div className="flex flex-col h-[calc(100vh-4rem)] bg-gradient-to-br from-background via-background to-muted/20">
        {/* Barra superior com gradiente */}
        <div className="relative border-b bg-gradient-to-r from-primary/5 via-background to-primary/5 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
          <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none" />
          <div className="relative flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate("/dashboards")}
                className="hover:bg-primary/10 transition-colors"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                  {nome}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">Dashboard personalizado</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros com design melhorado */}
        <div className="px-6 pt-6">
          <DashboardFilters filters={filters} onChange={setFilters} />
        </div>

        {/* Dashboard visualização com grid melhorado */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="relative">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary mx-auto mb-4" />
                  <div className="absolute inset-0 rounded-full bg-primary/5 blur-xl" />
                </div>
                <p className="text-muted-foreground font-medium">Carregando dashboard...</p>
              </div>
            </div>
          ) : layout.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/20 border border-border/50 backdrop-blur-sm">
                <div className="rounded-full bg-gradient-to-br from-primary/20 to-primary/5 p-6 mx-auto w-fit mb-4">
                  <Plus className="h-12 w-12 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Dashboard vazio</h3>
                <p className="text-muted-foreground">Adicione widgets no editor para visualizar os dados</p>
              </div>
            </div>
          ) : (
            <div className="max-w-[1400px] mx-auto">
              <GridLayout
                className="layout"
                layout={layout}
                cols={12}
                rowHeight={90}
                width={1400}
                isDraggable={false}
                isResizable={false}
                compactType="vertical"
              >
                {layout.map((widget) => (
                  <div 
                    key={widget.i} 
                    className="group transition-all duration-300 hover:scale-[1.02]"
                  >
                    <div className="h-full rounded-xl bg-gradient-to-br from-card via-card to-card/80 border border-border/50 shadow-lg hover:shadow-2xl hover:border-primary/30 transition-all duration-300 backdrop-blur-sm">
                      <DashboardWidget
                        widget={widget}
                        filters={filters}
                        onRemove={() => {}}
                        isViewMode={true}
                      />
                    </div>
                  </div>
                ))}
              </GridLayout>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
