import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Download } from "lucide-react";
import { LeadsFilters } from "@/components/leads/LeadsFilters";
import { LeadsTable } from "@/components/leads/LeadsTable";
import { CreateLeadDialog } from "@/components/leads/CreateLeadDialog";
import { Card } from "@/components/ui/card";

const Leads = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [filters, setFilters] = useState({
    period: "last_30_days",
    source: "Todos",
    status: "Todos",
    owner: "Todos",
    search: ""
  });

  const handleSync = () => {
    console.log("Sincronizando com IA...");
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
            Gestão unificada de leads vindos da IA WhatsApp, Meta Ads e CRM. Histórico completo, scoring e sincronização total.
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
            <p className="text-3xl font-bold text-primary">24</p>
          </Card>

          <Card className="p-6 space-y-2 hover:shadow-xl transition-all duration-300 border-l-4 border-l-blue-500">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Tempo Médio Resposta</span>
              <span className="text-2xl">⏱️</span>
            </div>
            <p className="text-3xl font-bold">2.4h</p>
          </Card>

          <Card className="p-6 space-y-2 hover:shadow-xl transition-all duration-300 border-l-4 border-l-green-500">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Novos Leads</span>
              <span className="text-2xl">✨</span>
            </div>
            <p className="text-3xl font-bold text-green-600">38</p>
          </Card>

          <Card className="p-6 space-y-2 hover:shadow-xl transition-all duration-300 border-l-4 border-l-purple-500">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Conversão CRM</span>
              <span className="text-2xl">⚡</span>
            </div>
            <p className="text-3xl font-bold text-purple-600">64%</p>
          </Card>
        </div>

        {/* Leads Table */}
        <LeadsTable filters={filters} />

        {/* Create Lead Dialog */}
        <CreateLeadDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      </div>
    </DashboardLayout>
  );
};

export default Leads;
