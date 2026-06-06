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
  sort: "eta" | "order" | "date" | "priority" | "client";
}

export const DEFAULT_FILTERS: TimelineFiltersValue = {
  search: "",
  priority: "all",
  phase: "all",
  late: "all",
  range: "month",
  group: "client",
  density: "normal",
  sort: "eta",
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
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-muted/20 shadow-sm">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <div className="flex flex-wrap items-center gap-2.5 p-3.5 md:p-4">
      <div className="flex h-9 items-center gap-2 rounded-full border border-border/50 bg-background/80 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground shadow-sm">
        <Filter className="h-4 w-4" /> Filtros
      </div>
      <Input
        value={value.search}
        onChange={(e) => set("search", e.target.value)}
        placeholder="Buscar OP, cliente ou pedido…"
        className="h-9 w-64 rounded-full border-border/50 bg-background/80 shadow-sm"
      />
      <Select value={value.priority} onValueChange={(v) => set("priority", v)}>
        <SelectTrigger className="h-9 w-36 rounded-full border-border/50 bg-background/80 shadow-sm"><SelectValue placeholder="Prioridade" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas prioridades</SelectItem>
          <SelectItem value="alta">Alta</SelectItem>
          <SelectItem value="normal">Normal</SelectItem>
          <SelectItem value="baixa">Baixa</SelectItem>
        </SelectContent>
      </Select>
      <Select value={value.phase} onValueChange={(v) => set("phase", v)}>
        <SelectTrigger className="h-9 w-44 rounded-full border-border/50 bg-background/80 shadow-sm"><SelectValue placeholder="Fase atual" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as fases</SelectItem>
          {phases.map((p) => (
            <SelectItem key={p.slug} value={p.slug}>{p.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={value.late} onValueChange={(v) => set("late", v as TimelineFiltersValue["late"])}>
        <SelectTrigger className="h-9 w-40 rounded-full border-border/50 bg-background/80 shadow-sm"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Atrasadas e no prazo</SelectItem>
          <SelectItem value="late">Apenas atrasadas</SelectItem>
          <SelectItem value="ontime">Apenas no prazo</SelectItem>
        </SelectContent>
      </Select>
      <Select value={value.range} onValueChange={(v) => set("range", v as TimelineFiltersValue["range"])}>
        <SelectTrigger className="h-9 w-36 rounded-full border-border/50 bg-background/80 shadow-sm"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="week">Esta semana</SelectItem>
          <SelectItem value="month">Este mês</SelectItem>
          <SelectItem value="quarter">Este trimestre</SelectItem>
          <SelectItem value="all">Todo o período</SelectItem>
        </SelectContent>
      </Select>
      <Select value={value.group} onValueChange={(v) => set("group", v as TimelineFiltersValue["group"])}>
        <SelectTrigger className="h-9 w-40 rounded-full border-border/50 bg-background/80 shadow-sm"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Sem agrupamento</SelectItem>
          <SelectItem value="client">Agrupar por cliente</SelectItem>
          <SelectItem value="phase">Agrupar por fase</SelectItem>
          <SelectItem value="priority">Agrupar por prioridade</SelectItem>
        </SelectContent>
      </Select>
      <Select value={value.sort} onValueChange={(v) => set("sort", v as TimelineFiltersValue["sort"])}>
        <SelectTrigger className="h-9 w-44 rounded-full border-border/50 bg-background/80 shadow-sm"><SelectValue placeholder="Ordenar" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="eta">Menor prazo (ETA)</SelectItem>
          <SelectItem value="order">Nº Ordem</SelectItem>
          <SelectItem value="date">Data (Início)</SelectItem>
          <SelectItem value="priority">Prioridade</SelectItem>
          <SelectItem value="client">Cliente</SelectItem>
        </SelectContent>
      </Select>
      <Select value={value.density} onValueChange={(v) => set("density", v as TimelineFiltersValue["density"])}>
        <SelectTrigger className="h-9 w-36 rounded-full border-border/50 bg-background/80 shadow-sm"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="compact">Compacto</SelectItem>
          <SelectItem value="normal">Normal</SelectItem>
          <SelectItem value="expanded">Expandido</SelectItem>
        </SelectContent>
      </Select>
      {isDirty && (
        <Button variant="ghost" size="sm" className="h-9 rounded-full border border-border/50 bg-background/70 px-3 shadow-sm gap-1" onClick={() => onChange(DEFAULT_FILTERS)}>
          <X className="h-3.5 w-3.5" /> Limpar
        </Button>
      )}
      </div>
    </div>
  );
}
