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
      } else {
        const { error } = await supabase
          .from("dashboards_personalizados")
          .insert(dashboardData);

        if (error) throw error;
      }

      toast({
        title: "Dashboard salvo",
        description: "Suas alterações foram salvas com sucesso!",
      });
      navigate("/dashboards");
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
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar com KPIs disponíveis */}
        <KPISidebar onAddKPI={handleAddKPI} />

        {/* Área principal do editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Barra superior */}
          <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center gap-4 flex-1">
              <Button variant="ghost" size="sm" onClick={() => navigate("/dashboards")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome do Dashboard"
                className="max-w-md"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>
                <Eye className="mr-2 h-4 w-4" />
                Visualizar
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>

          {/* Filtros do dashboard */}
          <div className="px-6 pt-4">
            <DashboardFilters filters={filters} onChange={setFilters} />
          </div>

          {/* Canvas do dashboard */}
          <div className="flex-1 overflow-auto p-6 bg-muted/20">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
                  <p className="text-muted-foreground">Carregando dashboard...</p>
                </div>
              </div>
            ) : layout.length === 0 ? (
              <Card className="border-dashed h-full flex items-center justify-center">
                <div className="text-center max-w-md">
                  <div className="rounded-full bg-muted p-4 mx-auto w-fit mb-4">
                    <Plus className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Canvas vazio</h3>
                  <p className="text-muted-foreground">
                    Arraste KPIs da barra lateral para começar a montar seu dashboard personalizado
                  </p>
                </div>
              </Card>
            ) : (
              <GridLayout
                className="layout"
                layout={layout}
                cols={12}
                rowHeight={80}
                width={1200}
                onLayoutChange={handleLayoutChange}
                draggableHandle=".drag-handle"
                compactType="vertical"
                preventCollision={false}
              >
                {layout.map((widget) => (
                  <div key={widget.i} className="bg-background rounded-lg shadow-sm border">
                    <DashboardWidget
                      widget={widget}
                      filters={filters}
                      onRemove={() => handleRemoveWidget(widget.i)}
                    />
                  </div>
                ))}
              </GridLayout>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
