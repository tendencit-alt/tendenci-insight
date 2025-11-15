import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface CRMFiltersProps {
  pipelines: any[];
  selectedPipeline: string;
  onPipelineChange: (value: string) => void;
  owners: any[];
  selectedOwner: string;
  onOwnerChange: (value: string) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedStatus: string;
  onStatusChange: (value: string) => void;
}

export function CRMFilters({ 
  pipelines, 
  selectedPipeline, 
  onPipelineChange,
  owners,
  selectedOwner,
  onOwnerChange,
  searchQuery,
  onSearchChange,
  selectedStatus,
  onStatusChange
}: CRMFiltersProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 lg:flex-row">
        <Select value={selectedPipeline} onValueChange={onPipelineChange}>
          <SelectTrigger className="lg:w-64">
            <SelectValue placeholder="Selecione um funil" />
          </SelectTrigger>
          <SelectContent>
            {pipelines.map((pipeline) => (
              <SelectItem key={pipeline.id} value={pipeline.id}>
                {pipeline.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar por título, cliente, arquiteto..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        <Select value={selectedOwner} onValueChange={onOwnerChange}>
          <SelectTrigger className="lg:w-64">
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os responsáveis</SelectItem>
            {owners.map((owner) => (
              <SelectItem key={owner.id} value={owner.id}>
                {owner.full_name || owner.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedStatus} onValueChange={onStatusChange}>
          <SelectTrigger className="lg:w-64">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="aberto">Aberto</SelectItem>
            <SelectItem value="ganho">Ganho</SelectItem>
            <SelectItem value="perdido">Perdido</SelectItem>
          </SelectContent>
        </Select>

        {(selectedOwner !== "all" || searchQuery || selectedStatus !== "all") && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              onOwnerChange("all");
              onSearchChange("");
              onStatusChange("all");
            }}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Limpar filtros
          </Button>
        )}
      </div>
    </div>
  );
}
