import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, Star, Clock, ChevronRight, Pencil,
  ShoppingCart, Truck, FolderKanban, FileText,
  Wallet, HandCoins, Landmark, ArrowLeftRight,
  BarChart3, PiggyBank, TrendingUp, Activity,
  FileBarChart, Cog, Shield, Building2,
  Users, Lock, Plug, SlidersHorizontal,
  Package, Tags, FolderTree, Briefcase,
  LayoutGrid, AlertTriangle, Plus, CreditCard,
  UserPlus, Zap, PlayCircle,
} from "lucide-react";
import {
  useActionItems,
  useContinueItems,
  useUserProfile,
  getModuleOrder,
} from "@/hooks/useSmartLauncher";

// ─── Module definitions ───
const MODULES = [
  {
    key: "operacoes",
    label: "Operações",
    desc: "Pedidos, compras, projetos e contratos",
    icon: ShoppingCart,
    color: "from-blue-500/10 to-blue-600/5 dark:from-blue-500/20 dark:to-blue-600/10",
    iconColor: "text-blue-600 dark:text-blue-400",
    borderColor: "border-blue-200/60 dark:border-blue-800/40",
    items: [
      { label: "Pedidos", route: "/pedidos", icon: ShoppingCart },
      { label: "Compras", route: "/fornecedores", icon: Truck },
      { label: "Projetos", route: "/producao", icon: FolderKanban },
      { label: "Contratos", route: "/pedidos", icon: FileText },
    ],
  },
  {
    key: "financeiro",
    label: "Financeiro",
    desc: "Contas, conciliação e fluxo de caixa",
    icon: Wallet,
    color: "from-emerald-500/10 to-emerald-600/5 dark:from-emerald-500/20 dark:to-emerald-600/10",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    borderColor: "border-emerald-200/60 dark:border-emerald-800/40",
    items: [
      { label: "Contas a Pagar", route: "/financeiro", icon: HandCoins },
      { label: "Contas a Receber", route: "/financeiro", icon: Wallet },
      { label: "Conciliação", route: "/financeiro", icon: ArrowLeftRight },
      { label: "Fluxo de Caixa", route: "/bi-dashboard", icon: Landmark },
    ],
  },
  {
    key: "controladoria",
    label: "Controladoria",
    desc: "DRE, orçamento, forecast e KPIs",
    icon: BarChart3,
    color: "from-violet-500/10 to-violet-600/5 dark:from-violet-500/20 dark:to-violet-600/10",
    iconColor: "text-violet-600 dark:text-violet-400",
    borderColor: "border-violet-200/60 dark:border-violet-800/40",
    items: [
      { label: "DRE", route: "/bi-dashboard", icon: BarChart3 },
      { label: "Orçamento", route: "/bi-dashboard", icon: PiggyBank },
      { label: "Forecast", route: "/bi-dashboard", icon: TrendingUp },
      { label: "KPIs Executivos", route: "/bi-dashboard", icon: Activity },
    ],
  },
  {
    key: "relatorios",
    label: "Relatórios",
    desc: "Financeiros, operacionais e auditoria",
    icon: FileBarChart,
    color: "from-amber-500/10 to-amber-600/5 dark:from-amber-500/20 dark:to-amber-600/10",
    iconColor: "text-amber-600 dark:text-amber-400",
    borderColor: "border-amber-200/60 dark:border-amber-800/40",
    items: [
      { label: "Financeiros", route: "/relatorios", icon: FileBarChart },
      { label: "Operacionais", route: "/relatorios", icon: Cog },
      { label: "Comerciais", route: "/relatorios", icon: ShoppingCart },
      { label: "Auditoria", route: "/relatorios", icon: Shield },
    ],
  },
  {
    key: "cadastros",
    label: "Cadastros",
    desc: "Clientes, fornecedores e estruturas",
    icon: Package,
    color: "from-sky-500/10 to-sky-600/5 dark:from-sky-500/20 dark:to-sky-600/10",
    iconColor: "text-sky-600 dark:text-sky-400",
    borderColor: "border-sky-200/60 dark:border-sky-800/40",
    items: [
      { label: "Clientes", route: "/pedidos", icon: Users },
      { label: "Fornecedores", route: "/fornecedores", icon: Truck },
      { label: "Categorias", route: "/cadastros-financeiros", icon: Tags },
      { label: "Centro de Custo", route: "/cadastros-financeiros", icon: FolderTree },
      { label: "Projetos", route: "/cadastros-financeiros", icon: Briefcase },
    ],
  },
  {
    key: "configuracoes",
    label: "Configurações",
    desc: "Usuários, permissões e integrações",
    icon: SlidersHorizontal,
    color: "from-gray-500/10 to-gray-600/5 dark:from-gray-500/20 dark:to-gray-600/10",
    iconColor: "text-muted-foreground",
    borderColor: "border-border",
    items: [
      { label: "Usuários", route: "/settings/users", icon: Users },
      { label: "Permissões", route: "/settings/users", icon: Lock },
      { label: "Empresa", route: "/settings", icon: Building2 },
      { label: "Integrações", route: "/settings", icon: Plug },
      { label: "Preferências", route: "/settings", icon: SlidersHorizontal },
    ],
  },
];

const SEARCHABLE_ITEMS = MODULES.flatMap((m) =>
  m.items.map((item) => ({ ...item, module: m.label }))
);

const QUICK_ACTIONS = [
  { label: "Novo Pedido", icon: ShoppingCart, route: "/pedidos", color: "text-blue-600 dark:text-blue-400" },
  { label: "Nova Despesa", icon: CreditCard, route: "/financeiro", color: "text-red-500 dark:text-red-400" },
  { label: "Nova Receita", icon: Plus, route: "/financeiro", color: "text-emerald-600 dark:text-emerald-400" },
  { label: "Conciliar Banco", icon: ArrowLeftRight, route: "/financeiro", color: "text-violet-600 dark:text-violet-400" },
  { label: "Criar Cliente", icon: UserPlus, route: "/pedidos", color: "text-sky-600 dark:text-sky-400" },
];

const DEFAULT_FAVORITES = [
  { label: "DRE", route: "/bi-dashboard", icon: "BarChart3" },
  { label: "Fluxo de Caixa", route: "/bi-dashboard", icon: "Landmark" },
  { label: "Contas a Pagar", route: "/financeiro", icon: "HandCoins" },
  { label: "Contas a Receber", route: "/financeiro", icon: "Wallet" },
  { label: "Pedidos", route: "/pedidos", icon: "ShoppingCart" },
  { label: "Conciliação", route: "/financeiro", icon: "ArrowLeftRight" },
];

const ICON_MAP: Record<string, any> = {
  BarChart3, Landmark, HandCoins, Wallet, ShoppingCart, ArrowLeftRight,
  FolderKanban, FileText, Truck, PiggyBank, TrendingUp, Activity,
  FileBarChart, Cog, Shield, Users, Lock, Building2, Plug, SlidersHorizontal,
  Package, Tags, FolderTree, Briefcase,
};

function getFavoritesFromStorage(): typeof DEFAULT_FAVORITES {
  try {
    const stored = localStorage.getItem("erp-home-favorites");
    if (stored) return JSON.parse(stored);
  } catch {}
  return DEFAULT_FAVORITES;
}

function getRecentsFromStorage(): { label: string; route: string; time: string }[] {
  try {
    const stored = localStorage.getItem("erp-home-recents");
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

function addRecent(label: string, route: string) {
  const recents = getRecentsFromStorage().filter((r) => r.label !== label);
  recents.unshift({ label, route, time: new Date().toISOString() });
  localStorage.setItem("erp-home-recents", JSON.stringify(recents.slice(0, 8)));
}

// ─── Severity helpers ───
const SEVERITY_STYLES = {
  red: "border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30",
  yellow: "border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30",
  green: "border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30",
};
const SEVERITY_DOT = {
  red: "bg-red-500",
  yellow: "bg-amber-500",
  green: "bg-emerald-500",
};

export default function HomeLauncher() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [favorites, setFavorites] = useState(getFavoritesFromStorage);
  const [editFavDialog, setEditFavDialog] = useState(false);
  const [tempFavorites, setTempFavorites] = useState<typeof DEFAULT_FAVORITES>([]);

  const { data: actionItems = [], isLoading: loadingActions } = useActionItems();
  const continueItems = useContinueItems();
  const userProfile = useUserProfile();
  const moduleOrder = getModuleOrder(userProfile);

  const orderedModules = useMemo(() => {
    return [...MODULES].sort((a, b) => moduleOrder.indexOf(a.key) - moduleOrder.indexOf(b.key));
  }, [moduleOrder]);

  useEffect(() => {
    localStorage.setItem("erp-home-favorites", JSON.stringify(favorites));
  }, [favorites]);

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return SEARCHABLE_ITEMS.filter(
      (item) => item.label.toLowerCase().includes(q) || item.module.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [search]);

  const handleNavigate = (label: string, route: string) => {
    addRecent(label, route);
    navigate(route);
  };

  const openEditFavorites = () => {
    setTempFavorites([...favorites]);
    setEditFavDialog(true);
  };

  const toggleFavorite = (item: (typeof SEARCHABLE_ITEMS)[0]) => {
    const exists = tempFavorites.some((f) => f.label === item.label);
    if (exists) {
      setTempFavorites(tempFavorites.filter((f) => f.label !== item.label));
    } else if (tempFavorites.length < 8) {
      const iconName = Object.entries(ICON_MAP).find(([, v]) => v === item.icon)?.[0] || "BarChart3";
      setTempFavorites([...tempFavorites, { label: item.label, route: item.route, icon: iconName }]);
    }
  };

  const saveFavorites = () => {
    setFavorites(tempFavorites);
    setEditFavDialog(false);
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6 pb-8">
        {/* ── Header + Search ── */}
        <div className="text-center space-y-4 pt-4">
          <div className="flex items-center justify-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <LayoutGrid className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Central de Navegação</h1>
          </div>
          <div className="relative max-w-lg mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar pedido, cliente, lançamento, categoria..."
              className="pl-10 h-11 bg-card border-border text-sm rounded-xl"
            />
            {searchResults.length > 0 && (
              <Card className="absolute top-full left-0 right-0 mt-1 z-50 shadow-lg">
                <CardContent className="p-1">
                  {searchResults.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => { setSearch(""); handleNavigate(item.label, item.route); }}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left hover:bg-muted/60 transition-colors"
                    >
                      <item.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.label}</p>
                        <p className="text-[10px] text-muted-foreground">{item.module}</p>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* ── Hoje Preciso Fazer ── */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> Hoje Preciso Fazer
          </h2>
          {loadingActions ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
          ) : actionItems.length === 0 ? (
            <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <p className="text-sm text-muted-foreground">Tudo em dia! Nenhuma pendência urgente.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {actionItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.label, item.route)}
                  className={`rounded-xl border p-3 text-left transition-all hover:shadow-md hover:-translate-y-0.5 ${SEVERITY_STYLES[item.severity]}`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`h-2.5 w-2.5 rounded-full mt-1.5 shrink-0 ${SEVERITY_DOT[item.severity]}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{item.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{item.detail}</p>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Quick Actions ── */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" /> Ações Rápidas
          </h2>
          <div className="flex flex-wrap gap-2">
            {QUICK_ACTIONS.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                size="sm"
                className="h-9 text-xs gap-2 rounded-lg hover:shadow-sm"
                onClick={() => handleNavigate(action.label, action.route)}
              >
                <action.icon className={`h-3.5 w-3.5 ${action.color}`} />
                {action.label}
              </Button>
            ))}
          </div>
        </div>

        {/* ── Favorites ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-semibold">Favoritos</h2>
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground" onClick={openEditFavorites}>
              <Pencil className="h-3 w-3" /> Editar
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {favorites.map((fav, i) => {
              const Icon = ICON_MAP[fav.icon] || Star;
              return (
                <button
                  key={i}
                  onClick={() => handleNavigate(fav.label, fav.route)}
                  className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-card/50 p-3 hover:bg-muted/60 hover:border-primary/20 transition-all duration-200"
                >
                  <div className="h-9 w-9 rounded-lg bg-primary/10 dark:bg-primary/15 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-[11px] font-medium text-center leading-tight">{fav.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Continue Where Left Off ── */}
        {continueItems.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <PlayCircle className="h-4 w-4 text-muted-foreground" /> Continuar de Onde Parei
            </h2>
            <div className="flex flex-wrap gap-2">
              {continueItems.map((r, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5 rounded-lg"
                  onClick={() => handleNavigate(r.label, r.route)}
                >
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  {r.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* ── Module Grid (profile-ordered) ── */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-muted-foreground" /> Módulos
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {orderedModules.map((mod) => {
              const isExpanded = expandedModule === mod.key;
              return (
                <Card
                  key={mod.key}
                  className={`relative overflow-hidden border transition-all duration-300 cursor-pointer ${mod.borderColor} ${isExpanded ? "ring-1 ring-primary/20 shadow-md" : "hover:shadow-md"}`}
                  onClick={() => setExpandedModule(isExpanded ? null : mod.key)}
                >
                  <CardContent className="p-0">
                    <div className={`bg-gradient-to-br ${mod.color} p-4`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-background/80 dark:bg-background/40 flex items-center justify-center shadow-sm">
                            <mod.icon className={`h-5 w-5 ${mod.iconColor}`} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm">{mod.label}</h3>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{mod.desc}</p>
                          </div>
                        </div>
                        <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform duration-200 mt-1 ${isExpanded ? "rotate-90" : ""}`} />
                      </div>
                    </div>
                    <div className={`grid transition-all duration-300 overflow-hidden ${isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                      <div className="overflow-hidden">
                        <div className="p-2 border-t border-border/50 space-y-0.5">
                          {mod.items.map((item, j) => (
                            <button
                              key={j}
                              onClick={(e) => { e.stopPropagation(); handleNavigate(item.label, item.route); }}
                              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-left hover:bg-muted/60 transition-colors group/item"
                            >
                              <item.icon className={`h-3.5 w-3.5 ${mod.iconColor} opacity-70 group-hover/item:opacity-100 transition-opacity`} />
                              <span className="text-xs font-medium flex-1">{item.label}</span>
                              <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover/item:opacity-100 transition-opacity" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Edit Favorites Dialog ── */}
      <Dialog open={editFavDialog} onOpenChange={setEditFavDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" /> Editar Favoritos
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[400px] pr-2">
            <div className="space-y-4">
              {MODULES.map((mod) => (
                <div key={mod.key}>
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5">{mod.label}</p>
                  <div className="space-y-1">
                    {mod.items.map((item, j) => {
                      const checked = tempFavorites.some((f) => f.label === item.label);
                      return (
                        <label
                          key={j}
                          className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleFavorite({ ...item, module: mod.label })}
                            disabled={!checked && tempFavorites.length >= 8}
                          />
                          <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium">{item.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="flex items-center justify-between pt-2">
            <Badge variant="outline" className="text-[10px]">{tempFavorites.length}/8 selecionados</Badge>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditFavDialog(false)}>Cancelar</Button>
              <Button size="sm" onClick={saveFavorites}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
