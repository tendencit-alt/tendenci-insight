import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  TrendingUp, 
  MessageSquare,
  Settings,
  Package
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

const menuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Leads", url: "/leads", icon: TrendingUp },
  { title: "Negócios", url: "/deals", icon: Briefcase },
  { title: "Projetos", url: "/projects", icon: Package },
  { title: "Arquitetos", url: "/architects", icon: Users },
  { title: "Cadências", url: "/cadences", icon: MessageSquare },
  { title: "Configurações", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent>
        <div className="px-4 py-6 border-b border-sidebar-border">
          {isCollapsed ? (
            <div className="flex items-center justify-center">
              <img src={tendenciLogo} alt="Tendenci" className="h-8 w-8 object-contain" />
            </div>
          ) : (
            <img src={tendenciLogo} alt="Tendenci" className="h-10 w-auto object-contain" />
          )}
        </div>

        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="text-sidebar-foreground/60 uppercase text-xs font-semibold tracking-wider">
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end={item.url === "/"}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 hover:bg-sidebar-accent"
                      activeClassName="bg-primary text-primary-foreground font-medium shadow-sm"
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
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