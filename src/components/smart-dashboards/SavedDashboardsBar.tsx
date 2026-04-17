import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Save, BookmarkIcon, Trash2 } from "lucide-react";
import { useSavedDashboards } from "@/hooks/useDashboardLayout";
import type { DashboardProfile, WidgetInstance, SavedDashboard } from "./types";
import { toast } from "sonner";

interface Props {
  profile: DashboardProfile;
  widgets: WidgetInstance[];
  onLoad: (dash: SavedDashboard) => void;
}

export function SavedDashboardsBar({ profile, widgets, onLoad }: Props) {
  const { saved, save, remove } = useSavedDashboards();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const filtered = saved.filter((d) => d.profile === profile);

  const handleSave = () => {
    if (!name.trim()) return;
    save({ name: name.trim(), profile, widgets });
    toast.success(`Dashboard "${name}" salvo`);
    setName("");
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8">
            <BookmarkIcon className="h-3.5 w-3.5 mr-1.5" />
            Visões {filtered.length > 0 && `(${filtered.length})`}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="text-xs">Visões salvas</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {filtered.length === 0 ? (
            <div className="px-2 py-3 text-xs text-muted-foreground text-center">
              Nenhuma visão salva
            </div>
          ) : (
            filtered.map((d) => (
              <DropdownMenuItem
                key={d.id}
                onSelect={(e) => e.preventDefault()}
                className="flex items-center justify-between group"
              >
                <button onClick={() => onLoad(d)} className="flex-1 text-left text-sm">
                  {d.name}
                  <span className="block text-[10px] text-muted-foreground">
                    {d.widgets.length} widgets
                  </span>
                </button>
                <button
                  onClick={() => { remove(d.id); toast.success("Visão removida"); }}
                  className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="h-8">
            <Save className="h-3.5 w-3.5 mr-1.5" /> Salvar visão
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Salvar dashboard</DialogTitle>
            <DialogDescription>
              Salve a configuração atual de widgets como uma visão personalizada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="dash-name">Nome da visão</Label>
            <Input
              id="dash-name"
              placeholder="Ex: Fechamento mensal"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!name.trim()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
