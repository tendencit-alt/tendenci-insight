import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Users, UserPlus, Compass, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ResultKind = "cliente" | "arquiteto" | "lead";

interface Result {
  id: string;
  kind: ResultKind;
  title: string;
  subtitle?: string;
  route: string;
}

const KIND_META: Record<ResultKind, { label: string; icon: typeof Users; color: string }> = {
  cliente: { label: "Cliente", icon: Users, color: "text-sky-500" },
  arquiteto: { label: "Profissional Parceiro", icon: Compass, color: "text-violet-500" },
  lead: { label: "Lead", icon: UserPlus, color: "text-amber-500" },
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: Ctrl/Cmd + K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      const term = `%${q}%`;
      const [clientsRes, architectsRes, leadsRes] = await Promise.all([
        supabase
          .from("clients")
          .select("id, name, nome_fantasia, razao_social, email, city")
          .or(
            `name.ilike.${term},nome_fantasia.ilike.${term},razao_social.ilike.${term},email.ilike.${term},cpf_cnpj.ilike.${term}`
          )
          .limit(8),
        supabase
          .from("architects")
          .select("id, name, company, email, city")
          .or(`name.ilike.${term},company.ilike.${term},email.ilike.${term}`)
          .limit(8),
        supabase
          .from("leads")
          .select("id, name, company, email, status")
          .or(`name.ilike.${term},company.ilike.${term},email.ilike.${term}`)
          .limit(8),
      ]);

      const merged: Result[] = [];

      (clientsRes.data || []).forEach((c: any) => {
        merged.push({
          id: `cliente:${c.id}`,
          kind: "cliente",
          title: c.nome_fantasia || c.name || c.razao_social || "Cliente",
          subtitle: [c.email, c.city].filter(Boolean).join(" • "),
          route: `/clientes?focus=${c.id}`,
        });
      });
      (architectsRes.data || []).forEach((a: any) => {
        merged.push({
          id: `arquiteto:${a.id}`,
          kind: "arquiteto",
          title: a.name || "Profissional Parceiro",
          subtitle: [a.company, a.city].filter(Boolean).join(" • "),
          route: `/crm-comercial?tab=architects&focus=${a.id}`,
        });
      });
      (leadsRes.data || []).forEach((l: any) => {
        merged.push({
          id: `lead:${l.id}`,
          kind: "lead",
          title: l.name || "Lead",
          subtitle: [l.company, l.email, l.status].filter(Boolean).join(" • "),
          route: `/leads?focus=${l.id}`,
        });
      });

      setResults(merged);
      setActiveIdx(0);
      setLoading(false);
    }, 250);

    return () => clearTimeout(t);
  }, [query, open]);

  const grouped = useMemo(() => {
    const g: Record<ResultKind, Result[]> = { cliente: [], arquiteto: [], lead: [] };
    results.forEach((r) => g[r.kind].push(r));
    return g;
  }, [results]);

  const flatList = useMemo(
    () => [...grouped.cliente, ...grouped.arquiteto, ...grouped.lead],
    [grouped]
  );

  const choose = (r: Result) => {
    setOpen(false);
    setQuery("");
    setResults([]);
    navigate(r.route);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, flatList.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const r = flatList[activeIdx];
      if (r) choose(r);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="hidden md:flex items-center gap-2 h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground border-border/60 min-w-[200px] justify-start"
          title="Busca global (Ctrl+K)"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="flex-1 text-left">Buscar clientes, profissionais parceiros, leads...</span>
          <kbd className="hidden lg:inline-flex h-4 items-center gap-0.5 rounded border border-border bg-muted px-1 text-[9px] font-mono">
            ⌘K
          </kbd>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[420px] p-0"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Nome, e-mail, CNPJ, empresa..."
              className="pl-8 h-9"
            />
            {loading && (
              <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>
        <div className="max-h-[380px] overflow-y-auto p-1">
          {query.trim().length < 2 && (
            <div className="text-xs text-muted-foreground p-4 text-center">
              Digite pelo menos 2 caracteres para buscar
            </div>
          )}
          {query.trim().length >= 2 && !loading && flatList.length === 0 && (
            <div className="text-xs text-muted-foreground p-4 text-center">
              Nenhum resultado encontrado
            </div>
          )}
          {(["cliente", "arquiteto", "lead"] as ResultKind[]).map((kind) => {
            const items = grouped[kind];
            if (items.length === 0) return null;
            const meta = KIND_META[kind];
            const Icon = meta.icon;
            return (
              <div key={kind} className="mb-1">
                <div className="px-2 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {meta.label}s ({items.length})
                </div>
                {items.map((r) => {
                  const idx = flatList.indexOf(r);
                  const isActive = idx === activeIdx;
                  return (
                    <button
                      key={r.id}
                      onClick={() => choose(r)}
                      onMouseEnter={() => setActiveIdx(idx)}
                      className={cn(
                        "w-full flex items-start gap-2.5 px-2 py-2 rounded-md text-left text-sm transition-colors",
                        isActive ? "bg-accent" : "hover:bg-muted/50"
                      )}
                    >
                      <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", meta.color)} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{r.title}</div>
                        {r.subtitle && (
                          <div className="text-xs text-muted-foreground truncate">
                            {r.subtitle}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
