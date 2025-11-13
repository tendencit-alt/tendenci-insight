import { 
  LayoutDashboard, 
  Users, 
  TrendingUp, 
  MessageSquare,
  Settings,
  Package,
  Target
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import tendenciLogo from "@/assets/tendenci-logo.png";
import { usePermissions } from "@/hooks/usePermissions";

const menuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, module: null },
  { title: "Leads", url: "/leads", icon: TrendingUp, module: "leads" },
  { title: "Projetos", url: "/projects", icon: Package, module: "projetos" },
  { title: "Arquitetos", url: "/architects", icon: Users, module: "arquitetos" },
  { title: "CRM KANBAN", url: "/kanban", icon: MessageSquare, module: "crm" },
  { title: "Metas", url: "/metas", icon: Target, module: "metas" },
  { title: "Configurações", url: "/settings", icon: Settings, module: "configuracoes" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { hasModuleAccess, loading } = usePermissions();

  const visibleMenuItems = menuItems.filter((item) => {
    if (loading) return true; // Show all while loading
    if (!item.module) return true; // Dashboard is always visible
    return hasModuleAccess(item.module);
  });

  return (
    <Sidebar 
      collapsible="icon" 
      className="border-r border-sidebar-border bg-gradient-to-b from-sidebar-background to-[hsl(0,0%,6%)]"
      style={{
        backgroundImage: 'linear-gradient(180deg, hsl(0, 0%, 9%) 0%, hsl(0, 0%, 6%) 100%)'
      }}
    >
      <SidebarContent>
        <div className="px-4 py-6 border-b border-sidebar-border/50">
          {isCollapsed ? (
            <div className="flex items-center justify-center">
              <img src={tendenciLogo} alt="Tendenci" className="h-8 w-8 object-contain" />
            </div>
          ) : (
            <div className="space-y-2">
              <img src={tendenciLogo} alt="Tendenci" className="h-10 w-auto object-contain" />
              <p className="text-xs text-sidebar-foreground/60 font-semibold tracking-wider uppercase">
                System
              </p>
            </div>
          )}
        </div>

        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="text-sidebar-foreground/60 uppercase text-xs font-semibold tracking-wider">
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end={item.url === "/"}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 hover:bg-sidebar-accent group"
                      activeClassName="bg-primary text-primary-foreground font-semibold shadow-[0_0_12px_rgba(212,30,30,0.6)]"
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                      <span className="truncate">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}