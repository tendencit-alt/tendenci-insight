import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Settings2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboardLayout } from "@/hooks/useDashboardLayout";
import { WidgetContainer } from "./WidgetContainer";
import { WidgetCatalog } from "./WidgetCatalog";
import { SavedDashboardsBar } from "./SavedDashboardsBar";
import { WidgetRenderer } from "./WidgetRenderer";
import { SIZE_CLASSES, PROFILE_LABELS } from "./types";
import type { DashboardProfile, SavedDashboard } from "./types";
import { toast } from "sonner";

interface Props {
  defaultProfile?: DashboardProfile;
  showProfileTabs?: boolean;
  className?: string;
}

export function SmartDashboard({
  defaultProfile = "owner",
  showProfileTabs = true,
  className,
}: Props) {
  const [profile, setProfile] = useState<DashboardProfile>(defaultProfile);
  const [editing, setEditing] = useState(false);
  const { widgets, addWidget, removeWidget, resizeWidget, togglePin, moveWidget, reset } =
    useDashboardLayout(profile);

  const handleLoadSaved = (dash: SavedDashboard) => {
    // Reset and apply saved widgets
    reset();
    // Note: useDashboardLayout doesn't expose setWidgets directly to keep API clean.
    // For full restore we re-add widgets via addWidget after reset; we accept default sort.
    setTimeout(() => {
      // Clear default and add saved widgets in order
      const currentIds = widgets.map((w) => w.widgetId);
      currentIds.forEach((id) => removeWidget(id));
      dash.widgets.forEach((w) => {
        addWidget(w.widgetId);
        if (w.size) resizeWidget(w.widgetId, w.size);
        if (w.pinned) togglePin(w.widgetId);
      });
      toast.success(`Visão "${dash.name}" carregada`);
    }, 50);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {showProfileTabs && (
          <Tabs value={profile} onValueChange={(v) => setProfile(v as DashboardProfile)}>
            <TabsList className="h-8">
              {(Object.keys(PROFILE_LABELS) as DashboardProfile[]).map((p) => (
                <TabsTrigger key={p} value={p} className="text-xs h-7">
                  {PROFILE_LABELS[p]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <SavedDashboardsBar profile={profile} widgets={widgets} onLoad={handleLoadSaved} />
          <WidgetCatalog profile={profile} current={widgets} onAdd={addWidget} />
          <Button
            variant={editing ? "secondary" : "outline"}
            size="sm"
            className="h-8"
            onClick={() => setEditing(!editing)}
          >
            <Settings2 className="h-3.5 w-3.5 mr-1.5" />
            {editing ? "Concluir" : "Editar"}
          </Button>
          {editing && (
            <Button variant="ghost" size="sm" className="h-8" onClick={() => { reset(); toast.success("Layout restaurado"); }}>
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Restaurar
            </Button>
          )}
        </div>
      </div>

      {/* Grid */}
      {widgets.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-sm text-muted-foreground mb-3">Nenhum widget no dashboard</p>
          <WidgetCatalog profile={profile} current={widgets} onAdd={addWidget} />
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-3">
          {widgets.map((w) => (
            <div key={w.widgetId} className={SIZE_CLASSES[w.size]}>
              <WidgetContainer
                instance={w}
                onRemove={removeWidget}
                onResize={resizeWidget}
                onPin={togglePin}
                onMove={moveWidget}
                editing={editing}
              >
                <WidgetRenderer widgetId={w.widgetId} />
              </WidgetContainer>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
