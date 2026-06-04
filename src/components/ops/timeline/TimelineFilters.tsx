import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";

export interface TimelineFiltersValue {
  search: string;
  priority: string;
  phase: string;
  late: "all" | "late" | "ontime";
  range: "week" | "month" | "quarter" | "all";
  group: "none" | "client" | "phase" | "priority";
  density: "compact" | "normal" | "expanded";
  sort: "order" | "date" | "priority" | "client";
}

export const DEFAULT_FILTERS: TimelineFiltersValue = {
  search: "",
  priority: "all",
  phase: "all",
  late: "all",
  range: "month",
  group: "client",
  density: "normal",
  sort: "order",
};

interface Props {
  value: TimelineFiltersValue;
  onChange: (v: TimelineFiltersValue) => void;
  phases: { slug: string; label: string }[];
}

export function TimelineFilters({ value, onChange, phases }: Props) {
  const set = <K extends keyof TimelineFiltersValue>(k: K, v: TimelineFiltersValue[K]) =>
    onChange({ ...value, [k]: v });
  const isDirty = JSON.stringify(value) !== JSON.stringify(DEFAULT_FILTERS);

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg border bg-card">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Filter className="h-4 w-4" /> Filtros
      </div>
      <Input
        value={value.search}
        onChange={(e) => set("search", e.target.value)}
        placeholder="Buscar OP, cliente ou pedido…"
        className="h-8 w-56"
      />
      <Select value={value.priority} onValueChange={(v) => set("priority", v)}>
        <SelectTrigger className="h-8 w-32"><SelectValue placeholder="Prioridade" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas prioridades</SelectItem>
          <SelectItem value="alta">Alta</SelectItem>
          <SelectItem value="normal">Normal</SelectItem>
          <SelectItem value="baixa">Baixa</SelectItem>
        </SelectContent>
      </Select>
      <Select value={value.phase} onValueChange={(v) => set("phase", v)}>
        <SelectTrigger className="h-8 w-40"><SelectValue placeholder="Fase atual" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as fases</SelectItem>
          {phases.map((p) => (
            <SelectItem key={p.slug} value={p.slug}>{p.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={value.late} onValueChange={(v) => set("late", v as TimelineFiltersValue["late"])}>
        <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Atrasadas e no prazo</SelectItem>
          <SelectItem value="late">Apenas atrasadas</SelectItem>
          <SelectItem value="ontime">Apenas no prazo</SelectItem>
        </SelectContent>
      </Select>
      <Select value={value.range} onValueChange={(v) => set("range", v as TimelineFiltersValue["range"])}>
        <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="week">Esta semana</SelectItem>
          <SelectItem value="month">Este mês</SelectItem>
          <SelectItem value="quarter">Este trimestre</SelectItem>
          <SelectItem value="all">Todo o período</SelectItem>
        </SelectContent>
      </Select>
      <Select value={value.group} onValueChange={(v) => set("group", v as TimelineFiltersValue["group"])}>
        <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Sem agrupamento</SelectItem>
          <SelectItem value="client">Agrupar por cliente</SelectItem>
          <SelectItem value="phase">Agrupar por fase</SelectItem>
          <SelectItem value="priority">Agrupar por prioridade</SelectItem>
        </SelectContent>
      </Select>
      <Select value={value.density} onValueChange={(v) => set("density", v as TimelineFiltersValue["density"])}>
        <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="compact">Compacto</SelectItem>
          <SelectItem value="normal">Normal</SelectItem>
          <SelectItem value="expanded">Expandido</SelectItem>
        </SelectContent>
      </Select>
      {isDirty && (
        <Button variant="ghost" size="sm" className="h-8 gap-1" onClick={() => onChange(DEFAULT_FILTERS)}>
          <X className="h-3.5 w-3.5" /> Limpar
        </Button>
      )}
    </div>
  );
}
