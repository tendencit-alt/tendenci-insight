import * as LucideIcons from "lucide-react";
import { Pin, PinOff, Star, StarOff, RotateCcw, Search } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useSmartShortcuts } from "@/hooks/useSmartShortcuts";
import type { Shortcut } from "./types";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShortcutSettingsDialog({ open, onOpenChange }: Props) {
  const {
    allShortcuts,
    quickIds,
    personalIds,
    toggleQuickBar,
    togglePersonal,
    resetQuickBar,
    usageStats,
  } = useSmartShortcuts();

  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allShortcuts;
    return allShortcuts.filter(
      (s) =>
        s.label.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
    );
  }, [allShortcuts, query]);

  const grouped = useMemo(() => {
    const groups: Record<string, Shortcut[]> = {};
    filtered.forEach((s) => {
      const key = s.category;
      (groups[key] = groups[key] || []).push(s);
    });
    return groups;
  }, [filtered]);

  const categoryLabels: Record<string, string> = {
    create: "Criar",
    navigate: "Navegação",
    report: "KPI's",
    action: "Ações",
    context: "Contextuais",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Personalizar atalhos</DialogTitle>
          <DialogDescription>
            Fixe atalhos na barra de acesso rápido (até 8) e nos seus favoritos pessoais.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="all" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="self-start">
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="quick">
              Acesso rápido <Badge variant="secondary" className="ml-2">{quickIds.length}/8</Badge>
            </TabsTrigger>
            <TabsTrigger value="personal">
              Meus atalhos <Badge variant="secondary" className="ml-2">{personalIds.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="usage">Uso</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2 my-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar atalho..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
            <Button variant="outline" size="sm" onClick={resetQuickBar} className="gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" />
              Restaurar padrão
            </Button>
          </div>

          <TabsContent value="all" className="flex-1 overflow-hidden mt-0">
            <ScrollArea className="h-[400px] pr-3">
              {Object.entries(grouped).map(([cat, items]) => (
                <div key={cat} className="mb-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    {categoryLabels[cat] || cat}
                  </h4>
                  <div className="space-y-1.5">
                    {items.map((s) => (
                      <ShortcutRow
                        key={s.id}
                        shortcut={s}
                        inQuick={quickIds.includes(s.id)}
                        inPersonal={personalIds.includes(s.id)}
                        canAddQuick={quickIds.length < 8 || quickIds.includes(s.id)}
                        onToggleQuick={() => toggleQuickBar(s.id)}
                        onTogglePersonal={() => togglePersonal(s.id)}
                      />
                    ))}
                  </div>
                  <Separator className="mt-3" />
                </div>
              ))}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="quick" className="flex-1 overflow-hidden mt-0">
            <ScrollArea className="h-[400px] pr-3">
              <div className="space-y-1.5">
                {quickIds.map((id) => {
                  const s = allShortcuts.find((x) => x.id === id);
                  if (!s) return null;
                  return (
                    <ShortcutRow
                      key={s.id}
                      shortcut={s}
                      inQuick
                      inPersonal={personalIds.includes(s.id)}
                      canAddQuick
                      onToggleQuick={() => toggleQuickBar(s.id)}
                      onTogglePersonal={() => togglePersonal(s.id)}
                    />
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="personal" className="flex-1 overflow-hidden mt-0">
            <ScrollArea className="h-[400px] pr-3">
              <div className="space-y-1.5">
                {personalIds.map((id) => {
                  const s = allShortcuts.find((x) => x.id === id);
                  if (!s) return null;
                  return (
                    <ShortcutRow
                      key={s.id}
                      shortcut={s}
                      inQuick={quickIds.includes(s.id)}
                      inPersonal
                      canAddQuick={quickIds.length < 8 || quickIds.includes(s.id)}
                      onToggleQuick={() => toggleQuickBar(s.id)}
                      onTogglePersonal={() => togglePersonal(s.id)}
                    />
                  );
                })}
                {personalIds.length === 0 && (
                  <p className="text-xs text-muted-foreground p-4 text-center">
                    Nenhum atalho favorito ainda. Adicione na aba "Todos".
                  </p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="usage" className="flex-1 overflow-hidden mt-0">
            <ScrollArea className="h-[400px] pr-3 space-y-4">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Mais usados ({usageStats.total} acionamentos)
                </h4>
                {usageStats.mostUsed.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sem dados ainda.</p>
                ) : (
                  <div className="space-y-1.5">
                    {usageStats.mostUsed.map(({ id, count, shortcut }) => {
                      const Icon = (LucideIcons as any)[shortcut!.icon] || LucideIcons.Zap;
                      return (
                        <div key={id} className="flex items-center gap-2 p-2 rounded border bg-card">
                          <Icon className="h-4 w-4 text-primary" />
                          <span className="text-sm flex-1">{shortcut!.label}</span>
                          <Badge variant="secondary">{count}x</Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <Separator className="my-4" />

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Nunca usados
                </h4>
                <div className="space-y-1">
                  {usageStats.ignored.map((s) => {
                    const Icon = (LucideIcons as any)[s.icon] || LucideIcons.Zap;
                    return (
                      <div key={s.id} className="flex items-center gap-2 p-2 rounded text-xs text-muted-foreground">
                        <Icon className="h-3.5 w-3.5" />
                        {s.label}
                      </div>
                    );
                  })}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function ShortcutRow({
  shortcut,
  inQuick,
  inPersonal,
  canAddQuick,
  onToggleQuick,
  onTogglePersonal,
}: {
  shortcut: Shortcut;
  inQuick: boolean;
  inPersonal: boolean;
  canAddQuick: boolean;
  onToggleQuick: () => void;
  onTogglePersonal: () => void;
}) {
  const Icon = (LucideIcons as any)[shortcut.icon] || LucideIcons.Zap;

  return (
    <div className="flex items-center gap-3 p-2 rounded-md border bg-card hover:bg-accent/50 transition-colors">
      <Icon className="h-4 w-4 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{shortcut.label}</p>
        {shortcut.description && (
          <p className="text-[11px] text-muted-foreground truncate">{shortcut.description}</p>
        )}
      </div>
      {shortcut.keys && (
        <kbd className="hidden sm:inline-flex items-center rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
          {shortcut.keys.toUpperCase()}
        </kbd>
      )}
      <Button
        variant="ghost"
        size="icon"
        className={cn("h-7 w-7", inPersonal && "text-primary")}
        onClick={onTogglePersonal}
        aria-label={inPersonal ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      >
        {inPersonal ? <Star className="h-3.5 w-3.5 fill-current" /> : <StarOff className="h-3.5 w-3.5" />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={cn("h-7 w-7", inQuick && "text-primary")}
        onClick={onToggleQuick}
        disabled={!canAddQuick}
        aria-label={inQuick ? "Remover do acesso rápido" : "Fixar no acesso rápido"}
      >
        {inQuick ? <Pin className="h-3.5 w-3.5 fill-current" /> : <PinOff className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}
