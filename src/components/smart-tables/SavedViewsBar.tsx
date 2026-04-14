import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Bookmark, Plus, Trash2, Check } from "lucide-react";
import type { SmartTableView } from "@/hooks/useSmartTable";
import { cn } from "@/lib/utils";

interface SavedViewsBarProps {
  views: SmartTableView[];
  activeViewId?: string;
  onSave: (name: string) => void;
  onLoad: (view: SmartTableView) => void;
  onDelete: (id: string) => void;
  className?: string;
}

export function SavedViewsBar({
  views,
  activeViewId,
  onSave,
  onLoad,
  onDelete,
  className,
}: SavedViewsBarProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const handleSave = () => {
    if (!newName.trim()) return;
    onSave(newName.trim());
    setNewName("");
    setCreateOpen(false);
  };

  return (
    <div className={cn("flex items-center gap-1.5 flex-wrap", className)}>
      {views.map((view) => (
        <div key={view.id} className="flex items-center">
          <Button
            variant={activeViewId === view.id ? "default" : "outline"}
            size="sm"
            className="h-7 text-[10px] gap-1 rounded-r-none"
            onClick={() => onLoad(view)}
          >
            <Bookmark className="h-3 w-3" />
            {view.name}
            {activeViewId === view.id && <Check className="h-3 w-3 ml-0.5" />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-6 px-0 rounded-l-none border-l-0 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(view.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}

      <Popover open={createOpen} onOpenChange={setCreateOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1">
            <Plus className="h-3 w-3" /> Salvar view
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-52 p-2" align="start">
          <div className="space-y-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nome da view..."
              className="h-7 text-xs"
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              autoFocus
            />
            <Button size="sm" className="h-7 text-[10px] w-full" onClick={handleSave} disabled={!newName.trim()}>
              Salvar
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
