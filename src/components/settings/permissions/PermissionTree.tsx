/**
 * PermissionTree — UI em árvore espelhada do menu do sistema.
 *
 * MODELO DE DADOS:
 * - `permissions[module]`         → permissão por módulo (baseline / fallback)
 * - `overrides[feature_key]`      → permissão explícita por folha (rota/aba)
 *
 * EFETIVO: override ?? module. Ao salvar:
 * - Toggle em folha → escreve apenas no override daquela feature_key.
 * - Toggle em raiz (cascata) → escreve override em TODAS as folhas filhas.
 * - "Marcar tudo / Desmarcar tudo" → escreve overrides explícitos.
 * Backfill: ausência total de overrides == comportamento atual (só módulo).
 */

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  MENU_PERMISSION_MAP,
  type MenuLeaf,
  type MenuRoot,
} from '@/config/menuPermissionMap';

export type TreeAction = 'can_view' | 'can_create' | 'can_edit' | 'can_delete';

const ACTION_COLUMNS: { key: TreeAction; label: string; flags: string[] }[] = [
  { key: 'can_view',   label: 'Ver',     flags: ['can_view', 'can_export'] },
  { key: 'can_create', label: 'Criar',   flags: ['can_create'] },
  { key: 'can_edit',   label: 'Editar',  flags: ['can_edit', 'can_approve', 'can_conciliate'] },
  { key: 'can_delete', label: 'Excluir', flags: ['can_delete', 'can_admin'] },
];

export interface ModulePermissionRecord {
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_approve: boolean;
  can_conciliate: boolean;
  can_export: boolean;
  can_admin: boolean;
}

export interface FeatureOverride {
  can_view: boolean | null;
  can_create: boolean | null;
  can_edit: boolean | null;
  can_delete: boolean | null;
}

interface PermissionTreeProps {
  permissions: Record<string, ModulePermissionRecord>;
  overrides: Record<string, FeatureOverride>;
  onChange: (next: {
    permissions: Record<string, ModulePermissionRecord>;
    overrides: Record<string, FeatureOverride>;
  }) => void;
  showOwnerSections?: boolean;
}

function moduleHasAction(perm: ModulePermissionRecord | undefined, action: TreeAction): boolean {
  if (!perm) return false;
  const cols = ACTION_COLUMNS.find(c => c.key === action)!;
  return cols.flags.every(f => !!perm[f as keyof ModulePermissionRecord]);
}

/** Valor efetivo: override (se !== null) → senão módulo. */
function effective(
  leaf: MenuLeaf,
  action: TreeAction,
  permissions: Record<string, ModulePermissionRecord>,
  overrides: Record<string, FeatureOverride>,
): boolean {
  const ov = overrides[leaf.key];
  if (ov && ov[action] !== null && ov[action] !== undefined) return !!ov[action];
  return moduleHasAction(permissions[leaf.module], action);
}

function setOverride(
  overrides: Record<string, FeatureOverride>,
  featureKey: string,
  action: TreeAction,
  value: boolean,
): Record<string, FeatureOverride> {
  const cur: FeatureOverride = overrides[featureKey] ?? {
    can_view: null, can_create: null, can_edit: null, can_delete: null,
  };
  return { ...overrides, [featureKey]: { ...cur, [action]: value } };
}

export function PermissionTree({
  permissions,
  overrides,
  onChange,
  showOwnerSections = false,
}: PermissionTreeProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    MENU_PERMISSION_MAP.forEach(r => { init[r.key] = true; });
    return init;
  });
  const [query, setQuery] = useState('');

  const visibleRoots = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filterMatch = (text: string) => !q || text.toLowerCase().includes(q);
    return MENU_PERMISSION_MAP
      .filter(r => showOwnerSections || !r.ownerOnly)
      .map(r => ({
        ...r,
        leaves: r.leaves.filter(l =>
          (showOwnerSections || !l.ownerOnly) &&
          (filterMatch(r.label) || filterMatch(l.label) || filterMatch(l.key))
        ),
      }))
      .filter(r => r.leaves.length > 0);
  }, [query, showOwnerSections]);

  const toggleLeaf = (leaf: MenuLeaf, action: TreeAction, value: boolean) => {
    onChange({
      permissions,
      overrides: setOverride(overrides, leaf.key, action, value),
    });
  };

  const cascadeRoot = (root: MenuRoot, action: TreeAction, value: boolean) => {
    let nextOverrides = overrides;
    root.leaves.forEach(leaf => {
      nextOverrides = setOverride(nextOverrides, leaf.key, action, value);
    });
    onChange({ permissions, overrides: nextOverrides });
  };

  const cascadeRootAll = (root: MenuRoot, value: boolean) => {
    let nextOverrides = overrides;
    root.leaves.forEach(leaf => {
      ACTION_COLUMNS.forEach(col => {
        nextOverrides = setOverride(nextOverrides, leaf.key, col.key, value);
      });
    });
    onChange({ permissions, overrides: nextOverrides });
  };

  const clearLeafOverrides = (leaf: MenuLeaf) => {
    const next = { ...overrides };
    delete next[leaf.key];
    onChange({ permissions, overrides: next });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar item do menu..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <Badge variant="outline" className="text-[10px]">
          Granularidade por rota/aba
        </Badge>
      </div>

      <div
        className="grid gap-2 pb-1.5 border-b text-[10px] font-semibold text-muted-foreground uppercase tracking-wide"
        style={{ gridTemplateColumns: '1fr repeat(4, 70px)' }}
      >
        <div>Item</div>
        {ACTION_COLUMNS.map(c => (
          <div key={c.key} className="text-center">{c.label}</div>
        ))}
      </div>

      <div className="pr-3">
        <div className="space-y-1">
          {visibleRoots.map(root => {
            const isOpen = expanded[root.key] ?? true;
            return (
              <div key={root.key} className="rounded border border-border/40">
                <div
                  className="grid gap-2 items-center px-2 py-1.5 bg-muted/30 hover:bg-muted/50 cursor-pointer"
                  style={{ gridTemplateColumns: '1fr repeat(4, 70px)' }}
                  onClick={() => setExpanded(p => ({ ...p, [root.key]: !isOpen }))}
                >
                  <div className="flex items-center gap-1.5 font-semibold text-sm">
                    {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    {root.label}
                    {root.ownerOnly && (
                      <Badge variant="outline" className="text-[9px] h-4 ml-1">Owner</Badge>
                    )}
                  </div>
                  {ACTION_COLUMNS.map(col => {
                    const states = root.leaves.map(l => effective(l, col.key, permissions, overrides));
                    const allOn = states.every(Boolean);
                    const someOn = states.some(Boolean);
                    return (
                      <div key={col.key} className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={allOn ? true : (someOn ? 'indeterminate' : false)}
                          onCheckedChange={(v) => cascadeRoot(root, col.key, !!v)}
                        />
                      </div>
                    );
                  })}
                </div>

                {isOpen && (
                  <div className="divide-y divide-border/30">
                    {root.leaves.map(leaf => {
                      const hasOverride = !!overrides[leaf.key];
                      return (
                        <div
                          key={leaf.key}
                          className="grid gap-2 items-center px-2 py-1.5 hover:bg-muted/20"
                          style={{ gridTemplateColumns: '1fr repeat(4, 70px)' }}
                        >
                          <div className="pl-5 text-sm flex items-center gap-1.5 min-w-0">
                            <span className="truncate">{leaf.label}</span>
                            <code className="text-[9px] text-muted-foreground/60 truncate">{leaf.key}</code>
                            {hasOverride && (
                              <button
                                type="button"
                                onClick={() => clearLeafOverrides(leaf)}
                                title="Limpar override (volta a herdar do módulo)"
                                className="text-[9px] text-primary hover:underline shrink-0"
                              >
                                ✕ override
                              </button>
                            )}
                          </div>
                          {ACTION_COLUMNS.map(col => {
                            const checked = effective(leaf, col.key, permissions, overrides);
                            return (
                              <div key={col.key} className="flex justify-center">
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(v) => toggleLeaf(leaf, col.key, !!v)}
                                  className={cn(hasOverride && 'data-[state=checked]:bg-primary')}
                                />
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )}

                {isOpen && (
                  <div className="px-2 py-1 border-t border-border/30 bg-muted/10 flex items-center justify-end gap-2">
                    <Button
                      type="button" variant="ghost" size="sm"
                      className="h-6 text-[10px]"
                      onClick={() => cascadeRootAll(root, true)}
                    >
                      Marcar tudo
                    </Button>
                    <Button
                      type="button" variant="ghost" size="sm"
                      className="h-6 text-[10px]"
                      onClick={() => cascadeRootAll(root, false)}
                    >
                      Desmarcar tudo
                    </Button>
                  </div>
                )}
              </div>
            );
          })}

          {visibleRoots.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-8">
              Nenhum item encontrado para "{query}".
            </div>
          )}
        </div>
      </div>

      <p className={cn(
        'text-[11px] text-muted-foreground/80 leading-relaxed',
        'border-l-2 border-primary/40 pl-2'
      )}>
        Cada folha é uma rota/aba específica. Override explícito (marcado ou
        desmarcado) sobrepõe o módulo. Sem override, a folha herda do módulo.
        Clique <code>✕ override</code> para voltar a herdar.
      </p>
    </div>
  );
}
