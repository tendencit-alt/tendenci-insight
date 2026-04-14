import { AppNavbar } from "./AppNavbar";
import { useGlobalRealtime } from "@/hooks/useGlobalRealtime";
import { GlobalBreadcrumb } from "./GlobalBreadcrumb";
import { CommandPalette } from "@/components/command-palette/CommandPalette";
import { useProductAnalytics } from "@/hooks/useProductAnalytics";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  useGlobalRealtime();
  useProductAnalytics();

  return (
    <div className="flex min-h-screen w-full flex-col">
      <AppNavbar />
      <CommandPalette />
      
      <main className="flex-1 p-4 lg:p-6 bg-background min-h-screen max-w-[1800px] mx-auto w-full">
        <GlobalBreadcrumb />
        {children}
      </main>
    </div>
  );
}
