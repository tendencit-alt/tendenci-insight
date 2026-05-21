import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, Plus, Sparkles } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { CRMViewSwitcher, CRM_VIEWS, type CRMView } from "@/components/crm/CRMViewSwitcher";
import { SDRView } from "@/components/crm/views/SDRView";
import { ConsultorView } from "@/components/crm/views/ConsultorView";
import { GestorView } from "@/components/crm/views/GestorView";
import { CreateProjectDialog } from "@/components/projects/CreateProjectDialog";

const STORAGE_KEY = "crm_view_preference";

function detectDefaultView(role: string | null | undefined, isMaster: boolean): CRMView {
  if (isMaster) return "gestor";
  const r = (role || "").toLowerCase();
  if (r.includes("sdr") || r.includes("prospec")) return "sdr";
  if (r.includes("gestor") || r.includes("admin") || r.includes("diretor") || r.includes("owner"))
    return "gestor";
  return "consultor";
}

export default function CRM() {
  const { isMaster, userRole } = usePermissions();
  const [view, setView] = useState<CRMView>(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored === "sdr" || stored === "consultor" || stored === "gestor") return stored;
    return detectDefaultView(userRole, isMaster);
  });
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, view);
  }, [view]);

  const current = CRM_VIEWS.find((v) => v.key === view)!;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/20 to-primary/5 p-3">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">CRM</h1>
              <p className="text-sm text-muted-foreground">
                Captação, qualificação, propostas e pipeline em um único lugar.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CRMViewSwitcher value={view} onChange={setView} />
            <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Novo negócio
            </Button>
          </div>
        </div>

        {/* Onboarding banner */}
        <Card className="flex items-start gap-3 border-primary/20 bg-primary/5 p-4">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="min-w-0 text-sm">
            <span className="font-medium text-foreground">{current.label}.</span>{" "}
            <span className="text-muted-foreground">{current.tagline}</span>
          </div>
        </Card>

        {/* View content */}
        <div>
          {view === "sdr" && <SDRView />}
          {view === "consultor" && <ConsultorView />}
          {view === "gestor" && <GestorView />}
        </div>

        <CreateProjectDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onProjectCreated={() => setCreateOpen(false)}
        />
      </div>
    </DashboardLayout>
  );
}
