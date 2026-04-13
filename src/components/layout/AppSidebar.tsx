import { useState } from "react";
import { useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, FileText, ShoppingCart, Wallet, BarChart3,
  Target, PieChart, FolderOpen, Zap, Settings, Building2,
  ChevronDown, Factory, Package, CreditCard, BookOpen, TrendingUp,
  ClipboardList, Receipt, Landmark, ArrowLeftRight, DollarSign,
  LineChart, Banknote, FolderKanban, ListChecks, Bell, Shield,
  History, Plug, UserCog, ScrollText, Truck, Wrench, AlertTriangle,
  Calculator, CalendarRange, Activity, Bot, Layers, FileCheck,
  GitBranch, Workflow, SquareStack
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
import { cn } from "@/lib/utils";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface MenuItem {
  title: string;
  url: string;
  icon: any;
  module?: string | null;
  masterOnly?: boolean;
  ownerOnly?: boolean;
}

interface MenuGroup {
  label: string;
  icon: any;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    items: [
      { title: "Dashboard Executivo", url: "/bi-dashboard", icon: LayoutDashboard, module: "dashboard" },
    ],
  },
  {
    label: "CRM e Comercial",
    icon: Users,
    items: [
      { title: "Clientes", url: "/pedidos", icon: Users, module: "pedidos" },
      { title: "Pedidos", url: "/pedidos", icon: ShoppingCart, module: "pedidos" },
      { title: "Orçamentos", url: "/pedidos", icon: FileText, module: "pedidos" },
      { title: "Contratos", url: "/pedidos", icon: ScrollText, module: "pedidos" },
    ],
  },
  {
    label: "Operações",
    icon: Factory,
    items: [
      { title: "Produção", url: "/producao", icon: Factory, module: "producao" },
      { title: "Ordens de Produção", url: "/producao", icon: ClipboardList, module: "producao" },
      { title: "Entregas", url: "/producao", icon: Truck, module: "producao" },
    ],
  },
  {
    label: "Compras",
    icon: Package,
    items: [
      { title: "Fornecedores", url: "/fornecedores", icon: Package, module: "fornecedores" },
      { title: "Produtos / Matéria-Prima", url: "/estoque", icon: Layers, module: "estoque" },
    ],
  },
  {
    label: "Financeiro",
    icon: Wallet,
    items: [
      { title: "Painel Financeiro", url: "/financeiro", icon: Wallet, module: "financeiro" },
      { title: "Cadastros Financeiros", url: "/cadastros-financeiros", icon: BookOpen, module: "cadastros_financeiros" },
    ],
  },
  {
    label: "Controladoria",
    icon: Calculator,
    items: [
      { title: "Cadastros Financeiros", url: "/cadastros-financeiros", icon: BookOpen, module: "cadastros_financeiros" },
    ],
  },
  {
    label: "Planejamento",
    icon: Target,
    items: [
      { title: "Metas", url: "/metas", icon: Target, module: "metas" },
    ],
  },
  {
    label: "BI e Indicadores",
    icon: PieChart,
    items: [
      { title: "BI Dashboard", url: "/bi-dashboard", icon: PieChart, module: "dashboard" },
      { title: "Dashboards Personalizados", url: "/dashboards", icon: BarChart3, module: null, masterOnly: true },
    ],
  },
  {
    label: "Documentos",
    icon: FolderOpen,
    items: [
      { title: "Gestão Documental", url: "/documentos", icon: FolderOpen },
    ],
  },
  {
    label: "Automações",
    icon: Zap,
    items: [
      { title: "Central de Automações", url: "/automacoes", icon: Zap, module: null, masterOnly: true },
      { title: "Workflow Aprovações", url: "/aprovacoes", icon: GitBranch },
    ],
  },
  {
    label: "Sistema",
    icon: Settings,
    items: [
      { title: "Configurações", url: "/settings", icon: Settings, module: "configuracoes" },
      { title: "Usuários", url: "/settings/users", icon: UserCog, module: "configuracoes" },
      { title: "Auditoria", url: "/auditoria", icon: History },
      { title: "Central de Tarefas", url: "/tarefas", icon: ListChecks },
      { title: "Central de Atividades", url: "/atividades", icon: Activity, module: null, masterOnly: true },
    ],
  },
  {
    label: "Owner",
    icon: Building2,
    items: [
      { title: "Painel Owner", url: "/super-admin", icon: Building2, module: null, ownerOnly: true },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { hasModuleAccess, loading, isOwner } = usePermissions();
  const { profile } = useAuth();
  const { data: companySettings } = useCompanySettings();
  const companyLogo = companySettings?.logo_url;
  const companyName = companySettings?.trade_name || companySettings?.company_name || 'Sistema';
  const location = useLocation();
  const currentPath = location.pathname;

  const isMaster = profile?.role === 'admin';

  const isItemVisible = (item: MenuItem) => {
    if (loading) return !(item as any).ownerOnly;
    if (item.ownerOnly && !isOwner) return false;
    if (item.masterOnly && !isMaster) return false;
    if (item.module) return hasModuleAccess(item.module);
    return true;
  };

  const visibleGroups = menuGroups
    .map(group => ({
      ...group,
      items: group.items.filter(isItemVisible),
    }))
    .filter(group => group.items.length > 0);

  // Deduplicate items with same URL within visible groups
  const seenUrls = new Set<string>();
  const deduplicatedGroups = visibleGroups.map(group => ({
    ...group,
    items: group.items.filter(item => {
      const key = `${group.label}:${item.url}`;
      if (seenUrls.has(key)) return false;
      seenUrls.add(key);
      return true;
    }),
  })).filter(g => g.items.length > 0);

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border"
      style={{
        backgroundImage: 'linear-gradient(180deg, hsl(0, 0%, 9%) 0%, hsl(0, 0%, 6%) 100%)'
      }}
    >
      <SidebarContent className="overflow-y-auto overflow-x-hidden">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-sidebar-border/50">
          {isCollapsed ? (
            <div className="flex items-center justify-center">
              {companyLogo ? (
                <img src={companyLogo} alt={companyName} className="h-10 w-10 object-contain" />
              ) : (
                <span className="font-bold text-sm text-sidebar-foreground">{companyName.charAt(0)}</span>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {companyLogo ? (
                <img src={companyLogo} alt={companyName} className="h-14 w-auto object-contain" />
              ) : (
                <span className="font-bold text-base text-sidebar-foreground">{companyName}</span>
              )}
              <p className="text-[10px] text-sidebar-foreground/50 font-semibold tracking-widest uppercase">
                ERP System
              </p>
            </div>
          )}
        </div>

        {/* Menu Groups */}
        <div className="py-2 space-y-0.5">
          {deduplicatedGroups.map((group) => {
            const isGroupActive = group.items.some(item => currentPath === item.url || currentPath.startsWith(item.url + '/'));
            const isSingleItem = group.items.length === 1;

            // Single item groups render flat
            if (isSingleItem) {
              const item = group.items[0];
              return (
                <SidebarGroup key={group.label} className="py-0">
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <NavLink
                            to={item.url}
                            end={item.url === "/" || item.url === "/bi-dashboard"}
                            className="flex items-center gap-3 px-3 py-2 mx-2 rounded-lg transition-all duration-200 hover:bg-sidebar-accent/60 text-sidebar-foreground/80 hover:text-sidebar-foreground"
                            activeClassName="bg-primary/15 text-primary font-medium border-l-2 border-primary"
                          >
                            <item.icon className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate text-sm">{item.title}</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              );
            }

            // Multi-item groups render collapsible
            return (
              <Collapsible key={group.label} defaultOpen={isGroupActive}>
                <SidebarGroup className="py-0">
                  <CollapsibleTrigger className="w-full">
                    <SidebarGroupLabel className="flex items-center justify-between w-full px-4 py-2 cursor-pointer hover:bg-sidebar-accent/30 rounded-lg mx-1 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <group.icon className={cn(
                          "h-4 w-4 flex-shrink-0",
                          isGroupActive ? "text-primary" : "text-sidebar-foreground/50"
                        )} />
                        {!isCollapsed && (
                          <span className={cn(
                            "text-xs font-semibold tracking-wide uppercase",
                            isGroupActive ? "text-primary" : "text-sidebar-foreground/50"
                          )}>
                            {group.label}
                          </span>
                        )}
                      </div>
                      {!isCollapsed && (
                        <ChevronDown className="h-3.5 w-3.5 text-sidebar-foreground/40 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                      )}
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {group.items.map((item) => (
                          <SidebarMenuItem key={item.title + item.url}>
                            <SidebarMenuButton asChild>
                              <NavLink
                                to={item.url}
                                end={item.url === "/"}
                                className="flex items-center gap-3 px-3 py-1.5 ml-5 mr-2 rounded-lg transition-all duration-200 hover:bg-sidebar-accent/40 text-sidebar-foreground/70 hover:text-sidebar-foreground text-sm"
                                activeClassName="bg-primary/15 text-primary font-medium"
                              >
                                <item.icon className="h-3.5 w-3.5 flex-shrink-0" />
                                <span className="truncate">{item.title}</span>
                              </NavLink>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>
            );
          })}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
