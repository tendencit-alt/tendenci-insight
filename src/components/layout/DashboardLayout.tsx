import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { TendenciAssistant } from "@/components/ai/TendenciAssistant";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, profile, signOut } = useAuth();

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-500',
      vendedor: 'bg-blue-500',
      arquiteto: 'bg-green-500'
    };
    return colors[role] || 'bg-gray-500';
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: 'Admin',
      vendedor: 'Vendedor',
      arquiteto: 'Arquiteto'
    };
    return labels[role] || role;
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-border/40 bg-card/65 backdrop-blur-[12px] supports-[backdrop-filter]:bg-card/65 px-6 shadow-sm">
            <SidebarTrigger className="hover:bg-muted/50 transition-colors rounded-lg" />
            <div className="flex-1" />
            
            <NotificationBell />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-3 h-auto py-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className={`${getRoleColor(profile?.role)} text-white`}>
                      {profile?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-medium">{profile?.full_name || user?.email}</span>
                    <Badge variant="outline" className="text-xs">
                      {getRoleLabel(profile?.role)}
                    </Badge>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
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
          </header>

          <main className="flex-1 p-4 lg:p-6 bg-gradient-to-br from-background via-muted/20 to-muted/30 min-h-screen max-w-[2000px] mx-auto w-full">
            {children}
          </main>
        </div>
      </div>
      <TendenciAssistant />
    </SidebarProvider>
  );
}