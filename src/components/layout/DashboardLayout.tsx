import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-border/40 bg-card/65 backdrop-blur-[12px] supports-[backdrop-filter]:bg-card/65 px-6 shadow-sm">
            <SidebarTrigger className="hover:bg-muted/50 transition-colors rounded-lg" />
            <div className="flex-1" />
          </header>

          <main className="flex-1 p-8 bg-gradient-to-br from-background via-muted/20 to-muted/30 min-h-screen">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}