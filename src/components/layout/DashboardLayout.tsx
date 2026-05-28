import { AppNavbar } from "./AppNavbar";
import { OwnerImpersonationBanner } from "./OwnerImpersonationBanner";
import { AppFooter } from "./AppFooter";
import { useGlobalRealtime } from "@/hooks/useGlobalRealtime";
import { SmartBreadcrumb } from "@/components/navigation-intelligence/SmartBreadcrumb";
import { RecentNavigationBar } from "@/components/navigation-intelligence/RecentNavigationBar";
import { useProductAnalytics } from "@/hooks/useProductAnalytics";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  useGlobalRealtime();
  useProductAnalytics();

  return (
    <div className="flex min-h-screen w-full flex-col">
      <OwnerImpersonationBanner />
      <AppNavbar />

      <main className="flex-1 p-4 lg:p-6 bg-background max-w-[1800px] mx-auto w-full">
        <RecentNavigationBar />
        <SmartBreadcrumb />
        {children}
      </main>
      <AppFooter />
    </div>
  );
}
