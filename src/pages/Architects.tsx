import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArchitectKPIs } from "@/components/architects/ArchitectKPIs";
import { BirthdayAlerts } from "@/components/architects/BirthdayAlerts";
import { InactiveArchitects } from "@/components/architects/InactiveArchitects";
import { ArchitectsTable } from "@/components/architects/ArchitectsTable";
import { CreateArchitectDialog } from "@/components/architects/CreateArchitectDialog";
import { EditArchitectDialog } from "@/components/architects/EditArchitectDialog";
import { ArchitectDetailSheet } from "@/components/architects/ArchitectDetailSheet";
import { ProjectTypesDashboard } from "@/components/architects/ProjectTypesDashboard";
import { useLocation } from "react-router-dom";

const Architects = () => {
  const location = useLocation();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedArchitect, setSelectedArchitect] = useState<any>(null);
  const [selectedArchitectId, setSelectedArchitectId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState("table");

  // Handle URL tab parameter
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (tab === "birthdays") setActiveTab("birthdays");
    if (tab === "inactive") setActiveTab("inactive");
  }, [location]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleCreateSuccess = () => {
    setRefreshKey(prev => prev + 1);
    setIsCreateOpen(false);
  };

  const handleEditSuccess = () => {
    setRefreshKey(prev => prev + 1);
    setIsEditOpen(false);
  };

  const handleEdit = (architect: any) => {
    setSelectedArchitect(architect);
    setIsEditOpen(true);
  };

  const handleView = (architectId: string) => {
    setSelectedArchitectId(architectId);
    setIsDetailOpen(true);
  };

  const handleDeleteSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
            👷 Arquitetos
          </h1>
          <p className="text-muted-foreground text-lg">
            Cadastro, performance e relacionamento com parceiros arquitetos.
          </p>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-wrap gap-3 justify-end">
          <Button onClick={handleRefresh} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </Button>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2 shadow-lg shadow-primary/25">
            <Plus className="w-4 h-4" />
            Novo Arquiteto
          </Button>
        </div>

        {/* KPIs */}
        <ArchitectKPIs refreshKey={refreshKey} />

        {/* Alerts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BirthdayAlerts refreshKey={refreshKey} />
          <InactiveArchitects refreshKey={refreshKey} />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="table" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="table">Tabela</TabsTrigger>
            <TabsTrigger value="analytics">Análises</TabsTrigger>
          </TabsList>
          
          <TabsContent value="table" className="mt-6">
            <ArchitectsTable 
              refreshKey={refreshKey} 
              onEdit={handleEdit}
              onView={handleView}
              onDelete={handleDeleteSuccess}
            />
          </TabsContent>
          
          <TabsContent value="analytics" className="mt-6">
            <div className="text-center p-12 text-muted-foreground">
              Gráficos e análises em breve...
            </div>
          </TabsContent>
        </Tabs>

        {/* Dialogs and Sheets */}
        <CreateArchitectDialog 
          open={isCreateOpen} 
          onOpenChange={setIsCreateOpen}
          onSuccess={handleCreateSuccess}
        />

        <EditArchitectDialog
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          onSuccess={handleEditSuccess}
          architect={selectedArchitect}
        />

        <ArchitectDetailSheet
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          architectId={selectedArchitectId}
        />
      </div>
    </DashboardLayout>
  );
};

export default Architects;
