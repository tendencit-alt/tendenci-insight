import { Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePermissionSimulation } from "@/contexts/PermissionSimulationContext";

/** Sticky banner shown while Owner is in permission simulation mode. */
export function SimulationBanner() {
  const sim = usePermissionSimulation();

  if (!sim.state.active) return null;

  const label =
    sim.state.targetUserName
      ? `${sim.state.targetUserName} · ${sim.effectiveProfileName ?? sim.state.targetProfileName ?? "perfil"}`
      : sim.effectiveProfileName ?? sim.state.targetProfileName ?? "perfil";

  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-3 border-b border-primary/40 bg-primary/10 px-4 py-1.5 text-xs">
      <Eye className="h-3.5 w-3.5 text-primary" />
      <span className="font-medium text-primary">
        Modo simulação ativo — visualizando como <strong>{label}</strong>
      </span>
      <Button variant="ghost" size="sm" className="h-6 gap-1" onClick={sim.stopSimulation}>
        <X className="h-3 w-3" /> Sair
      </Button>
    </div>
  );
}
