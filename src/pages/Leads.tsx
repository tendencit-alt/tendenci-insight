import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Download } from "lucide-react";
import { LeadsFilters } from "@/components/leads/LeadsFilters";
import { LeadsTable } from "@/components/leads/LeadsTable";
import { CreateLeadDialog } from "@/components/leads/CreateLeadDialog";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

const Leads = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [filters, setFilters] = useState({
    period: "all",
    source: "Todos",
    status: "Todos",
    owner: "Todos",
    search: ""
  });
  const [metrics, setMetrics] = useState({
    hot_count: 0,
    avg_response: 0,
    new_count: 0,
    crm_rate: 0
  });

  useEffect(() => {
    fetchMetrics();
  }, [refreshKey]);

  const fetchMetrics = async () => {
    const { data, error } = await supabase.rpc('leads_aggregates');
    if (!error && data) {
      setMetrics(data as { hot_count: number; avg_response: number; new_count: number; crm_rate: number });
    }
  };

  const handleSync = () => {
    console.log("Sincronizando com IA...");
    setRefreshKey(prev => prev + 1);
  };

  const handleCreateSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleExport = () => {
    console.log("Exportando leads...");
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
            📇 Leads Inteligentes
          </h1>
          <p className="text-muted-foreground text-lg">
            Gestão unificada de leads vindos da IA WhatsApp, Meta Ads e CRM. Histórico completo e sincronização total.
          </p>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <LeadsFilters filters={filters} onFiltersChange={setFilters} />
          <div className="flex gap-3">
            <Button onClick={handleSync} variant="outline" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Sincronizar IA
            </Button>
            <Button onClick={handleExport} variant="ghost" className="gap-2">
              <Download className="w-4 h-4" />
              Exportar
            </Button>
            <Button onClick={() => setIsCreateOpen(true)} className="gap-2 shadow-lg shadow-primary/25">
              <Plus className="w-4 h-4" />
              Novo Lead
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 space-y-2 hover:shadow-xl transition-all duration-300 border-l-4 border-l-orange-500">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Leads Quentes</span>
              <span className="text-2xl">🔥</span>
            </div>
            <p className="text-3xl font-bold text-primary">{metrics.hot_count}</p>
          </Card>

          <Card className="p-6 space-y-2 hover:shadow-xl transition-all duration-300 border-l-4 border-l-blue-500">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Tempo Médio Resposta</span>
              <span className="text-2xl">⏱️</span>
            </div>
            <p className="text-3xl font-bold">{metrics.avg_response}h</p>
          </Card>

          <Card className="p-6 space-y-2 hover:shadow-xl transition-all duration-300 border-l-4 border-l-green-500">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Novos Leads</span>
              <span className="text-2xl">✨</span>
            </div>
            <p className="text-3xl font-bold text-green-600">{metrics.new_count}</p>
          </Card>

          <Card className="p-6 space-y-2 hover:shadow-xl transition-all duration-300 border-l-4 border-l-purple-500">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Conversão CRM</span>
              <span className="text-2xl">⚡</span>
            </div>
            <p className="text-3xl font-bold text-purple-600">{metrics.crm_rate}%</p>
          </Card>
        </div>

        {/* Leads Table */}
        <LeadsTable filters={filters} key={refreshKey} />

        {/* Create Lead Dialog */}
        <CreateLeadDialog 
          open={isCreateOpen} 
          onOpenChange={setIsCreateOpen}
          onSuccess={handleCreateSuccess}
        />
      </div>
    </DashboardLayout>
  );
};

export default Leads;
