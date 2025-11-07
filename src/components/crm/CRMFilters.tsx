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
    <div className="flex flex-wrap gap-4 p-4 bg-card rounded-lg border">
      <div className="flex-1 min-w-[200px]">
        <Select value={selectedPipeline} onValueChange={onPipelineChange}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o funil" />
          </SelectTrigger>
          <SelectContent>
            {pipelines.map((pipeline) => (
              <SelectItem key={pipeline.id} value={pipeline.id}>
                {pipeline.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 min-w-[200px] relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar cliente, negócio, telefone..."
          className="pl-10"
        />
      </div>
    </div>
  );
}
