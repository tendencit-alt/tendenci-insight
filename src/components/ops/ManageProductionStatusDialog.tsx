import { useEffect, useState } from "react";
import type { ProductionStatusColumn } from "@/hooks/useProductionStatusColumns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Settings2, Plus, Trash2, Lock } from "lucide-react";
import {
  useProductionStatusColumns,
  useCreateProductionStatusColumn,
  useUpdateProductionStatusColumn,
  useDeleteProductionStatusColumn,
  STATUS_COLOR_PALETTE,
  colorTone,
} from "@/hooks/useProductionStatusColumns";

export function ManageProductionStatusDialog() {
  const [open, setOpen] = useState(false);
  const { data: columns = [] } = useProductionStatusColumns();
  const createMut = useCreateProductionStatusColumn();
  const updateMut = useUpdateProductionStatusColumn();
  const deleteMut = useDeleteProductionStatusColumn();

  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState("slate");

  const handleAdd = () => {
    if (!newLabel.trim()) return;
    const maxOrder = columns.reduce((m, c) => Math.max(m, c.sort_order), 0);
    createMut.mutate(
      { label: newLabel.trim(), color: newColor, sort_order: maxOrder + 10 },
      { onSuccess: () => { setNewLabel(""); setNewColor("slate"); } }
    );
  };

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
            {columns.map((c) => (
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
            <div className="flex items-end gap-2">
              <div className="flex-1">
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
              <Button onClick={handleAdd} disabled={!newLabel.trim() || createMut.isPending} className="gap-1.5">
                <Plus className="h-4 w-4" />Adicionar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Status são isolados por empresa. Status do sistema não podem ser excluídos, mas podem ser renomeados e recoloridos.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
