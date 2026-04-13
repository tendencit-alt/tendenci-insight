import { AuditCenter } from "@/components/auditoria/AuditCenter";
import { AppNavbar } from "@/components/layout/AppNavbar";

export default function Auditoria() {
  return (
    <div className="min-h-screen bg-background">
      <AppNavbar />
      <main className="container mx-auto px-4 py-6">
        <AuditCenter />
      </main>
    </div>
  );
}
