import { useState, useEffect, useMemo } from "react";
import * as LucideIcons from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LogOut, User, Menu, Edit2, ChevronDown, Settings, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { supabase } from "@/integrations/supabase/client";
import { EditMenuItemDialog } from "./EditMenuItemDialog";

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  route: string;
  module: string;
  position: number;
  visible: boolean;
  category: string;
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="h-8 w-8 hover:bg-muted/50"
      title={theme === "dark" ? "Modo Claro" : "Modo Escuro"}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

export function AppNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { hasModuleAccess, loading, isMaster } = usePermissions();
  const { profile, user, signOut } = useAuth();
  const { data: companySettings } = useCompanySettings();
  const companyLogo = companySettings?.logo_url;
  const companyName = companySettings?.trade_name || companySettings?.company_name || 'Sistema';

  useEffect(() => {
    fetchMenuItems();
    const channel = supabase
      .channel('menu_items_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => fetchMenuItems())
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, []);

  const fetchMenuItems = async () => {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('visible', true)
      .order('position', { ascending: true });
    if (!error && data) setMenuItems(data as MenuItem[]);
  };

  const handleEditMenuItem = (item: MenuItem, e: React.MouseEvent) => {
    if (!isMaster) return;
    e.preventDefault();
    e.stopPropagation();
    setEditingItem(item);
    setEditDialogOpen(true);
  };

  const getIconComponent = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName];
    return Icon || LucideIcons.HelpCircle;
  };

  const visibleMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (loading) return true;
      if (item.module) return hasModuleAccess(item.module as any);
      if (item.category === 'master' && !isMaster) return false;
      return true;
    });
  }, [menuItems, loading, isMaster, hasModuleAccess]);

  // Split items by type
  const directItems = useMemo(() => visibleMenuItems.filter(i => i.category === 'direct'), [visibleMenuItems]);
  const financeiroItems = useMemo(() => visibleMenuItems.filter(i => i.category === 'financeiro'), [visibleMenuItems]);
  const cadastrosItems = useMemo(() => visibleMenuItems.filter(i => i.category === 'cadastros'), [visibleMenuItems]);
  const masterItems = useMemo(() => visibleMenuItems.filter(i => i.category === 'master'), [visibleMenuItems]);

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = { admin: 'bg-red-500', vendedor: 'bg-blue-500', arquiteto: 'bg-green-500' };
    return colors[role] || 'bg-gray-500';
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = { admin: 'Admin', vendedor: 'Vendedor', arquiteto: 'Arquiteto' };
    return labels[role] || role;
  };

  const renderDirectLink = (item: MenuItem) => {
    const IconComponent = getIconComponent(item.icon);
    return (
      <div key={item.id} className="relative group flex items-center">
        <NavLink
          to={item.route}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md hover:bg-muted/50 font-medium transition-colors"
          activeClassName="bg-primary/10 text-primary font-semibold"
        >
          <IconComponent className="h-4 w-4 flex-shrink-0" />
          <span className="whitespace-nowrap">{item.label}</span>
        </NavLink>
        {isMaster && (
          <button
            onClick={(e) => handleEditMenuItem(item, e)}
            className="absolute -right-1 -top-1 opacity-0 group-hover:opacity-100 transition-opacity bg-card rounded-full p-0.5 shadow-sm border border-border"
            title="Editar"
          >
            <Edit2 className="h-2.5 w-2.5" />
          </button>
        )}
      </div>
    );
  };

  const renderDropdown = (items: MenuItem[], label: string, DropdownIcon: React.ElementType) => {
    if (!items || items.length === 0) return null;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-1.5 px-3 py-1.5 h-auto text-xs rounded-md hover:bg-muted/50">
            <DropdownIcon className="h-4 w-4 flex-shrink-0" />
            <span className="whitespace-nowrap font-medium">{label}</span>
            <ChevronDown className="h-3 w-3 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52 bg-card border border-border shadow-lg">
          <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">{label}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {items.map((item) => {
            const IconComponent = getIconComponent(item.icon);
            return (
              <DropdownMenuItem key={item.id} asChild className="cursor-pointer">
                <NavLink to={item.route} className="flex items-center gap-2 w-full px-2 py-2" activeClassName="bg-primary/10 text-primary font-medium">
                  <IconComponent className="h-4 w-4" />
                  <span>{item.label}</span>
                  {isMaster && (
                    <button onClick={(e) => handleEditMenuItem(item, e)} className="ml-auto opacity-50 hover:opacity-100 transition-opacity" title="Editar">
                      <Edit2 className="h-3 w-3" />
                    </button>
                  )}
                </NavLink>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  // Mobile category sections
  const mobileSections = useMemo(() => {
    const sections: { label: string; items: MenuItem[] }[] = [];
    if (directItems.length > 0) sections.push({ label: 'Principal', items: directItems });
    if (financeiroItems.length > 0) sections.push({ label: 'Financeiro', items: financeiroItems });
    if (cadastrosItems.length > 0) sections.push({ label: 'Cadastros', items: cadastrosItems });
    if (masterItems.length > 0) sections.push({ label: 'Configurações', items: masterItems });
    return sections;
  }, [directItems, financeiroItems, cadastrosItems, masterItems]);

  return (
    <nav className="sticky top-0 z-50 h-14 border-b border-border/40 bg-card/95 text-card-foreground backdrop-blur-[12px] supports-[backdrop-filter]:bg-card/95 shadow-sm">
      <div className="flex items-center h-full px-3 max-w-[1800px] mx-auto gap-2">
        {companyLogo ? (
          <img src={companyLogo} alt={companyName} className="h-7 w-auto flex-shrink-0" />
        ) : (
          <span className="font-bold text-sm flex-shrink-0">{companyName}</span>
        )}

        {/* Desktop Menu */}
        <div className="hidden xl:flex items-center gap-1 flex-1 ml-4">
          {/* Direct links: Dashboard, Pedidos, Produção */}
          {directItems.map(renderDirectLink)}

          {/* Financeiro dropdown (Financeiro + Cadastros Financeiros) */}
          {renderDropdown(financeiroItems, 'Financeiro', LucideIcons.Wallet)}

          {/* Cadastros dropdown (Fornecedores + Estoque) */}
          {renderDropdown(cadastrosItems, 'Cadastros', LucideIcons.Database)}
        </div>

        {/* Mobile Menu */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild className="xl:hidden">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-border/50">
                {companyLogo ? (
                  <img src={companyLogo} alt={companyName} className="h-12 w-auto" />
                ) : (
                  <span className="font-bold text-lg">{companyName}</span>
                )}
                <p className="text-xs text-muted-foreground font-semibold tracking-wider uppercase mt-2">System</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {mobileSections.map((section) => (
                  <div key={section.label} className="mb-4">
                    <p className="text-xs text-muted-foreground font-semibold tracking-wider uppercase mb-2 px-3">{section.label}</p>
                    <div className="space-y-1">
                      {section.items.map((item) => {
                        const IconComponent = getIconComponent(item.icon);
                        return (
                          <NavLink
                            key={item.id}
                            to={item.route}
                            end={item.route === "/"}
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 hover:bg-muted"
                            activeClassName="bg-primary text-primary-foreground font-semibold shadow-[0_0_12px_rgba(212,30,30,0.6)]"
                          >
                            <IconComponent className="h-5 w-5 flex-shrink-0" />
                            <span>{item.label}</span>
                          </NavLink>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex-1 xl:flex-none" />

        {/* Right side: Theme + Notifications + Settings gear + User */}
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <NotificationBell />

          {/* Settings gear icon (master only) */}
          {masterItems.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted/50" title="Configurações">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 bg-card border border-border shadow-lg">
                <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">Configurações</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {masterItems.map((item) => {
                  const IconComponent = getIconComponent(item.icon);
                  return (
                    <DropdownMenuItem key={item.id} asChild className="cursor-pointer">
                      <NavLink to={item.route} className="flex items-center gap-2 w-full px-2 py-2" activeClassName="bg-primary/10 text-primary font-medium">
                        <IconComponent className="h-4 w-4" />
                        <span>{item.label}</span>
                      </NavLink>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-1.5 h-auto py-1 px-1.5">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className={`${getRoleColor(profile?.role)} text-white text-[10px]`}>
                    {profile?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden lg:flex flex-col items-start">
                  <span className="text-[11px] font-medium leading-tight">{profile?.full_name || user?.email}</span>
                  <Badge variant="outline" className="text-[9px] h-3.5 px-1">{getRoleLabel(profile?.role)}</Badge>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-card border border-border">
              <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                <User className="mr-2 h-4 w-4" />
                <span>{user?.email}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-red-600 focus:text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <EditMenuItemDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} menuItem={editingItem} onSuccess={fetchMenuItems} />
    </nav>
  );
}
