/**
 * PermissionTree — UI em árvore espelhada do menu do sistema.
 *
 * - Cada raiz expande para as folhas (itens/abas) que aparecem no menu.
 * - Cada folha exibe checkboxes Ver / Criar / Editar / Excluir, mapeando
 *   para os 8 flags reais (mesma lógica do dialog de Módulos).
 * - Raiz tem tri-state (all / partial / none) com cascata para todos os
 *   módulos das folhas filhas.
 * - Busca rápida filtra a árvore mantendo a hierarquia.
 * - Quando 2+ folhas mapeiam ao mesmo módulo, ligar uma reflete em todas
 *   (badge "compartilhado") — comportamento esperado, pois o enforcement
 *   é por módulo agregado.
 */

import { useMemo, useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Search, Share2 } from 'lucide-react';
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

interface PermissionTreeProps {
  permissions: Record<string, ModulePermissionRecord>;
  onChange: (next: Record<string, ModulePermissionRecord>) => void;
  /** Owner vê seções `ownerOnly`. Admin de tenant, não. */
  showOwnerSections?: boolean;
}

type TriState = 'all' | 'partial' | 'none';

function moduleHasAction(perm: ModulePermissionRecord | undefined, action: TreeAction): boolean {
  if (!perm) return false;
  const cols = ACTION_COLUMNS.find(c => c.key === action)!;
  return cols.flags.every(f => !!perm[f as keyof ModulePermissionRecord]);
}

function applyActionToModule(
  perm: ModulePermissionRecord | undefined,
  action: TreeAction,
  value: boolean,
): ModulePermissionRecord {
  const cols = ACTION_COLUMNS.find(c => c.key === action)!;
  const next: ModulePermissionRecord = {
    can_view: !!perm?.can_view, can_create: !!perm?.can_create,
    can_edit: !!perm?.can_edit, can_delete: !!perm?.can_delete,
    can_approve: !!perm?.can_approve, can_conciliate: !!perm?.can_conciliate,
    can_export: !!perm?.can_export, can_admin: !!perm?.can_admin,
  };
  cols.flags.forEach(f => { next[f as keyof ModulePermissionRecord] = value; });
  return next;
}

function rootTriState(root: MenuRoot, perms: Record<string, ModulePermissionRecord>): TriState {
  let onCount = 0, offCount = 0;
  root.leaves.forEach(leaf => {
    ACTION_COLUMNS.forEach(col => {
      if (moduleHasAction(perms[leaf.module], col.key)) onCount++; else offCount++;
    });
  });
  if (onCount === 0) return 'none';
  if (offCount === 0) return 'all';
  return 'partial';
}

export function PermissionTree({
  permissions,
  onChange,
  showOwnerSections = false,
}: PermissionTreeProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    MENU_PERMISSION_MAP.forEach(r => { init[r.key] = true; });
    return init;
  });
  const [query, setQuery] = useState('');

  const moduleLeaves = useMemo(() => leavesByModule(), []);

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

  const setLeafAction = (leaf: MenuLeaf, action: TreeAction, value: boolean) => {
    const updated = applyActionToModule(permissions[leaf.module], action, value);
    onChange({ ...permissions, [leaf.module]: updated });
  };

  const setRootAll = (root: MenuRoot, value: boolean) => {
    const next = { ...permissions };
    // dedupe módulos para não aplicar 2x
    const mods = Array.from(new Set(root.leaves.map(l => l.module)));
    mods.forEach(mod => {
      let perm = next[mod];
      ACTION_COLUMNS.forEach(col => {
        perm = applyActionToModule(perm, col.key, value);
      });
      next[mod] = perm;
    });
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {/* Busca + cabeçalho */}
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
        <Badge variant="outline" className="text-[10px] gap-1">
          <Share2 className="h-3 w-3" /> Persistência por módulo
        </Badge>
      </div>

      {/* Cabeçalho de colunas */}
      <div
        className="grid gap-2 pb-1.5 border-b text-[10px] font-semibold text-muted-foreground uppercase tracking-wide"
        style={{ gridTemplateColumns: '1fr repeat(4, 70px)' }}
      >
        <div>Item</div>
        {ACTION_COLUMNS.map(c => (
          <div key={c.key} className="text-center">{c.label}</div>
        ))}
      </div>

      <ScrollArea className="max-h-[55vh] pr-3">
        <div className="space-y-1">
          {visibleRoots.map(root => {
            const tri = rootTriState(root, permissions);
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
                    {tri === 'partial' && (
                      <Badge variant="secondary" className="text-[9px] h-4 ml-1">parcial</Badge>
                    )}
                  </div>
                  {ACTION_COLUMNS.map(col => {
                    // raiz: marcado se TODAS as folhas têm essa ação ligada
                    const allOn = root.leaves.every(l => moduleHasAction(permissions[l.module], col.key));
                    const someOn = root.leaves.some(l => moduleHasAction(permissions[l.module], col.key));
                    return (
                      <div key={col.key} className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={allOn ? true : (someOn ? 'indeterminate' : false)}
                          onCheckedChange={(v) => {
                            const next = { ...permissions };
                            const mods = Array.from(new Set(root.leaves.map(l => l.module)));
                            mods.forEach(mod => {
                              next[mod] = applyActionToModule(next[mod], col.key, !!v);
                            });
                            onChange(next);
                          }}
                        />
                      </div>
                    );
                  })}
                </div>

                {isOpen && (
                  <div className="divide-y divide-border/30">
                    {root.leaves.map(leaf => {
                      const shared = (moduleLeaves[leaf.module] || []).filter(l => l.key !== leaf.key);
                      return (
                        <div
                          key={leaf.key}
                          className="grid gap-2 items-center px-2 py-1.5 hover:bg-muted/20"
                          style={{ gridTemplateColumns: '1fr repeat(4, 70px)' }}
                        >
                          <div className="pl-5 text-sm flex items-center gap-1.5 min-w-0">
                            <span className="truncate">{leaf.label}</span>
                            <code className="text-[9px] text-muted-foreground/60 truncate">{leaf.key}</code>
                            {shared.length > 0 && (
                              <Badge
                                variant="outline"
                                className="text-[9px] h-4 shrink-0 gap-0.5"
                                title={`Compartilha módulo "${leaf.module}" com: ${shared.map(s => s.label).join(', ')}`}
                              >
                                <Share2 className="h-2.5 w-2.5" />
                                {shared.length}
                              </Badge>
                            )}
                          </div>
                          {ACTION_COLUMNS.map(col => {
                            const checked = moduleHasAction(permissions[leaf.module], col.key);
                            return (
                              <div key={col.key} className="flex justify-center">
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(v) => setLeafAction(leaf, col.key, !!v)}
                                />
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Atalhos do header */}
                {isOpen && (
                  <div className="px-2 py-1 border-t border-border/30 bg-muted/10 flex items-center justify-end gap-2">
                    <Button
                      type="button" variant="ghost" size="sm"
                      className="h-6 text-[10px]"
                      onClick={() => setRootAll(root, true)}
                    >
                      Marcar tudo
                    </Button>
                    <Button
                      type="button" variant="ghost" size="sm"
                      className="h-6 text-[10px]"
                      onClick={() => setRootAll(root, false)}
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
      </ScrollArea>

      <p className={cn(
        'text-[11px] text-muted-foreground/80 leading-relaxed',
        'border-l-2 border-primary/40 pl-2'
      )}>
        A árvore reflete o menu do sistema. Como o enforcement é por módulo,
        folhas que compartilham módulo (marcadas com <Share2 className="inline h-2.5 w-2.5" />)
        são ligadas/desligadas em conjunto. Para granularidade fina por folha,
        use a tabela de overrides na próxima versão da configuração.
      </p>
    </div>
  );
}
