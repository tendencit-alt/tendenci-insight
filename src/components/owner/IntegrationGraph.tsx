import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { ModuleNode, IntegrationEdge, HealthSnapshot } from "@/hooks/useIntegrationMap";

interface Props {
  modules: ModuleNode[];
  edges: IntegrationEdge[];
  snapshots: HealthSnapshot[];
  onSelectModule: (code: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  green: "hsl(142 76% 45%)",
  yellow: "hsl(45 93% 55%)",
  red: "hsl(0 84% 60%)",
  gray: "hsl(var(--muted-foreground))",
};

const GROUP_COLORS: Record<string, string> = {
  financial: "hsl(217 91% 60%)",
  commercial: "hsl(280 70% 60%)",
  operational: "hsl(35 90% 55%)",
  platform: "hsl(160 70% 45%)",
};

export function IntegrationGraph({ modules, edges, snapshots, onSelectModule }: Props) {
  const { nodes, rfEdges } = useMemo(() => {
    // Layout circular agrupado por module_group
    const groups = Array.from(new Set(modules.map((m) => m.module_group)));
    const groupCenters: Record<string, { x: number; y: number }> = {};
    const radius = 320;
    groups.forEach((g, i) => {
      const angle = (i / groups.length) * Math.PI * 2;
      groupCenters[g] = {
        x: 500 + Math.cos(angle) * radius,
        y: 350 + Math.sin(angle) * radius,
      };
    });

    const nodes: Node[] = modules.map((m) => {
      const groupModules = modules.filter((x) => x.module_group === m.module_group);
      const idx = groupModules.indexOf(m);
      const center = groupCenters[m.module_group];
      const localAngle = (idx / Math.max(groupModules.length, 1)) * Math.PI * 2;
      const localR = 80;
      return {
        id: m.code,
        type: "default",
        position: {
          x: center.x + Math.cos(localAngle) * localR,
          y: center.y + Math.sin(localAngle) * localR,
        },
        data: { label: m.name },
        style: {
          background: GROUP_COLORS[m.module_group] || "hsl(var(--muted))",
          color: "hsl(var(--primary-foreground))",
          border: "2px solid hsl(var(--border))",
          borderRadius: 12,
          padding: "8px 12px",
          fontSize: 11,
          fontWeight: 600,
          width: 130,
          textAlign: "center" as const,
        },
      };
    });

    const snapMap = new Map(
      snapshots.map((s) => [`${s.source_module_code}|${s.target_module_code}`, s]),
    );

    const rfEdges: Edge[] = edges.map((e) => {
      const snap = snapMap.get(`${e.source_module_code}|${e.target_module_code}`);
      const status = snap?.current_status || "gray";
      const color = STATUS_COLORS[status];
      const animated = status === "green" || status === "yellow";
      return {
        id: e.id,
        source: e.source_module_code,
        target: e.target_module_code,
        animated,
        style: {
          stroke: color,
          strokeWidth: e.criticality === "high" ? 2.5 : 1.5,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color,
        },
      };
    });

    return { nodes, rfEdges };
  }, [modules, edges, snapshots]);

  return (
    <div className="h-[600px] w-full rounded-lg border border-border/60 bg-card">
      <ReactFlow
        nodes={nodes}
        edges={rfEdges}
        onNodeClick={(_, node) => onSelectModule(node.id)}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} size={1} color="hsl(var(--border))" />
        <Controls showInteractive={false} />
        <MiniMap
          pannable
          zoomable
          style={{ background: "hsl(var(--muted))" }}
          nodeColor={(n) => {
            const m = modules.find((x) => x.code === n.id);
            return m ? GROUP_COLORS[m.module_group] : "hsl(var(--muted-foreground))";
          }}
        />
      </ReactFlow>
    </div>
  );
}
