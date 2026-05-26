import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Target, Plus, Sparkles, LayoutGrid, FileText, Users } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { CRMViewSwitcher, CRM_VIEWS, type CRMView } from "@/components/crm/CRMViewSwitcher";
import { SDRView } from "@/components/crm/views/SDRView";
import { ConsultorView } from "@/components/crm/views/ConsultorView";
import { GestorView } from "@/components/crm/views/GestorView";
import { CreateProjectDialog } from "@/components/projects/CreateProjectDialog";
import { cn } from "@/lib/utils";
import { Can } from "@/components/auth/Can";

const STORAGE_KEY = "crm_view_preference";

function detectDefaultView(role: string | null | undefined, isMaster: boolean): CRMView {
  if (isMaster) return "gestor";
  const r = (role || "").toLowerCase();
  if (r.includes("sdr") || r.includes("prospec")) return "sdr";
  if (r.includes("gestor") || r.includes("admin") || r.includes("diretor") || r.includes("owner"))
    return "gestor";
  return "consultor";
}

type Shortcut = { key: string; label: string; icon: any; view: CRMView; tab: string };
const SHORTCUTS: Shortcut[] = [
  { key: "leads", label: "Leads", icon: Sparkles, view: "sdr", tab: "leads" },
  { key: "prospeccao", label: "Prospecção", icon: LayoutGrid, view: "sdr", tab: "prospeccao" },
  { key: "propostas", label: "Propostas", icon: FileText, view: "consultor", tab: "propostas" },
  { key: "contratos", label: "Contratos", icon: Users, view: "consultor", tab: "clientes" },
];

export default function CRM() {
  const { isMaster } = usePermissions();
  const userRole: string | null = null;
  const [searchParams, setSearchParams] = useSearchParams();
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

  const goTo = (s: Shortcut) => {
    setView(s.view);
    const next = new URLSearchParams(searchParams);
    next.set("view", s.view);
    next.set("tab", s.tab);
    setSearchParams(next, { replace: true });
  };

  const handleViewChange = (v: CRMView) => {
    setView(v);
    const next = new URLSearchParams(searchParams);
    next.set("view", v);
    next.delete("tab");
    setSearchParams(next, { replace: true });
  };

  const activeShortcut = SHORTCUTS.find((s) => s.view === view && s.tab === tabParam)?.key;

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
              <CRMViewSwitcher value={view} onChange={handleViewChange} />
              <Can module="comercial" action="create">
                <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  Novo
                </Button>
              </Can>
            </div>
          </div>

          {/* Atalhos rápidos — navegação interna sem sair do CRM */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground mr-1">
              Atalhos:
            </span>
            {SHORTCUTS.map((s) => {
              const Icon = s.icon;
              const active = activeShortcut === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => goTo(s)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-muted text-foreground border-border"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* View content — key força remount ao trocar tab via atalho */}
        <div>
          {view === "sdr" && <SDRView key={`sdr-${tabParam ?? "default"}`} initialTab={tabParam} />}
          {view === "consultor" && (
            <ConsultorView key={`consultor-${tabParam ?? "default"}`} initialTab={tabParam} />
          )}
          {view === "gestor" && (
            <GestorView key={`gestor-${tabParam ?? "default"}`} initialTab={tabParam} />
          )}
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
