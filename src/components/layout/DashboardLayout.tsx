import { AppNavbar } from "./AppNavbar";
import { useGlobalRealtime } from "@/hooks/useGlobalRealtime";
import { SmartBreadcrumb } from "@/components/navigation-intelligence/SmartBreadcrumb";
import { RecentNavigationBar } from "@/components/navigation-intelligence/RecentNavigationBar";
import { ContextualShortcutsBar } from "@/components/navigation-intelligence/ContextualShortcutsBar";
import { NextActionSuggestion } from "@/components/navigation-intelligence/NextActionSuggestion";
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
        <RecentNavigationBar />
        <SmartBreadcrumb />
        <ContextualShortcutsBar />
        <NextActionSuggestion />
        {children}
      </main>
    </div>
  );
}
