import { useMemo } from 'react';
import ReactFlow, { Background, Controls, Node, Edge, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

interface Props {
  events: any[];
  rootCauseModule: string | null;
  onSelectModule?: (code: string) => void;
}

const severityColor = (level: string) => {
  switch (level) {
    case 'critical': return 'hsl(var(--destructive))';
    case 'high': return 'hsl(0 84% 60%)';
    case 'moderate': return 'hsl(38 92% 50%)';
    default: return 'hsl(var(--muted-foreground))';
  }
};

export function DependencyCascadeMap({ events, rootCauseModule, onSelectModule }: Props) {
  const { nodes, edges } = useMemo(() => {
    if (!events?.length) return { nodes: [], edges: [] };

    const moduleSet = new Set<string>();
    events.forEach(e => {
      moduleSet.add(e.failed_module_code);
      moduleSet.add(e.impacted_module_code);
    });

    const failedModules = new Set(events.map(e => e.failed_module_code));
    const impactedModules = new Set(events.map(e => e.impacted_module_code));

    // Layout em camadas: causa-raiz (esquerda), falhos (centro), impactados (direita)
    const layered: Record<string, string[]> = { root: [], failed: [], impacted: [] };
    moduleSet.forEach(m => {
      if (m === rootCauseModule) layered.root.push(m);
      else if (failedModules.has(m)) layered.failed.push(m);
      else if (impactedModules.has(m)) layered.impacted.push(m);
    });

    const nodes: Node[] = [];
    const colWidth = 280;

    const placeColumn = (mods: string[], colIdx: number, color: string, label?: string) => {
      mods.forEach((code, i) => {
        const isRoot = code === rootCauseModule;
        nodes.push({
          id: code,
          position: { x: colIdx * colWidth, y: i * 90 + 30 },
          data: { label: code },
          style: {
            background: isRoot ? 'hsl(280 70% 50%)' : color,
            color: 'hsl(0 0% 100%)',
            border: isRoot ? '3px solid hsl(280 90% 70%)' : '1px solid hsl(var(--border))',
            borderRadius: 8,
            padding: 10,
            fontSize: 12,
            fontWeight: 600,
            minWidth: 160,
            cursor: 'pointer',
          },
        });
      });
    };

    placeColumn(layered.root, 0, 'hsl(280 70% 50%)');
    placeColumn(layered.failed, 1, 'hsl(0 84% 55%)');
    placeColumn(layered.impacted, 2, 'hsl(38 92% 50%)');

    const edges: Edge[] = events.map((e, idx) => ({
      id: `${e.id || idx}`,
      source: e.failed_module_code,
      target: e.impacted_module_code,
      animated: e.impact_level === 'critical' || e.impact_level === 'high',
      style: { stroke: severityColor(e.impact_level), strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: severityColor(e.impact_level) },
      label: e.impact_level,
      labelStyle: { fontSize: 10, fontWeight: 600 },
      labelBgStyle: { fill: 'hsl(var(--background))' },
    }));

    return { nodes, edges };
  }, [events, rootCauseModule]);

  if (!nodes.length) {
    return (
      <div className="h-[420px] flex items-center justify-center text-muted-foreground border rounded-lg bg-muted/20">
        Nenhuma cascata ativa detectada.
      </div>
    );
  }

  return (
    <div className="h-[480px] border rounded-lg bg-background">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        onNodeClick={(_, n) => onSelectModule?.(n.id)}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
