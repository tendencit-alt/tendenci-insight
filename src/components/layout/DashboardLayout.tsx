import { AppNavbar } from "./AppNavbar";
import { useGlobalRealtime } from "@/hooks/useGlobalRealtime";
import { SmartBreadcrumb } from "@/components/navigation-intelligence/SmartBreadcrumb";
import { RecentNavigationBar } from "@/components/navigation-intelligence/RecentNavigationBar";
// Simplificação MVP: barras "AÇÕES:" e "PRÓXIMO:" ocultas (componentes preservados).
// import { ContextualShortcutsBar } from "@/components/navigation-intelligence/ContextualShortcutsBar";
// import { NextActionSuggestion } from "@/components/navigation-intelligence/NextActionSuggestion";
import { PermissionSimulatorTrigger } from "@/components/smart-permissions/PermissionSimulator";
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

      <main className="flex-1 p-4 lg:p-6 bg-background min-h-screen max-w-[1800px] mx-auto w-full">
        <RecentNavigationBar />
        <SmartBreadcrumb />
        {/* <ContextualShortcutsBar /> */}
        {/* <NextActionSuggestion /> */}
        <div className="flex justify-end mb-2"><PermissionSimulatorTrigger /></div>
        {children}
      </main>
    </div>
  );
}
