import { Bookmark, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SavedSearch } from "./types";

interface Props {
  saved: SavedSearch[];
  recent: string[];
  onLoad: (s: SavedSearch) => void;
  onLoadRecent: (q: string) => void;
  onRemove: (id: string) => void;
}

export function SavedSearchesPanel({ saved, recent, onLoad, onLoadRecent, onRemove }: Props) {
  if (saved.length === 0 && recent.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <Bookmark className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">Comece digitando para buscar</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Tente: "contas vencendo hoje", "pipeline parado", "dre do mês"
        </p>
      </div>
    );
  }

  return (
    <div className="p-2">
      {saved.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] font-semibold text-muted-foreground px-2 py-1 uppercase tracking-wider">
            Buscas Salvas
          </p>
          {saved.map((s) => (
            <div
              key={s.id}
              className="group flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/60"
            >
              <Bookmark className="h-3.5 w-3.5 text-primary shrink-0" />
              <button
                onClick={() => onLoad(s)}
                className="flex-1 text-left text-sm truncate"
              >
                <span className="font-medium">{s.name}</span>
                <span className="text-muted-foreground ml-2 text-xs">"{s.query}"</span>
              </button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                onClick={() => onRemove(s.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {recent.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground px-2 py-1 uppercase tracking-wider">
            Buscas Recentes
          </p>
          {recent.slice(0, 6).map((q) => (
            <button
              key={q}
              onClick={() => onLoadRecent(q)}
              className="flex items-center gap-2 px-2 py-1.5 w-full text-left rounded-md hover:bg-muted/60 text-sm text-muted-foreground"
            >
              <span className="truncate">{q}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
