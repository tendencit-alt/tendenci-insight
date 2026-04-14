import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog, DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search, ChevronRight, Command,
  ShoppingCart, Truck, FolderKanban, FileText,
  Wallet, HandCoins, Landmark, ArrowLeftRight,
  BarChart3, PiggyBank, TrendingUp, Activity,
  FileBarChart, Cog, Shield, Building2,
  Users, Lock, Plug, SlidersHorizontal,
  Package, Tags, FolderTree, Briefcase,
} from "lucide-react";

const ALL_COMMANDS = [
  { label: "Pedidos", route: "/pedidos", icon: ShoppingCart, group: "Operações", keywords: "order compra venda" },
  { label: "Compras / Fornecedores", route: "/fornecedores", icon: Truck, group: "Operações", keywords: "supplier" },
  { label: "Projetos / Produção", route: "/producao", icon: FolderKanban, group: "Operações", keywords: "projeto obra" },
  { label: "Contratos", route: "/pedidos", icon: FileText, group: "Operações", keywords: "contrato recorrente" },
  { label: "Contas a Pagar", route: "/financeiro", icon: HandCoins, group: "Financeiro", keywords: "despesa pagar fornecedor" },
  { label: "Contas a Receber", route: "/financeiro", icon: Wallet, group: "Financeiro", keywords: "receita receber cliente" },
  { label: "Conciliação Bancária", route: "/financeiro", icon: ArrowLeftRight, group: "Financeiro", keywords: "banco conciliar extrato ofx" },
  { label: "Fluxo de Caixa", route: "/bi-dashboard", icon: Landmark, group: "Financeiro", keywords: "cash flow caixa saldo" },
  { label: "DRE", route: "/bi-dashboard", icon: BarChart3, group: "Controladoria", keywords: "demonstrativo resultado" },
  { label: "Orçamento", route: "/bi-dashboard", icon: PiggyBank, group: "Controladoria", keywords: "budget meta" },
  { label: "Forecast", route: "/bi-dashboard", icon: TrendingUp, group: "Controladoria", keywords: "previsão projeção" },
  { label: "KPIs Executivos", route: "/bi-dashboard", icon: Activity, group: "Controladoria", keywords: "indicador kpi" },
  { label: "Relatórios Financeiros", route: "/relatorios", icon: FileBarChart, group: "Relatórios", keywords: "report relatorio" },
  { label: "Relatórios Operacionais", route: "/relatorios", icon: Cog, group: "Relatórios", keywords: "" },
  { label: "Relatórios Comerciais", route: "/relatorios", icon: ShoppingCart, group: "Relatórios", keywords: "" },
  { label: "Relatórios de Auditoria", route: "/relatorios", icon: Shield, group: "Relatórios", keywords: "audit log" },
  { label: "Clientes", route: "/pedidos", icon: Users, group: "Cadastros", keywords: "client customer" },
  { label: "Fornecedores", route: "/fornecedores", icon: Truck, group: "Cadastros", keywords: "supplier" },
  { label: "Categorias", route: "/cadastros-financeiros", icon: Tags, group: "Cadastros", keywords: "categoria plano contas" },
  { label: "Centros de Custo", route: "/cadastros-financeiros", icon: FolderTree, group: "Cadastros", keywords: "cc centro custo" },
  { label: "Projetos Financeiros", route: "/cadastros-financeiros", icon: Briefcase, group: "Cadastros", keywords: "" },
  { label: "Usuários", route: "/settings/users", icon: Users, group: "Configurações", keywords: "user" },
  { label: "Permissões", route: "/settings/users", icon: Lock, group: "Configurações", keywords: "rbac role" },
  { label: "Empresa", route: "/settings", icon: Building2, group: "Configurações", keywords: "company" },
  { label: "Integrações", route: "/settings", icon: Plug, group: "Configurações", keywords: "api webhook" },
  { label: "Preferências", route: "/settings", icon: SlidersHorizontal, group: "Configurações", keywords: "" },
];

function addRecent(label: string, route: string) {
  try {
    const stored = localStorage.getItem("erp-home-recents");
    const recents: any[] = stored ? JSON.parse(stored) : [];
    const filtered = recents.filter((r: any) => r.label !== label);
    filtered.unshift({ label, route, time: new Date().toISOString() });
    localStorage.setItem("erp-home-recents", JSON.stringify(filtered.slice(0, 8)));
  } catch {}
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const navigate = useNavigate();

  // Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const results = useMemo(() => {
    if (!query.trim()) return ALL_COMMANDS;
    const q = query.toLowerCase();
    return ALL_COMMANDS.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.group.toLowerCase().includes(q) ||
        c.keywords.toLowerCase().includes(q)
    );
  }, [query]);

  // Reset selection on query change
  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  const handleSelect = useCallback(
    (cmd: (typeof ALL_COMMANDS)[0]) => {
      addRecent(cmd.label, cmd.route);
      navigate(cmd.route);
      setOpen(false);
      setQuery("");
    },
    [navigate]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && results[selectedIdx]) {
        e.preventDefault();
        handleSelect(results[selectedIdx]);
      }
    },
    [results, selectedIdx, handleSelect]
  );

  // Group results
  const grouped = useMemo(() => {
    const map = new Map<string, typeof ALL_COMMANDS>();
    results.forEach((cmd) => {
      if (!map.has(cmd.group)) map.set(cmd.group, []);
      map.get(cmd.group)!.push(cmd);
    });
    return map;
  }, [results]);

  let globalIdx = -1;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setQuery(""); }}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden" onKeyDown={handleKeyDown}>
        {/* Search input */}
        <div className="flex items-center border-b border-border px-3">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar módulo, funcionalidade..."
            className="border-0 focus-visible:ring-0 h-12 text-sm"
            autoFocus
          />
          <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 shrink-0 gap-1">
            <Command className="h-2.5 w-2.5" /> K
          </Badge>
        </div>

        {/* Results */}
        <div className="max-h-[360px] overflow-y-auto p-1.5">
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum resultado encontrado</p>
          ) : (
            Array.from(grouped.entries()).map(([group, cmds]) => (
              <div key={group} className="mb-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground px-2 py-1 uppercase tracking-wider">{group}</p>
                {cmds.map((cmd) => {
                  globalIdx++;
                  const idx = globalIdx;
                  return (
                    <button
                      key={cmd.label}
                      onClick={() => handleSelect(cmd)}
                      className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-colors ${
                        idx === selectedIdx ? "bg-primary/10 text-foreground" : "hover:bg-muted/60"
                      }`}
                    >
                      <cmd.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium flex-1 truncate">{cmd.label}</span>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="border-t border-border px-3 py-2 flex items-center gap-4 text-[10px] text-muted-foreground">
          <span>↑↓ navegar</span>
          <span>⏎ abrir</span>
          <span>Esc fechar</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
