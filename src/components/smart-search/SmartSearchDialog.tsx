import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Sparkles, Bookmark, Loader2 } from "lucide-react";
import { useSmartSearch } from "@/hooks/useSmartSearch";
import { SearchResultItem } from "./SearchResultItem";
import { SavedSearchesPanel } from "./SavedSearchesPanel";
import type { SearchResult } from "./types";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GROUP_LABELS: Record<string, string> = {
  intent: "Ações Inteligentes",
  client: "Clientes",
  supplier: "Fornecedores",
  order: "Pedidos",
  project: "Projetos",
  payable: "Contas a Pagar",
  receivable: "Contas a Receber",
  expense: "Despesas",
  revenue: "Receitas",
  report: "KPI's",
  dashboard: "Dashboards",
  integration: "Integrações",
  goal: "Metas",
  ticket: "Tickets",
  action: "Ações",
};

export function SmartSearchDialog({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const {
    query, setQuery, results, loading, intent, context,
    savedSearches, recentQueries, saveSearch, removeSavedSearch,
    loadSavedSearch, trackAction, trackAbandon,
  } = useSmartSearch();

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [savingMode, setSavingMode] = useState(false);
  const [saveName, setSaveName] = useState("");

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  useEffect(() => {
    if (!open) {
      trackAbandon();
      setQuery("");
      setSavingMode(false);
      setSaveName("");
    }
  }, [open, trackAbandon, setQuery]);

  const grouped = useMemo(() => {
    const map = new Map<string, SearchResult[]>();
    for (const r of results) {
      if (!map.has(r.type)) map.set(r.type, []);
      map.get(r.type)!.push(r);
    }
    return map;
  }, [results]);

  const flatResults = useMemo(() => results, [results]);

  const handleSelect = useCallback(
    (r: SearchResult) => {
      trackAction(query, `select:${r.type}`);
      if (r.route) navigate(r.route);
      onOpenChange(false);
    },
    [navigate, onOpenChange, query, trackAction]
  );

  const handleAction = useCallback(
    (r: SearchResult, actionId: string) => {
      trackAction(query, `${actionId}:${r.type}`);
      if (actionId === "mark-paid") {
        toast.success(`"${r.title}" marcada como paga`);
      } else if (actionId === "mark-received") {
        toast.success(`"${r.title}" marcada como recebida`);
      } else if (actionId === "reschedule") {
        toast.info(`Reagendar "${r.title}"`);
      } else if (actionId === "view-margin") {
        navigate(`/relatorios?tab=margin&entity=${r.id}`);
        onOpenChange(false);
      } else if (actionId === "edit") {
        if (r.route) navigate(r.route + "&edit=1");
        onOpenChange(false);
      }
    },
    [navigate, onOpenChange, query, trackAction]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, flatResults.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && flatResults[selectedIdx]) {
        e.preventDefault();
        handleSelect(flatResults[selectedIdx]);
      }
    },
    [flatResults, selectedIdx, handleSelect]
  );

  const handleSave = () => {
    if (!saveName.trim()) {
      toast.error("Dê um nome para a busca salva");
      return;
    }
    saveSearch(saveName);
    toast.success(`Busca "${saveName}" salva`);
    setSavingMode(false);
    setSaveName("");
  };

  let globalIdx = -1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl p-0 gap-0 overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center border-b border-border px-3">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar registros, ações inteligentes ou intenções..."
            className="border-0 focus-visible:ring-0 h-12 text-sm"
            autoFocus
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />}
          <Badge variant="outline" className="text-[10px] shrink-0">
            {context}
          </Badge>
        </div>

        {/* Intent banner */}
        {intent && (
          <div className="bg-primary/5 border-b border-primary/10 px-4 py-2 flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-xs">
              <span className="text-muted-foreground">Detectamos a intenção:</span>{" "}
              <span className="font-medium text-foreground">{intent.label}</span>
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 ml-auto text-xs"
              onClick={() => {
                navigate(intent.route);
                trackAction(query, `intent:${intent.key}`);
                onOpenChange(false);
              }}
            >
              Ir agora →
            </Button>
          </div>
        )}

        {/* Body */}
        <div className="max-h-[480px] overflow-y-auto">
          {!query.trim() ? (
            <SavedSearchesPanel
              saved={savedSearches}
              recent={recentQueries}
              onLoad={loadSavedSearch}
              onLoadRecent={setQuery}
              onRemove={removeSavedSearch}
            />
          ) : results.length === 0 && !loading ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">Nenhum resultado encontrado</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Tente outros termos ou uma intenção como "contas vencendo hoje"
              </p>
            </div>
          ) : (
            <div className="p-1.5">
              {Array.from(grouped.entries()).map(([type, items]) => (
                <div key={type} className="mb-2">
                  <p className="text-[10px] font-semibold text-muted-foreground px-2 py-1 uppercase tracking-wider">
                    {GROUP_LABELS[type] || type}
                  </p>
                  {items.map((r) => {
                    globalIdx++;
                    const idx = globalIdx;
                    return (
                      <SearchResultItem
                        key={r.id}
                        result={r}
                        selected={idx === selectedIdx}
                        onSelect={handleSelect}
                        onAction={handleAction}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-3 py-2 flex items-center gap-3 text-[10px] text-muted-foreground">
          <span>↑↓ navegar</span>
          <span>⏎ abrir</span>
          <span>Esc fechar</span>
          {query.trim() && results.length > 0 && (
            <div className="ml-auto flex items-center gap-2">
              {savingMode ? (
                <>
                  <Input
                    autoFocus
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder="Nome da busca..."
                    className="h-6 text-xs w-40"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSave();
                      if (e.key === "Escape") setSavingMode(false);
                    }}
                  />
                  <Button size="sm" className="h-6 text-xs px-2" onClick={handleSave}>
                    Salvar
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-xs"
                  onClick={() => setSavingMode(true)}
                >
                  <Bookmark className="h-3 w-3 mr-1" />
                  Salvar busca
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
