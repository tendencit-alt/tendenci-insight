import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface CRMFiltersProps {
  pipelines: any[];
  selectedPipeline: string;
  onPipelineChange: (value: string) => void;
}

export function CRMFilters({ pipelines, selectedPipeline, onPipelineChange }: CRMFiltersProps) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <Select value={selectedPipeline} onValueChange={onPipelineChange}>
        <SelectTrigger className="lg:w-80">
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
          placeholder="Buscar cliente, negócio, telefone..."
          className="pl-10"
        />
      </div>
    </div>
  );
}
