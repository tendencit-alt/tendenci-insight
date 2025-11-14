import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LayoutGrid, Table as TableIcon, List } from "lucide-react";
import { ProspeccaoKanban } from "./ProspeccaoKanban";
import { ProspeccaoTable } from "./ProspeccaoTable";
import { ProspeccaoFilters } from "./ProspeccaoFilters";

type ViewMode = "kanban" | "table";

interface ProspeccaoCRMProps {
  onManageStages: () => void;
}

export function ProspeccaoCRM({ onManageStages }: ProspeccaoCRMProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [filters, setFilters] = useState<any>({});
  const [showNaoContactados, setShowNaoContactados] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header com título e toggle de visualização */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">CRM de Arquitetos</h2>
          <p className="text-muted-foreground">Gerencie o funil de prospecção dos arquitetos</p>
        </div>
        
        <div className="flex items-center gap-2 p-1 bg-muted rounded-lg">
          <Button
            variant={viewMode === "kanban" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("kanban")}
            className="gap-2"
          >
            <LayoutGrid className="h-4 w-4" />
            Kanban
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("table")}
            className="gap-2"
          >
            <TableIcon className="h-4 w-4" />
            Tabela
          </Button>
        </div>
      </div>

      {/* Gerenciar Etapas */}
      <Button 
        variant="outline" 
        onClick={onManageStages}
        className="gap-2"
      >
        <List className="h-4 w-4" />
        Gerenciar Etapas
      </Button>

      {/* Filtros */}
      <ProspeccaoFilters 
        onFilterChange={setFilters}
        showNaoContactados={showNaoContactados}
        onToggleNaoContactados={() => setShowNaoContactados(!showNaoContactados)}
      />

      {/* Conteúdo baseado na visualização */}
      {viewMode === "kanban" ? (
        <ProspeccaoKanban filters={filters} showNaoContactados={showNaoContactados} />
      ) : (
        <ProspeccaoTable filters={filters} showNaoContactados={showNaoContactados} />
      )}
    </div>
  );
}
