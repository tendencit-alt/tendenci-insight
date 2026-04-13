import { AppNavbar } from "./AppNavbar";
import { useGlobalRealtime } from "@/hooks/useGlobalRealtime";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  useGlobalRealtime();

  return (
    <div className="flex min-h-screen w-full flex-col">
      <AppNavbar />
      
      <main className="flex-1 p-4 lg:p-6 bg-background min-h-screen max-w-[1800px] mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
