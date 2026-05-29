import { useEffect, useState } from "react";
import type { ProductionStatusColumn, SlaUnit } from "@/hooks/useProductionStatusColumns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Settings2, Plus, Trash2, Lock, AlarmClock } from "lucide-react";
import {
  useProductionStatusColumns,
  useCreateProductionStatusColumn,
  useUpdateProductionStatusColumn,
  useDeleteProductionStatusColumn,
  STATUS_COLOR_PALETTE,
} from "@/hooks/useProductionStatusColumns";

export function ManageProductionStatusDialog() {
  const [open, setOpen] = useState(false);
  const { data: columns = [] } = useProductionStatusColumns();
  const createMut = useCreateProductionStatusColumn();
  const updateMut = useUpdateProductionStatusColumn();
  const deleteMut = useDeleteProductionStatusColumn();

  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState("slate");
  const [newSla, setNewSla] = useState<string>("");
  const [newUnit, setNewUnit] = useState<SlaUnit>("days");

  const handleAdd = () => {
    if (!newLabel.trim()) return;
    const maxOrder = columns.reduce((m, c) => Math.max(m, c.sort_order), 0);
    const slaParsed = newSla.trim() === "" ? null : Math.max(0, Math.floor(Number(newSla)));
    createMut.mutate(
      {
        label: newLabel.trim(),
        color: newColor,
        sort_order: maxOrder + 10,
        sla_days: Number.isFinite(slaParsed as number) ? slaParsed : null,
        sla_unit: newUnit,
      },
      { onSuccess: () => { setNewLabel(""); setNewColor("slate"); setNewSla(""); setNewUnit("days"); } }
    );
  };

  const sortedColumns = [...columns].sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label, "pt-BR"));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Settings2 className="h-4 w-4" />Status
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Status de Produção</DialogTitle></DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {sortedColumns.map((c) => (
              <StatusRow
                key={c.id}
                column={c}
                onUpdate={(patch) => updateMut.mutate({ id: c.id, ...patch })}
                onDelete={() => deleteMut.mutate(c.id)}
              />
            ))}
          </div>

          <div className="border-t pt-4 space-y-2">
            <Label className="text-sm font-medium">Adicionar status personalizado</Label>
            <div className="flex items-end gap-2 flex-wrap">
              <div className="flex-1 min-w-[180px]">
                <Input
                  placeholder="Ex.: Em Revisão"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                />
              </div>
              <div className="flex gap-1">
                {STATUS_COLOR_PALETTE.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setNewColor(p.key)}
                    className={`h-6 w-6 rounded-full border-2 ${p.tone} ${newColor === p.key ? "ring-2 ring-foreground" : ""}`}
                  />
                ))}
              </div>
              <div className="relative">
                <AlarmClock className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  type="number"
                  min={0}
                  placeholder="Prazo"
                  value={newSla}
                  onChange={(e) => setNewSla(e.target.value)}
                  className="w-24 pl-7"
                  title="Prazo SLA (opcional)"
                />
              </div>
              <Select value={newUnit} onValueChange={(v) => setNewUnit(v as SlaUnit)}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="days">Dias</SelectItem>
                  <SelectItem value="hours">Horas</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleAdd} disabled={!newLabel.trim() || createMut.isPending} className="gap-1.5">
                <Plus className="h-4 w-4" />Adicionar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Status são isolados por empresa. Defina um <span className="font-medium text-foreground">prazo (em dias ou horas)</span> para que ordens paradas no status gerem alertas automáticos. Status do sistema não podem ser excluídos.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface StatusRowProps {
  column: ProductionStatusColumn;
  onUpdate: (patch: { label?: string; color?: string; sort_order?: number; sla_days?: number | null; sla_unit?: SlaUnit }) => void;
  onDelete: () => void;
}

function StatusRow({ column, onUpdate, onDelete }: StatusRowProps) {
  const [label, setLabel] = useState(column.label);
  const [order, setOrder] = useState<string>(String(column.sort_order));
  const [sla, setSla] = useState<string>(column.sla_days != null ? String(column.sla_days) : "");

  // Re-sync if server value changes (e.g. another tab)
  useEffect(() => { setLabel(column.label); }, [column.label]);
  useEffect(() => { setOrder(String(column.sort_order)); }, [column.sort_order]);
  useEffect(() => { setSla(column.sla_days != null ? String(column.sla_days) : ""); }, [column.sla_days]);

  const commitLabel = () => {
    const trimmed = label.trim();
    if (!trimmed) { setLabel(column.label); return; }
    if (trimmed !== column.label) onUpdate({ label: trimmed });
  };

  const commitOrder = () => {
    const raw = Number(order);
    if (!Number.isFinite(raw)) { setOrder(String(column.sort_order)); return; }
    const snapped = Math.max(0, Math.round(raw / 10) * 10);
    setOrder(String(snapped));
    if (snapped !== column.sort_order) onUpdate({ sort_order: snapped });
  };

  const commitSla = () => {
    const trimmed = sla.trim();
    if (trimmed === "") {
      if (column.sla_days != null) onUpdate({ sla_days: null });
      return;
    }
    const raw = Math.max(0, Math.floor(Number(trimmed)));
    if (!Number.isFinite(raw)) { setSla(column.sla_days != null ? String(column.sla_days) : ""); return; }
    if (raw !== column.sla_days) onUpdate({ sla_days: raw });
  };

  return (
    <div className="flex items-center gap-2 p-2 rounded-md border">
      <Input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={commitLabel}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
        className="flex-1"
      />
      <div className="flex gap-1">
        {STATUS_COLOR_PALETTE.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => onUpdate({ color: p.key })}
            className={`h-6 w-6 rounded-full border-2 ${p.tone} ${column.color === p.key ? "ring-2 ring-foreground" : ""}`}
            title={p.key}
          />
        ))}
      </div>
      <Input
        type="number"
        step={10}
        min={0}
        value={order}
        onChange={(e) => setOrder(e.target.value)}
        onBlur={commitOrder}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
        className="w-20"
        title="Ordem em múltiplos de 10 (ex.: 10, 20, 30)"
      />
      <div className="relative">
        <AlarmClock className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          type="number"
          min={0}
          placeholder="—"
          value={sla}
          onChange={(e) => setSla(e.target.value)}
          onBlur={commitSla}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          className="w-20 pl-7"
          title={`Prazo SLA em ${column.sla_unit === "hours" ? "horas" : "dias"}. Vazio = sem prazo`}
        />
      </div>
      <Select value={column.sla_unit} onValueChange={(v) => onUpdate({ sla_unit: v as SlaUnit })}>
        <SelectTrigger className="w-[88px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="days">Dias</SelectItem>
          <SelectItem value="hours">Horas</SelectItem>
        </SelectContent>
      </Select>
      {column.is_system ? (
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="gap-1 cursor-help border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                <Lock className="h-3 w-3" />Sistema
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top" align="center" sideOffset={8} className="max-w-[260px] p-0 overflow-hidden">
              <div className="flex items-start gap-2 p-3">
                <div className="mt-0.5 rounded-md bg-amber-500/15 p-1.5 text-amber-600 dark:text-amber-400">
                  <Lock className="h-3.5 w-3.5" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold leading-none">Status do sistema</p>
                  <p className="text-xs text-muted-foreground leading-snug">
                    Pode ser renomeado e ter cor, prazo ou ordem alterados, mas <span className="font-medium text-foreground">não pode ser excluído</span> para preservar a integridade dos fluxos de produção.
                  </p>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <Button variant="ghost" size="icon" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      )}
    </div>
  );
}
