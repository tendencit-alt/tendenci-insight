import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Home, ShoppingCart, Factory, Wallet, BookOpen, Target,
  Settings, Building2, ChevronDown,
  Users, FileText, Briefcase, DollarSign,
  Package, Layers, CreditCard, ArrowLeftRight, BarChart,
  TrendingUp, Calculator, History, Zap, Shield,
  LineChart, PieChart, UserCog, Link2,
  Landmark, Wrench,
  Star, AlertTriangle, UserCheck,
  Brain, Telescope, GraduationCap,
  Network, GitBranch, LifeBuoy, Clock, ListChecks, ShieldCheck,
  Bug, Sparkles, Tag, Rocket, LayoutGrid, Gauge, Database, Truck
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useNavigationUsage } from "@/hooks/useNavigationUsage";
import { useAttentionLayer, type AttentionLevel } from "@/hooks/useAttentionLayer";

import { useFavorites } from "@/hooks/useFavorites";
import { cn } from "@/lib/utils";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ComingSoonBadge, ComingSoonItem, isComingSoon } from "@/lib/comingSoon";

// ── Types ──
interface MenuItem {
  title: string;
  url: string;
  icon: any;
  comingSoon?: boolean;
  module?: string;
}

interface MenuGroup {
  label: string;
  icon: any;
  items: MenuItem[];
  separator?: boolean;
  profiles?: string[];
}

// ── Storage keys ──
const STORAGE_KEY_GROUP = "erp_sidebar_last_group";

// ── Role config ──
type RoleKey = "owner" | "financeiro" | "comercial" | "operacional" | "admin";

interface RoleConfig {
  autoExpandGroups: string[];
  highlightItems: string[];
  dimGroups: string[];
}

const ROLE_CONFIGS: Record<RoleKey, RoleConfig> = {
  owner: {
    autoExpandGroups: ["Owner · Operação", "Hoje", "Estratégia", "Financeiro"],
    highlightItems: [],
    dimGroups: [],
  },
  financeiro: {
    autoExpandGroups: ["Financeiro"],
    highlightItems: ["/financeiro", "/cadastros-financeiros", "/bi-dashboard"],
    dimGroups: ["Operações", "Comercial"],
  },
  comercial: {
    autoExpandGroups: ["Comercial"],
    highlightItems: ["/pedidos", "/crm"],
    dimGroups: ["Operações"],
  },
  operacional: {
    autoExpandGroups: ["Operações"],
    highlightItems: ["/producao-operacoes"],
    dimGroups: ["Estratégia"],
  },
  admin: {
    autoExpandGroups: ["Hoje"],
    highlightItems: [],
    dimGroups: [],
  },
};

// ══════════════════════════════════════════════════════════════════
// ═══ INTENT-BASED NAVIGATION GROUPS ═══
// ══════════════════════════════════════════════════════════════════
const menuGroups: MenuGroup[] = [
  // ── HOJE ──
  {
    label: "Hoje",
    icon: Home,
    items: [
      { title: "Central de Navegação", url: "/central-navegacao", icon: Home },
      { title: "Control Tower", url: "/control-tower", icon: Landmark },
      { title: "Executive Center", url: "/executive", icon: LineChart },
    ],
  },
  // ── FINANCEIRO ──
  {
    label: "Financeiro",
    icon: Wallet,
    separator: true,
    items: [
      { title: "Tesouraria", url: "/financeiro", icon: Wallet, module: "financeiro" },
      { title: "RH / PJ", url: "/financeiro/rh-pj", icon: UserCheck, module: "financeiro" },
      { title: "Contas a Receber", url: "/contas-receber", icon: TrendingUp, comingSoon: true, module: "financeiro" },
      { title: "Contas a Pagar", url: "/contas-pagar", icon: CreditCard, comingSoon: true, module: "financeiro" },
      { title: "Conciliação Bancária", url: "/conciliacao", icon: ArrowLeftRight, comingSoon: true, module: "financeiro" },
      { title: "DRE Gerencial", url: "/dre", icon: LineChart, comingSoon: true, module: "financeiro" },
      { title: "Fluxo de Caixa", url: "/fluxo-caixa", icon: BarChart, comingSoon: true, module: "financeiro" },
      { title: "Forecast Financeiro", url: "/resultado-financeiro", icon: Calculator, comingSoon: true, module: "financeiro" },
      { title: "Metas Financeiras", url: "/planning", icon: Target, module: "financeiro" },
      { title: "Plano de Contas", url: "/cadastros-financeiros?tab=chart", icon: BookOpen, module: "cadastros_financeiros" },
      { title: "Cadastros Financeiros", url: "/cadastros-financeiros?tab=bank-accounts", icon: Database, module: "cadastros_financeiros" },
      { title: "BI", url: "/dashboard", icon: PieChart, module: "dashboard" },
    ],
  },
  // ── VENDAS ──
  {
    label: "Comercial",
    icon: ShoppingCart,
    separator: true,
    items: [
      { title: "CRM", url: "/crm", icon: Target, module: "comercial" },
      { title: "Pedidos", url: "/pedidos", icon: ShoppingCart, module: "pedidos" },
      { title: "Contatos", url: "/contatos", icon: Users, module: "comercial" },
      { title: "Catálogo de Produtos", url: "/catalogo", icon: BookOpen, module: "comercial" },
      { title: "Comissões", url: "/comissoes", icon: DollarSign, comingSoon: true, module: "comercial" },
    ],
  },
  // ── OPERAÇÕES ──
  {
    label: "Operações",
    icon: Factory,
    separator: true,
    items: [
      { title: "Produção", url: "/producao-operacoes", icon: Factory, module: "operacional" },
      { title: "Produção (legado)", url: "/producao-operacoes", icon: Factory, module: "producao" },
      { title: "Compras", url: "/compras", icon: Package, module: "operacional" },
      { title: "Estoque", url: "/estoque", icon: Layers, module: "operacional" },
      { title: "Entregas & Montagem", url: "/entregas-montagem", icon: Truck, module: "operacional" },
      
      { title: "KPI's", url: "/relatorios", icon: FileText, comingSoon: true, module: "operacional" },
    ],
  },
  // ── PESSOAS ──
  {
    label: "Pessoas",
    icon: Users,
    separator: true,
    items: [
      { title: "RH & Colaboradores", url: "/rh", icon: UserCheck, module: "configuracoes" },
      { title: "Usuários", url: "/settings/users", icon: UserCog, module: "configuracoes" },
      { title: "Permissões", url: "/governanca", icon: Shield, module: "configuracoes" },
      { title: "Smart Onboarding", url: "/smart-onboarding", icon: GraduationCap, module: "configuracoes" },
    ],
  },
  // ── ESTRATÉGIA ──
  {
    label: "Estratégia",
    icon: Telescope,
    separator: true,
    items: [
      { title: "Control Tower", url: "/control-tower", icon: Landmark },
      
      { title: "Educação & Trilhas", url: "/education", icon: GraduationCap },
      { title: "Indicadores Executivos", url: "/executive", icon: LineChart },
      { title: "Simulações", url: "/planning", icon: Wrench },
      
    ],
  },
  // ── SISTEMA ──
  {
    label: "Sistema",
    icon: Settings,
    items: [
      { title: "Configurações", url: "/settings", icon: Settings, module: "configuracoes" },
      { title: "Integrações", url: "/settings/integracoes", icon: Link2, comingSoon: true, module: "configuracoes" },
      { title: "Logs do Sistema", url: "/settings/logs", icon: History, comingSoon: true, module: "configuracoes" },
    ],
  },
  // ============================================================
  // ── OWNER PANEL — agrupado por finalidade operacional
  // Visível apenas para system_owner / tenant_owner
  // ============================================================

  // Grupo 1 — Operação do Sistema
  // Acompanhamento geral e priorização de execução
  {
    label: "Owner · Operação",
    icon: Landmark,
    profiles: ["system_owner", "tenant_owner"],
    separator: true,
    items: [
      { title: "Owner Control Tower", url: "/owner/control-tower", icon: Landmark },
      { title: "Global Control Tower", url: "/control-tower", icon: Telescope },
    ],
  },

  // Grupo 2 — Receita e Clientes
  // Gestão de receita, clientes, planos e monetização
  {
    label: "Owner · Receita & Clientes",
    icon: CreditCard,
    profiles: ["system_owner", "tenant_owner"],
    items: [
      { title: "Billing Ops", url: "/owner/billing-ops", icon: CreditCard },
      { title: "Billing & Subscriptions", url: "/billing", icon: DollarSign },
      { title: "Upgrade Center", url: "/owner/upgrade-center", icon: Rocket },
      { title: "Customer Lifecycle", url: "/customer-lifecycle", icon: Users },
      { title: "Customer Success", url: "/customer-success", icon: UserCheck },
      
      { title: "Entitlements", url: "/owner/entitlements", icon: Tag },
    ],
  },

  // Grupo 3 — Automação e Inteligência
  // Automações e inteligência operacional
  {
    label: "Owner · Automação & IA",
    icon: Sparkles,
    profiles: ["system_owner", "tenant_owner"],
    items: [
      { title: "Automation Center", url: "/owner/automation-center", icon: Sparkles },
    ],
  },

  // Grupo 4 — Estabilidade e Recuperação
  // Estabilidade do sistema, falhas e recuperação
  {
    label: "Owner · Estabilidade",
    icon: Shield,
    profiles: ["system_owner", "tenant_owner"],
    items: [
      { title: "Runbooks", url: "/owner/runbooks", icon: ListChecks },
      { title: "Self-Healing Policies", url: "/owner/self-healing", icon: Shield },
      { title: "Autonomous Recovery", url: "/owner/autonomous-recovery", icon: Wrench },
      { title: "Capacity & Load Risk", url: "/owner/capacity-risk", icon: Gauge },
      { title: "Stability Gates", url: "/owner/stability-gates", icon: ShieldCheck },
      { title: "Dependency Impact", url: "/owner/dependency-impact", icon: GitBranch },
    ],
  },

  // Grupo 5 — Arquitetura e Governança
  // Decisões estruturais e arquitetura do sistema
  {
    label: "Owner · Arquitetura",
    icon: LayoutGrid,
    profiles: ["system_owner", "tenant_owner"],
    items: [
      { title: "Architecture Board", url: "/owner/architecture-board", icon: LayoutGrid },
    ],
  },

  // Grupo 6 — Administração Técnica
  // Ferramentas técnicas e administrativas internas
  {
    label: "Owner · Administração",
    icon: Building2,
    profiles: ["system_owner", "tenant_owner"],
    items: [
      { title: "Painel Owner (legado)", url: "/super-admin", icon: Building2 },
      { title: "Smart Admin", url: "/owner/admin", icon: ShieldCheck },
    ],
  },
];

// ── Helpers ──
function findActiveGroupIndex(path: string): number | null {
  for (let i = 0; i < menuGroups.length; i++) {
    if (menuGroups[i].items.some(item => !item.comingSoon && (path === item.url || path.startsWith(item.url + '/')))) {
      return i;
    }
  }
  return null;
}

function findGroupIndexByLabel(label: string): number | null {
  const idx = menuGroups.findIndex(g => g.label === label);
  return idx >= 0 ? idx : null;
}

function resolveRoleKey(userLevel: string, profileTypeName: string | null): RoleKey {
  if (userLevel === 'system_owner') return 'owner';
  if (userLevel === 'tenant_owner') return 'owner';
  if (profileTypeName) {
    const n = profileTypeName.toLowerCase();
    if (n.includes('financ')) return 'financeiro';
    if (n.includes('comerc')) return 'comercial';
    if (n.includes('operac') || n.includes('produc')) return 'operacional';
    if (n.includes('contador')) return 'financeiro';
    if (n.includes('auditor')) return 'financeiro';
  }
  return 'admin';
}

function findMenuItem(url: string): MenuItem | null {
  for (const g of menuGroups) {
    const found = g.items.find(i => i.url === url);
    if (found) return found;
  }
  return null;
}

// All menu items flat for favorites lookup
function getAllMenuItems(): MenuItem[] {
  const items: MenuItem[] = [];
  for (const g of menuGroups) {
    for (const i of g.items) {
      if (!i.comingSoon && !items.some(x => x.url === i.url)) items.push(i);
    }
  }
  return items;
}

// ── Attention level styling ──
const LEVEL_COLORS: Record<AttentionLevel, string> = {
  normal: "bg-muted text-muted-foreground",
  atencao: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  urgente: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  bloqueante: "bg-red-500/25 text-red-400 border-red-500/40",
};

const LEVEL_DOT: Record<AttentionLevel, string> = {
  normal: "bg-muted-foreground/40",
  atencao: "bg-yellow-400",
  urgente: "bg-orange-400 animate-pulse",
  bloqueante: "bg-red-500 animate-pulse",
};

const LEVEL_GROUP_BORDER: Record<AttentionLevel, string> = {
  normal: "",
  atencao: "border-l-2 border-l-yellow-500/40",
  urgente: "border-l-2 border-l-orange-500/50",
  bloqueante: "border-l-2 border-l-red-500/60",
};

// ── Component ──
export function AppSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { userLevel, hasModuleAccess, hasAccess, loading: permsLoading } = usePermissions();
  const { user } = useAuth();
  const { data: companySettings } = useCompanySettings();
  const companyLogo = companySettings?.logo_url;
  const companyName = companySettings?.trade_name || companySettings?.company_name || 'Tendenci';
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const { trackVisit, getTopPaths } = useNavigationUsage();
  const { alerts, totalActions, getGroupBadge, getItemBadge } = useAttentionLayer();
  
  const { favorites, toggleFavorite, isFavorite } = useFavorites();

  // Profile type
  const [profileTypeName, setProfileTypeName] = useState<string | null>(null);
  const [profileRole, setProfileRole] = useState<string | null>(null);
  const [profileIsOwner, setProfileIsOwner] = useState(false);
  useEffect(() => {
    if (!user) {
      setProfileTypeName(null);
      setProfileRole(null);
      setProfileIsOwner(false);
      return;
    }
    import("@/integrations/supabase/client").then(({ supabase }) => {
      supabase.from('profiles').select('role, is_owner, profile_type_id, profile_types(name)')
        .eq('id', user.id).single()
        .then(({ data }) => {
          setProfileRole((data as any)?.role ?? null);
          setProfileIsOwner((data as any)?.is_owner === true);
          setProfileTypeName((data as any)?.profile_types?.name as string | null ?? null);
        });
    });
  }, [user]);

  const roleKey = resolveRoleKey(userLevel, profileTypeName);
  const roleConfig = ROLE_CONFIGS[roleKey];

  // Accordion
  const [openGroupIndex, setOpenGroupIndex] = useState<number | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_GROUP);
    if (saved !== null) {
      const idx = parseInt(saved, 10);
      if (!isNaN(idx) && idx >= 0 && idx < menuGroups.length) return idx;
    }
    for (const gl of roleConfig.autoExpandGroups) {
      const idx = findGroupIndexByLabel(gl);
      if (idx !== null) return idx;
    }
    return findActiveGroupIndex(currentPath) ?? 0;
  });

  useEffect(() => {
    const activeIdx = findActiveGroupIndex(currentPath);
    if (activeIdx !== null && activeIdx !== openGroupIndex) {
      setOpenGroupIndex(activeIdx);
    }
    if (activeIdx !== null) {
      trackVisit(currentPath, menuGroups[activeIdx].label);
    }
  }, [currentPath]);

  useEffect(() => {
    if (openGroupIndex !== null) {
      localStorage.setItem(STORAGE_KEY_GROUP, String(openGroupIndex));
    }
  }, [openGroupIndex]);

  const handleToggleGroup = useCallback((idx: number) => {
    setOpenGroupIndex(prev => prev === idx ? null : idx);
  }, []);

  const currentProfile = useMemo(() => {
    const normalizedProfileType = profileTypeName?.toLowerCase().trim() ?? '';
    const normalizedRole = profileRole?.toLowerCase().trim() ?? '';
    const isOwnerProfile =
      userLevel === 'system_owner' ||
      userLevel === 'tenant_owner' ||
      profileIsOwner ||
      normalizedRole === 'owner' ||
      normalizedRole === 'tenant_owner' ||
      normalizedProfileType.includes('owner');

    if (userLevel === 'system_owner' || profileIsOwner || normalizedRole === 'owner') return 'system_owner';
    if (userLevel === 'tenant_owner' || normalizedRole === 'tenant_owner' || isOwnerProfile) return 'tenant_owner';
    return 'tenant_admin';
  }, [userLevel, profileIsOwner, profileRole, profileTypeName]);

  const visibleGroups = useMemo(() => {
    return menuGroups
      .filter((g) => !g.profiles || g.profiles.length === 0 || g.profiles.includes(currentProfile))
      .filter((g) => {
        // Esconde o grupo inteiro se nenhum item gated estiver permitido.
        if (permsLoading) return true;
        const anyVisible = g.items.some(
          (it) => !it.module || hasAccess(it.module as any, it.url, 'view')
        );
        return anyVisible;
      });
  }, [currentProfile, permsLoading, hasAccess]);

  // Favorites items
  const favoriteItems = useMemo(() => {
    const allItems = getAllMenuItems();
    return favorites
      .map(url => allItems.find(i => i.url === url))
      .filter((i): i is MenuItem => !!i);
  }, [favorites]);

  const highlightSet = useMemo(() => new Set(roleConfig.highlightItems), [roleConfig]);
  const dimSet = useMemo(() => new Set(roleConfig.dimGroups), [roleConfig]);

  // Urgent alerts
  const urgentAlerts = useMemo(() =>
    alerts.filter(a => a.level === "urgente" || a.level === "bloqueante" || a.level === "atencao"),
    [alerts]
  );

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border"
      style={{ backgroundImage: 'linear-gradient(180deg, hsl(0,0%,9%) 0%, hsl(0,0%,6%) 100%)' }}
    >
      <SidebarContent className="overflow-y-auto overflow-x-hidden">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-sidebar-border/40">
          {isCollapsed ? (
            <div className="flex items-center justify-center">
              {companyLogo ? (
                <img src={companyLogo} alt={companyName} className="h-9 w-9 object-contain" />
              ) : (
                <span className="font-bold text-sm text-sidebar-foreground">{companyName.charAt(0)}</span>
              )}
            </div>
          ) : (
            <div className="space-y-0.5">
              {companyLogo ? (
                <img src={companyLogo} alt={companyName} className="h-12 w-auto object-contain" />
              ) : (
                <span className="font-bold text-base text-sidebar-foreground">{companyName}</span>
              )}
              <p className="text-[10px] text-sidebar-foreground/40 font-semibold tracking-widest uppercase">ERP</p>
            </div>
          )}
        </div>

        {/* ═══ PRECISA AGIR HOJE ═══ */}
        {!isCollapsed && urgentAlerts.length > 0 && (
          <div className="px-3 py-2.5 border-b border-red-500/15 bg-red-500/5">
            <p className="text-[10px] text-red-400/80 font-semibold tracking-widest uppercase mb-2 flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3" /> Precisa agir hoje
            </p>
            <div className="space-y-1">
              {urgentAlerts.slice(0, 4).map(alert => (
                <button
                  key={alert.id}
                  onClick={() => navigate(alert.route)}
                  className="flex items-center gap-2 w-full px-2 py-1 rounded-md transition-colors hover:bg-sidebar-accent/20 text-[11px] text-left"
                >
                  <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", LEVEL_DOT[alert.level])} />
                  <span className="truncate text-sidebar-foreground/70">{alert.label}</span>
                  <span className={cn(
                    "ml-auto text-[10px] font-mono font-semibold px-1.5 py-0 rounded-full border",
                    LEVEL_COLORS[alert.level]
                  )}>
                    {alert.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Collapsed: show total action dot */}
        {isCollapsed && totalActions > 0 && (
          <div className="flex justify-center py-2 border-b border-sidebar-border/20">
            <div className="relative">
              <AlertTriangle className="h-4 w-4 text-orange-400/70" />
              <span className="absolute -top-1 -right-1.5 text-[8px] font-bold bg-red-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center">
                {totalActions > 9 ? "9+" : totalActions}
              </span>
            </div>
          </div>
        )}

        {/* ═══ FAVORITOS ═══ */}
        {!isCollapsed && favoriteItems.length > 0 && (
          <div className="px-3 py-2 border-b border-sidebar-border/20">
            <p className="text-[10px] text-yellow-500/60 font-semibold tracking-widest uppercase mb-1.5 flex items-center gap-1.5">
              <Star className="h-3 w-3 fill-yellow-500/40" /> Favoritos
            </p>
            <div className="space-y-0.5">
              {favoriteItems.map(item => (
                <NavLink
                  key={item.url}
                  to={item.url}
                  end
                  className="flex items-center gap-2 px-2.5 py-1 rounded-md transition-colors hover:bg-sidebar-accent/30 text-sidebar-foreground/55 hover:text-sidebar-foreground text-[12px]"
                  activeClassName="bg-primary/10 text-primary font-medium"
                >
                  <item.icon className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{item.title}</span>
                </NavLink>
              ))}
            </div>
          </div>
        )}

        {/* Menu */}
        <nav className="py-1.5">
          {visibleGroups.map((group) => {
            const globalIdx = menuGroups.indexOf(group);
            const isOpen = openGroupIndex === globalIdx;
            const isGroupActive = group.items.some(
              item => !item.comingSoon && (currentPath === item.url || currentPath.startsWith(item.url + '/'))
            );
            const isDimmed = dimSet.has(group.label);
            const groupBadge = getGroupBadge(group.label);

            return (
              <div key={group.label}>
                <Collapsible open={isOpen} onOpenChange={() => handleToggleGroup(globalIdx)}>
                  <SidebarGroup className={cn("py-0", groupBadge && LEVEL_GROUP_BORDER[groupBadge.level])}>
                    <CollapsibleTrigger className="w-full">
                      <SidebarGroupLabel className="flex items-center justify-between w-full px-4 py-1.5 cursor-pointer hover:bg-sidebar-accent/20 rounded-md mx-1 transition-colors">
                        <div className="flex items-center gap-2.5">
                          <group.icon className={cn(
                            "h-4 w-4 flex-shrink-0 transition-colors",
                            isGroupActive ? "text-primary" : isDimmed ? "text-sidebar-foreground/25" : "text-sidebar-foreground/45"
                          )} />
                          {!isCollapsed && (
                            <span className={cn(
                              "text-[11px] font-semibold tracking-wide uppercase transition-colors",
                              isGroupActive ? "text-primary" : isDimmed ? "text-sidebar-foreground/25" : "text-sidebar-foreground/45"
                            )}>
                              {group.label}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {groupBadge && groupBadge.count > 0 && (
                            <span className={cn(
                              "text-[9px] font-mono font-semibold px-1.5 py-0 rounded-full border leading-tight",
                              LEVEL_COLORS[groupBadge.level]
                            )}>
                              {groupBadge.count}
                            </span>
                          )}
                          {!isCollapsed && (
                            <ChevronDown className={cn(
                              "h-3 w-3 text-sidebar-foreground/30 transition-transform duration-200",
                              isOpen && "rotate-180"
                            )} />
                          )}
                        </div>
                      </SidebarGroupLabel>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                      <SidebarGroupContent>
                        <SidebarMenu>
                          {group.items
                            .filter((item) => !item.module || permsLoading || hasAccess(item.module as any, item.url, 'view'))
                            .map((item) => {
                            const isHighlighted = highlightSet.has(item.url);
                            const itemBadge = getItemBadge(item.url);
                            const favored = isFavorite(item.url);

                            return (
                              <SidebarMenuItem key={item.title + item.url}>
                                <SidebarMenuButton asChild={!isComingSoon(item)}>
                                  {isComingSoon(item) ? (
                                    <ComingSoonItem
                                      label={item.title}
                                      className="flex items-center gap-2.5 px-3 py-1 ml-5 mr-2 rounded-md text-sidebar-foreground text-[13px]"
                                    >
                                      <item.icon className={cn("h-3.5 w-3.5 flex-shrink-0", isHighlighted && "text-primary/40")} />
                                      <span className={cn("truncate", isHighlighted && "text-primary/40")}>{item.title}</span>
                                      {itemBadge && itemBadge.count > 0 && !isCollapsed && (
                                        <span className={cn(
                                          "ml-auto text-[9px] font-mono font-semibold px-1.5 py-0 rounded-full border leading-tight",
                                          LEVEL_COLORS[itemBadge.level]
                                        )}>
                                          {itemBadge.count}
                                        </span>
                                      )}
                                      {!itemBadge && !isCollapsed && (
                                        <ComingSoonBadge className="ml-auto" />
                                      )}
                                    </ComingSoonItem>
                                  ) : (
                                    <NavLink
                                      to={item.url}
                                      end
                                      className={cn(
                                        "flex items-center gap-2.5 px-3 py-1 ml-5 mr-2 rounded-md transition-colors hover:bg-sidebar-accent/30 text-sidebar-foreground/60 hover:text-sidebar-foreground text-[13px] group/item",
                                        isHighlighted && "text-sidebar-foreground/80 font-medium"
                                      )}
                                      activeClassName="bg-primary/10 text-primary font-medium"
                                    >
                                      <item.icon className={cn("h-3.5 w-3.5 flex-shrink-0", isHighlighted && "text-primary/60")} />
                                      <span className="truncate">{item.title}</span>
                                      {/* Favorite toggle */}
                                      {!isCollapsed && (
                                        <button
                                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(item.url); }}
                                          className={cn(
                                            "ml-auto opacity-0 group-hover/item:opacity-100 transition-opacity flex-shrink-0",
                                            favored && "opacity-100"
                                          )}
                                        >
                                          <Star className={cn(
                                            "h-3 w-3",
                                            favored ? "fill-yellow-500 text-yellow-500" : "text-sidebar-foreground/30 hover:text-yellow-500/60"
                                          )} />
                                        </button>
                                      )}
                                      {itemBadge && itemBadge.count > 0 && !isCollapsed && (
                                        <span className={cn(
                                          "text-[9px] font-mono font-semibold px-1.5 py-0 rounded-full border leading-tight",
                                          LEVEL_COLORS[itemBadge.level]
                                        )}>
                                          {itemBadge.count}
                                        </span>
                                      )}
                                    </NavLink>
                                  )}
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            );
                          })}
                        </SidebarMenu>
                      </SidebarGroupContent>
                    </CollapsibleContent>
                  </SidebarGroup>
                </Collapsible>
                {group.separator && !isCollapsed && (
                  <div className="mx-4 my-1.5 border-t border-sidebar-border/20" />
                )}
              </div>
            );
          })}
        </nav>
      </SidebarContent>
    </Sidebar>
  );
}
