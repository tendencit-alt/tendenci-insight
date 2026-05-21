import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Target, Plus } from "lucide-react";
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
  const { isMaster } = usePermissions();
  const userRole: string | null = null;
  const [searchParams] = useSearchParams();
  const viewParam = searchParams.get("view");
  const tabParam = searchParams.get("tab") || undefined;
  const [view, setView] = useState<CRMView>(() => {
    if (viewParam === "sdr" || viewParam === "consultor" || viewParam === "gestor") return viewParam;
    const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored === "sdr" || stored === "consultor" || stored === "gestor") return stored;
    return detectDefaultView(userRole, isMaster);
  });
  const [createOpen, setCreateOpen] = useState(false);

  // Sync view if URL changes
  useEffect(() => {
    if (viewParam === "sdr" || viewParam === "consultor" || viewParam === "gestor") {
      setView(viewParam);
    }
  }, [viewParam]);

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, view);
  }, [view]);

  const current = CRM_VIEWS.find((v) => v.key === view)!;

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Topbar compacta sticky */}
        <div className="sticky top-0 z-20 -mx-4 px-4 py-3 bg-background/85 backdrop-blur border-b">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Target className="h-5 w-5 text-primary shrink-0" />
              <h1 className="text-lg font-semibold text-foreground truncate">CRM</h1>
              <span className="hidden md:inline text-xs text-muted-foreground truncate">
                · {current.tagline}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CRMViewSwitcher value={view} onChange={setView} />
              <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" />
                Novo
              </Button>
            </div>
          </div>
        </div>

        {/* View content */}
        <div>
          {view === "sdr" && <SDRView />}
          {view === "consultor" && <ConsultorView />}
          {view === "gestor" && <GestorView />}
        </div>

        <CreateProjectDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSuccess={() => setCreateOpen(false)}
        />
      </div>
    </DashboardLayout>
  );
}
