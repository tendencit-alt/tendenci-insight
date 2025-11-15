import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, Eye, ArrowLeft, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import GridLayout from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { KPISidebar } from "@/components/dashboard-personalizado/KPISidebar";
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

export default function DashboardEditor() {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const [nome, setNome] = useState("Novo Dashboard");
  const [layout, setLayout] = useState<WidgetData[]>([]);
  const [filters, setFilters] = useState<DashboardFiltersData>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const isMaster = profile?.role === 'admin';
  const isEditing = id && id !== "novo";

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

    if (isEditing) {
      fetchDashboard();
    }
  }, [isMaster, isEditing, id]);

  const fetchDashboard = async () => {
    if (!id || id === "novo") return;

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
          description: "O dashboard que você está tentando editar não existe",
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

  const handleSave = async () => {
    if (!nome.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, dê um nome ao seu dashboard",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const dashboardData = {
        user_id: user?.id,
        nome: nome.trim(),
        layout: { widgets: layout } as any,
        filtros: filters as any,
      };

      if (isEditing) {
        const { error } = await supabase
          .from("dashboards_personalizados")
          .update(dashboardData)
          .eq("id", id);

        if (error) throw error;
        
        toast({
          title: "Dashboard salvo",
          description: "Suas alterações foram salvas com sucesso!",
        });
      } else {
        const { data: newDashboard, error } = await supabase
          .from("dashboards_personalizados")
          .insert(dashboardData)
          .select()
          .single();

        if (error) throw error;

        toast({
          title: "Dashboard criado",
          description: "Dashboard criado com sucesso!",
        });
        
        // Redirecionar para a visualização do novo dashboard
        navigate(`/dashboards/view/${newDashboard.id}`);
        return;
      }
    } catch (error: any) {
      toast({
        title: "Erro ao salvar dashboard",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLayoutChange = (newLayout: any[]) => {
    const updatedLayout = layout.map((widget) => {
      const layoutItem = newLayout.find((item) => item.i === widget.i);
      if (layoutItem) {
        return {
          ...widget,
          x: layoutItem.x,
          y: layoutItem.y,
          w: layoutItem.w,
          h: layoutItem.h,
        };
      }
      return widget;
    });
    setLayout(updatedLayout);
  };

  const handleAddKPI = (kpiId: string, kpiType: "card" | "graph" | "table") => {
    const newWidget: WidgetData = {
      i: `widget-${Date.now()}`,
      x: 0,
      y: Infinity, // Coloca no final
      w: kpiType === "card" ? 3 : 6,
      h: kpiType === "card" ? 2 : 4,
      kpi_id: kpiId,
      type: kpiType,
    };
    setLayout([...layout, newWidget]);
    
    toast({
      title: "KPI adicionado",
      description: "Arraste e redimensione o widget como preferir",
    });
  };

  const handleRemoveWidget = (widgetId: string) => {
    setLayout(layout.filter((w) => w.i !== widgetId));
  };

  if (!isMaster) return null;

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-4rem)] bg-gradient-to-br from-background via-background to-muted/20">
        {/* Sidebar com KPIs disponíveis */}
        <KPISidebar onAddKPI={handleAddKPI} />

        {/* Área principal do editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Barra superior com gradiente */}
          <div className="relative border-b bg-gradient-to-r from-primary/5 via-background to-primary/5 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
            <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none" />
            <div className="relative flex items-center justify-between p-4">
              <div className="flex items-center gap-4 flex-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate("/dashboards")}
                  className="hover:bg-primary/10 transition-colors"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar
                </Button>
                <Input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Nome do Dashboard"
                  className="max-w-md bg-background/50 border-border/60 focus:border-primary/50 transition-all"
                />
              </div>
              <div className="flex gap-2">
                {isEditing && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => navigate(`/dashboards/view/${id}`)}
                    className="hover:bg-primary/10 transition-colors"
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Visualizar
                  </Button>
                )}
                <Button 
                  size="sm" 
                  onClick={handleSave} 
                  disabled={saving}
                  className="shadow-lg hover:shadow-xl transition-all"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          </div>

          {/* Filtros do dashboard */}
          <div className="px-6 pt-4">
            <DashboardFilters filters={filters} onChange={setFilters} />
          </div>

          {/* Canvas do dashboard */}
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
              <Card className="border-dashed border-2 h-full flex items-center justify-center bg-gradient-to-br from-muted/20 to-transparent">
                <div className="text-center max-w-md">
                  <div className="rounded-full bg-gradient-to-br from-primary/20 to-primary/5 p-6 mx-auto w-fit mb-4">
                    <Plus className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Canvas vazio</h3>
                  <p className="text-muted-foreground">
                    Arraste KPIs da barra lateral para começar a montar seu dashboard personalizado
                  </p>
                </div>
              </Card>
            ) : (
              <div className="max-w-[1400px] mx-auto">
                <GridLayout
                  className="layout"
                  layout={layout}
                  cols={12}
                  rowHeight={90}
                  width={1400}
                  onLayoutChange={handleLayoutChange}
                  draggableHandle=".drag-handle"
                  compactType="vertical"
                  preventCollision={false}
                >
                  {layout.map((widget) => (
                    <div 
                      key={widget.i} 
                      className="group transition-all duration-300"
                    >
                      <div className="h-full rounded-xl bg-gradient-to-br from-card via-card to-card/80 border border-border/50 shadow-lg hover:shadow-2xl hover:border-primary/30 transition-all duration-300 backdrop-blur-sm">
                        <DashboardWidget
                          widget={widget}
                          filters={filters}
                          onRemove={() => handleRemoveWidget(widget.i)}
                          isViewMode={false}
                        />
                      </div>
                    </div>
                  ))}
                </GridLayout>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
