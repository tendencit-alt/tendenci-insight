import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Users, ShoppingCart, Wallet, BarChart3,
  Target, PieChart, FolderOpen, Zap, Settings, Building2,
  ChevronDown, Factory, Package, BookOpen,
  ListChecks, Bell, Shield, Clock,
  History, UserCog, Layers,
  GitBranch, Inbox, CheckSquare, LineChart,
  FileText, Truck, ClipboardList, DollarSign,
  TrendingUp, Briefcase, Mail, Link2, Globe,
  HardHat, Calculator, BarChart, Wrench,
  Receipt, CreditCard, Landmark, ArrowLeftRight
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
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";

// ── Types ──

interface MenuItem {
  title: string;
  url: string;
  icon: any;
  module?: string | null;
  masterOnly?: boolean;
  ownerOnly?: boolean;
  comingSoon?: boolean;
}

interface MenuGroup {
  label: string;
  icon: any;
  items: MenuItem[];
  separator?: boolean;
  profiles?: string[];
}

// ── Profile → Group visibility map ──

const P = {
  ALL_TENANT: ["tenant_owner", "tenant_admin", "financeiro", "comercial", "operacional", "producao", "contador", "auditor"],
  EXEC: ["tenant_owner", "tenant_admin"],
  FIN: ["tenant_owner", "tenant_admin", "financeiro", "contador"],
  COM: ["tenant_owner", "tenant_admin", "comercial"],
  OPS: ["tenant_owner", "tenant_admin", "operacional", "producao"],
  AUD: ["tenant_owner", "tenant_admin", "auditor"],
  ADM: ["tenant_owner", "tenant_admin"],
};

// ── Menu definition ──

const menuGroups: MenuGroup[] = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    items: [
      { title: "Visão Geral", url: "/bi-dashboard", icon: LayoutDashboard, module: "dashboard" },
    ],
  },
  {
    label: "Central Operacional",
    icon: Inbox,
    separator: true,
    items: [
      { title: "Minhas Tarefas", url: "/tarefas", icon: CheckSquare },
      { title: "Aprovações", url: "/aprovacoes", icon: GitBranch },
      { title: "Notificações", url: "/atividades", icon: Bell },
      { title: "Pendências Executivas", url: "/pendencias", icon: ClipboardList, comingSoon: true },
    ],
  },
  {
    label: "Comercial",
    icon: ShoppingCart,
    items: [
      { title: "Pedidos", url: "/pedidos", icon: ShoppingCart, module: "pedidos" },
      { title: "Clientes", url: "/clientes", icon: Users },
      { title: "Propostas", url: "/propostas", icon: FileText, comingSoon: true },
      { title: "Contratos", url: "/contratos", icon: Briefcase, comingSoon: true },
      { title: "Comissões", url: "/comissoes", icon: DollarSign, comingSoon: true },
      { title: "Documentos", url: "/documentos", icon: FolderOpen },
    ],
  },
  {
    label: "Operações",
    icon: Factory,
    separator: true,
    items: [
      { title: "Produção", url: "/producao", icon: Factory, module: "producao" },
      { title: "Projetos", url: "/projetos-operacionais", icon: HardHat, comingSoon: true },
      { title: "Entregas", url: "/entregas", icon: Truck, comingSoon: true },
    ],
  },
  {
    label: "Compras e Estoque",
    icon: Package,
    items: [
      { title: "Fornecedores", url: "/fornecedores", icon: Package, module: "fornecedores" },
      { title: "Materiais", url: "/estoque", icon: Layers, module: "estoque" },
      { title: "Solicitações de Compra", url: "/solicitacoes-compra", icon: ClipboardList, comingSoon: true },
      { title: "Cotações", url: "/cotacoes-compra", icon: FileText, comingSoon: true },
      { title: "Pedidos de Compra", url: "/pedidos-compra", icon: ShoppingCart, comingSoon: true },
      { title: "Recebimento", url: "/recebimento", icon: Truck, comingSoon: true },
    ],
  },
  {
    label: "Financeiro",
    icon: Wallet,
    separator: true,
    items: [
      { title: "Movimento", url: "/financeiro", icon: Wallet, module: "financeiro" },
      { title: "Contas a Receber", url: "/contas-receber", icon: TrendingUp, comingSoon: true },
      { title: "Contas a Pagar", url: "/contas-pagar", icon: CreditCard, comingSoon: true },
      { title: "Conciliação", url: "/conciliacao", icon: ArrowLeftRight, comingSoon: true },
      { title: "Fluxo de Caixa", url: "/fluxo-caixa", icon: BarChart, comingSoon: true },
    ],
  },
  {
    label: "Controladoria",
    icon: BookOpen,
    items: [
      { title: "Plano de Contas", url: "/cadastros-financeiros", icon: BookOpen, module: "cadastros_financeiros" },
      { title: "DRE", url: "/dre", icon: LineChart, comingSoon: true },
      { title: "Margem Contribuição", url: "/margem-contribuicao", icon: Calculator, comingSoon: true },
      { title: "EBITDA", url: "/ebitda", icon: TrendingUp, comingSoon: true },
      { title: "Orçado vs Realizado", url: "/orcado-realizado", icon: BarChart3, comingSoon: true },
    ],
  },
  {
    label: "RH e Custos",
    icon: HardHat,
    items: [
      { title: "Colaboradores", url: "/colaboradores", icon: Users, comingSoon: true },
      { title: "Equipes", url: "/equipes", icon: Users, comingSoon: true },
      { title: "Apontamento Horas", url: "/apontamento-horas", icon: Clock, comingSoon: true },
      { title: "Custo Real Projeto", url: "/custo-real", icon: Calculator, comingSoon: true },
    ],
  },
  {
    label: "Planejamento",
    icon: Target,
    items: [
      { title: "Metas", url: "/metas", icon: Target, module: "metas" },
      { title: "Orçamento", url: "/orcamento", icon: DollarSign, comingSoon: true },
      { title: "Forecast", url: "/forecast", icon: TrendingUp, comingSoon: true },
    ],
  },
  {
    label: "BI e Indicadores",
    icon: PieChart,
    separator: true,
    items: [
      { title: "Análise BI", url: "/bi-dashboard", icon: PieChart, module: "dashboard" },
      { title: "Dashboards", url: "/dashboards", icon: BarChart3 },
      { title: "Exportação BI", url: "/exportacao-bi", icon: FileText, comingSoon: true },
    ],
  },
  {
    label: "Integrações",
    icon: Link2,
    items: [
      { title: "NF-e", url: "/nfe", icon: Receipt, comingSoon: true },
      { title: "NFS-e", url: "/nfse", icon: Receipt, comingSoon: true },
      { title: "Bancos / OFX", url: "/integracao-bancos", icon: Landmark, comingSoon: true },
      { title: "WhatsApp", url: "/integracao-whatsapp", icon: Mail, comingSoon: true },
      { title: "API Pública", url: "/api-publica", icon: Globe, comingSoon: true },
      { title: "Webhooks", url: "/webhooks", icon: Zap, comingSoon: true },
    ],
  },
  {
    label: "Regras e Auditoria",
    icon: Shield,
    separator: true,
    items: [
      { title: "Regras Automáticas", url: "/automacoes", icon: Zap },
      { title: "Auditoria", url: "/auditoria", icon: History },
      { title: "SLA Operacional", url: "/sla", icon: Clock, comingSoon: true },
    ],
  },
  {
    label: "Sistema",
    icon: Settings,
    items: [
      { title: "Configurações", url: "/settings", icon: Settings, module: "configuracoes" },
      { title: "Usuários", url: "/settings/users", icon: UserCog, module: "configuracoes" },
    ],
  },
  {
    label: "Owner",
    icon: Building2,
    profiles: ["system_owner"],
    items: [
      { title: "Painel Owner", url: "/super-admin", icon: Building2, ownerOnly: true },
    ],
  },
];

// ── Component ──

export function AppSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { hasModuleAccess, loading, isOwner, userLevel } = usePermissions();
  const { profile, user } = useAuth();
  const { data: companySettings } = useCompanySettings();
  const companyLogo = companySettings?.logo_url;
  const companyName = companySettings?.trade_name || companySettings?.company_name || 'Sistema';
  const location = useLocation();
  const currentPath = location.pathname;
  const isMaster = profile?.role === 'admin';

  const [profileTypeName, setProfileTypeName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setProfileTypeName(null); return; }
    const fetchProfileType = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('profile_type_id, profile_types(name)')
        .eq('id', user.id)
        .single();
      const ptName = (data as any)?.profile_types?.name as string | null;
      setProfileTypeName(ptName || null);
    };
    fetchProfileType();
  }, [user]);

  const effectiveProfile = (): string => {
    if (userLevel === 'system_owner') return 'system_owner';
    if (userLevel === 'tenant_owner') return 'tenant_owner';
    if (userLevel === 'tenant_admin') return 'tenant_admin';
    if (profileTypeName) {
      const normalized = profileTypeName.toLowerCase().replace(/\s+/g, '_');
      const knownProfiles = ['financeiro', 'comercial', 'operacional', 'producao', 'contador', 'auditor'];
      if (knownProfiles.includes(normalized)) return normalized;
      const match = knownProfiles.find(p => normalized.includes(p));
      if (match) return match;
    }
    if (isMaster) return 'tenant_admin';
    return 'tenant_admin';
  };

  const currentProfile = effectiveProfile();

  const isGroupVisibleForProfile = (group: MenuGroup): boolean => {
    if (!group.profiles || group.profiles.length === 0) return true;
    return group.profiles.includes(currentProfile);
  };

  const visibleGroups = menuGroups
    .filter(isGroupVisibleForProfile)
    .filter(group => group.items.length > 0);

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

        {/* Menu */}
        <nav className="py-1.5">
          {visibleGroups.map((group) => {
            const isGroupActive = group.items.some(
              item => !item.comingSoon && (currentPath === item.url || currentPath.startsWith(item.url + '/'))
            );

            return (
              <div key={group.label}>
                <Collapsible defaultOpen={isGroupActive}>
                  <SidebarGroup className="py-0">
                    <CollapsibleTrigger className="w-full">
                      <SidebarGroupLabel className="flex items-center justify-between w-full px-4 py-1.5 cursor-pointer hover:bg-sidebar-accent/20 rounded-md mx-1 transition-colors">
                        <div className="flex items-center gap-2.5">
                          <group.icon className={cn(
                            "h-4 w-4 flex-shrink-0",
                            isGroupActive ? "text-primary" : "text-sidebar-foreground/45"
                          )} />
                          {!isCollapsed && (
                            <span className={cn(
                              "text-[11px] font-semibold tracking-wide uppercase",
                              isGroupActive ? "text-primary" : "text-sidebar-foreground/45"
                            )}>
                              {group.label}
                            </span>
                          )}
                        </div>
                        {!isCollapsed && (
                          <ChevronDown className="h-3 w-3 text-sidebar-foreground/30 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                        )}
                      </SidebarGroupLabel>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <SidebarGroupContent>
                        <SidebarMenu>
                          {group.items.map((item) => (
                            <SidebarMenuItem key={item.title + item.url}>
                              <SidebarMenuButton asChild={!item.comingSoon}>
                                {item.comingSoon ? (
                                  <div className="flex items-center gap-2.5 px-3 py-1 ml-5 mr-2 rounded-md text-sidebar-foreground/30 text-[13px] cursor-default select-none">
                                    <item.icon className="h-3.5 w-3.5 flex-shrink-0" />
                                    <span className="truncate">{item.title}</span>
                                    {!isCollapsed && (
                                      <Badge variant="outline" className="ml-auto text-[9px] px-1.5 py-0 h-4 border-sidebar-foreground/15 text-sidebar-foreground/25 font-normal">
                                        Em breve
                                      </Badge>
                                    )}
                                  </div>
                                ) : (
                                  <NavLink
                                    to={item.url}
                                    end
                                    className="flex items-center gap-2.5 px-3 py-1 ml-5 mr-2 rounded-md transition-colors hover:bg-sidebar-accent/30 text-sidebar-foreground/60 hover:text-sidebar-foreground text-[13px]"
                                    activeClassName="bg-primary/10 text-primary font-medium"
                                  >
                                    <item.icon className="h-3.5 w-3.5 flex-shrink-0" />
                                    <span className="truncate">{item.title}</span>
                                  </NavLink>
                                )}
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          ))}
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
