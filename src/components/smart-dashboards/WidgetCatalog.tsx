import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WIDGET_REGISTRY } from "./widgetRegistry";
import { cn } from "@/lib/utils";
import type { DashboardProfile, WidgetInstance } from "./types";

interface Props {
  profile: DashboardProfile;
  current: WidgetInstance[];
  onAdd: (widgetId: string) => void;
}

export function WidgetCatalog({ profile, current, onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const usedIds = new Set(current.map((w) => w.widgetId));

  const available = Object.values(WIDGET_REGISTRY)
    .filter((w) => w.profiles.includes(profile))
    .filter((w) => !usedIds.has(w.id))
    .filter(
      (w) =>
        !query ||
        w.title.toLowerCase().includes(query.toLowerCase()) ||
        w.description.toLowerCase().includes(query.toLowerCase())
    );

  const others = Object.values(WIDGET_REGISTRY)
    .filter((w) => !w.profiles.includes(profile))
    .filter((w) => !usedIds.has(w.id))
    .filter(
      (w) =>
        !query ||
        w.title.toLowerCase().includes(query.toLowerCase()) ||
        w.description.toLowerCase().includes(query.toLowerCase())
    );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Adicionar widget
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Adicionar widget</DialogTitle>
          <DialogDescription>Escolha um widget para incluir no seu dashboard</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar widget..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <ScrollArea className="h-[420px] pr-3">
          {available.length > 0 && (
            <>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                Recomendados para o perfil
              </h4>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {available.map((w) => (
                  <WidgetCard key={w.id} widget={w} onAdd={() => { onAdd(w.id); setOpen(false); }} />
                ))}
              </div>
            </>
          )}
          {others.length > 0 && (
            <>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 mt-2">
                Outros widgets
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {others.map((w) => (
                  <WidgetCard key={w.id} widget={w} onAdd={() => { onAdd(w.id); setOpen(false); }} />
                ))}
              </div>
            </>
          )}
          {available.length === 0 && others.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">Nenhum widget disponível</p>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function WidgetCard({ widget, onAdd }: { widget: typeof WIDGET_REGISTRY[string]; onAdd: () => void }) {
  const Icon = widget.icon;
  return (
    <button
      onClick={onAdd}
      className={cn(
        "text-left p-3 rounded-lg border hover:border-primary hover:bg-muted/50 transition-colors"
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className="h-4 w-4 text-primary" />}
        <span className="font-medium text-sm">{widget.title}</span>
      </div>
      <p className="text-xs text-muted-foreground line-clamp-2">{widget.description}</p>
    </button>
  );
}
