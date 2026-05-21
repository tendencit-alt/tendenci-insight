import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, FileSpreadsheet, Loader2, Trash2, X, ChevronRight, ChevronDown, ChevronsUpDown, GripVertical, RefreshCw, ShieldCheck, Wand2 } from "lucide-react";
import { ChartAccountsOnboardingWizard, shouldAutoOpenOnboarding } from "./ChartAccountsOnboardingWizard";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";

type BulkEditField = "nature" | "in_dre" | "in_cashflow" | "active" | null;

const CALCULATED_CHART_LINES = [
  {
    id: "__calc__receita-liquida",
    code: "=RL",
    name: "Receita Líquida",
    nature: "RESULTADO",
    afterCode: "2",
    in_dre: true,
    in_cashflow: false,
  },
  {
    id: "__calc__margem-contribuicao",
    code: "=MC",
    name: "Margem de Contribuição",
    nature: "RESULTADO",
    afterCode: "3",
    in_dre: true,
    in_cashflow: false,
  },
  {
    id: "__calc__ebitda",
    code: "=EBITDA",
    name: "Resultado Operacional (EBITDA)",
    nature: "RESULTADO",
    afterCode: "4",
    in_dre: true,
    in_cashflow: false,
  },
  {
    id: "__calc__ebit",
    code: "=EBIT",
    name: "Resultado Econômico (EBIT)",
    nature: "RESULTADO",
    afterCode: "5",
    in_dre: true,
    in_cashflow: false,
  },
  {
    id: "__calc__resultado-antes-capital",
    code: "=RAC",
    name: "Resultado Antes do Capital",
    nature: "RESULTADO",
    afterCode: "6",
    in_dre: true,
    in_cashflow: false,
  },
  {
    id: "__calc__entradas-totais",
    code: "=ENT",
    name: "Entradas Totais",
    nature: "RESULTADO",
    afterCode: "7",
    in_dre: false,
    in_cashflow: true,
  },
  {
    id: "__calc__saidas-totais",
    code: "=SAI",
    name: "Saídas Totais",
    nature: "RESULTADO",
    afterCode: "7",
    in_dre: false,
    in_cashflow: true,
  },
  {
    id: "__calc__variacao-liquida-caixa",
    code: "=VLC",
    name: "Variação Líquida de Caixa",
    nature: "RESULTADO",
    afterCode: "7",
    in_dre: false,
    in_cashflow: true,
  },
] as const;

// Draggable Row Component
function DraggableAccountRow({
  account,
  isSelected,
  isExpanded,
  hasChildren,
  onSelect,
  onToggleExpand,
  onEdit,
  onDelete,
  getLevelBadge,
  getNatureBadge,
}: {
  account: any;
  isSelected: boolean;
  isExpanded: boolean;
  hasChildren: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onToggleExpand: (id: string) => void;
  onEdit: (account: any) => void;
  onDelete: (account: any) => void;
  getLevelBadge: (depth: number) => React.ReactNode;
  getNatureBadge: (nature: string) => React.ReactNode;
}) {
  const isCalculated = Boolean(account.isCalculated);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: account.id, disabled: isCalculated });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const paddingLeft = account.depth * 24;

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={cn(
        isSelected && "bg-muted/50",
        hasChildren && "bg-muted/30",
        isDragging && "opacity-50 bg-muted",
        isCalculated && "bg-accent/20"
      )}
    >
      <TableCell className="w-8 p-0">
        <div
          {...attributes}
          {...listeners}
          className={cn(
            "flex items-center justify-center h-full w-8 transition-colors",
            isCalculated
              ? "cursor-not-allowed text-muted-foreground/40"
              : "cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          )}
        >
          <GripVertical className="h-4 w-4" />
        </div>
      </TableCell>
      <TableCell>
        <Checkbox
          checked={isSelected}
          disabled={isCalculated}
          onCheckedChange={(checked) => onSelect(account.id, !!checked)}
          aria-label={`Selecionar ${account.name}`}
        />
      </TableCell>
      <TableCell
        className="font-medium"
        style={{ paddingLeft: `${paddingLeft + 16}px` }}
      >
        <div className="flex items-center gap-1">
          {hasChildren ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-muted"
              onClick={() => onToggleExpand(account.id)}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          ) : (
            <span className="w-6" />
          )}
          <span
            className={cn(
              account.depth === 0 && "text-foreground font-bold",
              account.depth === 1 && "text-foreground/90 font-semibold",
              account.depth >= 2 && "text-muted-foreground",
              isCalculated && "text-primary"
            )}
          >
            {account.code}
          </span>
        </div>
      </TableCell>
      <TableCell>
        {isCalculated ? (
          <Badge variant="secondary" className="text-xs">Automática</Badge>
        ) : (
          getLevelBadge(account.depth)
        )}
      </TableCell>
      <TableCell>
        <span
          className={cn(
            "inline-flex items-center gap-1.5",
            account.depth === 0 && "font-bold",
            account.depth === 1 && "font-semibold",
            account.depth >= 2 && "text-muted-foreground",
            isCalculated && "text-primary"
          )}
        >
          {account.name}
          {account.is_core && (
            <Tooltip>
              <TooltipTrigger>
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              </TooltipTrigger>
              <TooltipContent>Estrutura core do sistema — protegida</TooltipContent>
            </Tooltip>
          )}
        </span>
      </TableCell>
      <TableCell>{getNatureBadge(account.nature)}</TableCell>
      <TableCell>
        {account.in_dre ? (
          <Badge variant="outline" className="text-green-600 border-green-600">
            Sim
          </Badge>
        ) : (
          <Badge variant="outline">Não</Badge>
        )}
      </TableCell>
      <TableCell>
        {account.in_cashflow ? (
          <Badge variant="outline" className="text-green-600 border-green-600">
            Sim
          </Badge>
        ) : (
          <Badge variant="outline">Não</Badge>
        )}
      </TableCell>
      <TableCell>
        {isCalculated ? (
          <Badge variant="secondary">Automática</Badge>
        ) : account.active ? (
          <Badge className="bg-green-600">Ativa</Badge>
        ) : (
          <Badge variant="secondary">Inativa</Badge>
        )}
      </TableCell>
      <TableCell>
        {isCalculated ? (
          <span className="text-xs text-muted-foreground">Não editável</span>
        ) : (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => onEdit(account)}>
              <Pencil className="h-4 w-4" />
            </Button>
            {!account.is_core && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(account)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}

export function ChartAccountsManager() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    code: "",
    name: "",
    nature: "DESPESA",
    parent_id: "",
    in_dre: true,
    in_cashflow: true,
    active: true,
  });

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkEditDialogOpen, setBulkEditDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkEditField, setBulkEditField] = useState<BulkEditField>(null);
  const [bulkEditValue, setBulkEditValue] = useState<string | boolean>("");
  const [bulkLoading, setBulkLoading] = useState(false);

  // Single delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<any>(null);

  // Tree expansion state
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Origin filter: all | core | custom
  const [originFilter, setOriginFilter] = useState<"all" | "core" | "custom">("all");

  // Onboarding wizard
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  // Drag state
  const [activeId, setActiveId] = useState<string | null>(null);
  
  // Move confirmation dialog state
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [pendingMove, setPendingMove] = useState<{
    draggedAccount: any;
    targetAccount: any;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: accounts, isLoading, refetch } = useQuery({
    queryKey: ["fin-chart-accounts-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_chart_accounts")
        .select("*")
        .not("tenant_id", "is", null)
        .order("code");

      const visibleAccounts = data || [];
      const accountsById = new Map(visibleAccounts.map((account) => [account.id, account]));
      const preferredByCode = new Map<string, any>();

      visibleAccounts.forEach((account) => {
        const current = preferredByCode.get(account.code);
        if (!current) {
          preferredByCode.set(account.code, account);
          return;
        }

        const currentScore = current.tenant_id ? 1 : 0;
        const nextScore = account.tenant_id ? 1 : 0;

        if (nextScore > currentScore) {
          preferredByCode.set(account.code, account);
        }
      });

      return Array.from(preferredByCode.values()).map((account) => {
        const explicitParent = account.parent_id ? accountsById.get(account.parent_id) : null;
        const parentCode = explicitParent?.code || (account.code.includes(".")
          ? account.code.replace(/\.[^.]+$/, "")
          : null);
        const resolvedParent = parentCode ? preferredByCode.get(parentCode) : null;

        return {
          ...account,
          parent_id: resolvedParent?.id ?? null,
        };
      });
    },
    refetchOnWindowFocus: true,
    staleTime: 0, // Always refetch when component mounts
  });

  // Initialize expanded state with root accounts when data loads
  useEffect(() => {
    if (accounts && accounts.length > 0 && expandedIds.size === 0) {
      const rootIds = accounts.filter(a => !a.parent_id).map(a => a.id);
      setExpandedIds(new Set(rootIds));
    }
  }, [accounts]);

  // Auto-open onboarding on first visit when no custom accounts exist
  useEffect(() => {
    if (!accounts) return;
    const customCount = accounts.filter((a) => !a.is_core).length;
    if (shouldAutoOpenOnboarding(customCount)) {
      setOnboardingOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts?.length]);

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    if (accounts) {
      const allIds = accounts.map(a => a.id);
      setExpandedIds(new Set(allIds));
    }
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  // Optimistic update helper
  const optimisticUpdate = (updater: (prev: any[]) => any[]) => {
    queryClient.setQueryData(["fin-chart-accounts-all"], (old: any[] | undefined) => {
      if (!old) return old;
      return updater(old);
    });
  };

  // Helper function to get level name
  const getLevelName = (depth: number): string => {
    switch (depth) {
      case 0: return "Raiz";
      case 1: return "Grupo";
      case 2: return "Subgrupo";
      default: return "Subgrupo";
    }
  };

  // Helper function to get level badge
  const getLevelBadge = useCallback((depth: number) => {
    switch (depth) {
      case 0:
        return <Badge className="bg-primary text-primary-foreground text-xs">Raiz</Badge>;
      case 1:
        return <Badge className="bg-secondary text-secondary-foreground text-xs">Grupo</Badge>;
      case 2:
      default:
        return <Badge variant="outline" className="text-muted-foreground text-xs">Subgrupo</Badge>;
    }
  }, []);

  // Calculate depth based on code pattern (count dots)
  const getDepthFromCode = (code: string): number => {
    return (code.match(/\./g) || []).length;
  };

  // Allow Raiz (depth 0) and Grupo (depth 1) as parent accounts - max 3 levels
  const parentAccounts = accounts?.filter((a) => {
    const depth = getDepthFromCode(a.code);
    return depth < 2;
  }) || [];

  // Build hierarchical tree structure
  const buildTree = (items: any[]): any[] => {
    const map = new Map<string, any>();
    const roots: any[] = [];

    items.forEach((item) => {
      map.set(item.id, { ...item, children: [] });
    });

    items.forEach((item) => {
      const node = map.get(item.id);
      if (item.parent_id && map.has(item.parent_id)) {
        map.get(item.parent_id).children.push(node);
      } else {
        roots.push(node);
      }
    });

    const sortChildren = (nodes: any[]) => {
      nodes.sort((a, b) => {
        const aParts = a.code.split('.').map((p: string) => parseFloat(p) || 0);
        const bParts = b.code.split('.').map((p: string) => parseFloat(p) || 0);
        for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
          const aVal = aParts[i] || 0;
          const bVal = bParts[i] || 0;
          if (aVal !== bVal) return aVal - bVal;
        }
        return 0;
      });
      nodes.forEach(node => {
        if (node.children && node.children.length > 0) {
          sortChildren(node.children);
        }
      });
    };
    sortChildren(roots);

    return roots;
  };

  // Flatten tree for table display with depth info, respecting expansion state
  const flattenTree = (nodes: any[], depth: number = 0, parentExpanded: boolean = true): any[] => {
    const result: any[] = [];
    nodes.forEach((node) => {
      if (parentExpanded) {
        result.push({ ...node, depth });
        if (node.children && node.children.length > 0) {
          const isExpanded = expandedIds.has(node.id);
          result.push(...flattenTree(node.children, depth + 1, isExpanded));
        }
      }
    });
    return result;
  };

  const injectCalculatedRows = useCallback((items: any[]) => {
    const result = [...items];

    const insertAfterCode = (afterCode: string, account: any) => {
      let idx = -1;
      for (let i = result.length - 1; i >= 0; i--) {
        if (result[i].code === afterCode || result[i].code.startsWith(`${afterCode}.`)) {
          idx = i;
          break;
        }
      }

      if (idx >= 0) {
        result.splice(idx + 1, 0, account);
      } else {
        result.push(account);
      }
    };

    CALCULATED_CHART_LINES.forEach((line) => {
      insertAfterCode(line.afterCode, {
        id: line.id,
        code: line.code,
        name: line.name,
        nature: line.nature,
        parent_id: null,
        active: true,
        in_dre: line.in_dre,
        in_cashflow: line.in_cashflow,
        depth: 0,
        children: [],
        isCalculated: true,
      });
    });

    return result;
  }, []);

  const dedupeDisplayAccounts = useCallback((items: any[]) => {
    const seen = new Set<string>();
    return items.filter((item) => {
      const key = item.code;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, []);

  const treeData = useMemo(() => accounts ? buildTree(accounts) : [], [accounts]);
  const hierarchicalAccounts = useMemo(() => {
    const flattenedAccounts = flattenTree(treeData);
    const filtered = originFilter === "all"
      ? flattenedAccounts
      : flattenedAccounts.filter((a) => {
          if (a.isCalculated) return true;
          return originFilter === "core" ? !!a.is_core : !a.is_core;
        });
    return dedupeDisplayAccounts(injectCalculatedRows(filtered));
  }, [treeData, expandedIds, injectCalculatedRows, originFilter, dedupeDisplayAccounts]);

  // Get all descendants of an account (for preventing invalid drops)
  const getDescendantIds = useCallback((accountId: string, accountsList: any[]): Set<string> => {
    const descendants = new Set<string>();
    const findDescendants = (parentId: string) => {
      accountsList.forEach(acc => {
        if (acc.parent_id === parentId) {
          descendants.add(acc.id);
          findDescendants(acc.id);
        }
      });
    };
    findDescendants(accountId);
    return descendants;
  }, []);

  // Renumber all siblings under a parent sequentially (1, 2, 3... or 1.1, 1.2, 1.3...)
  const renumberSiblings = useCallback((
    parentId: string | null,
    allAccounts: any[],
    excludeIds: string[] = []
  ): { id: string; oldCode: string; newCode: string }[] => {
    const updates: { id: string; oldCode: string; newCode: string }[] = [];
    
    // Get parent code prefix
    const parentAccount = parentId ? allAccounts.find(a => a.id === parentId) : null;
    const parentCode = parentAccount?.code || "";
    
    // Get all direct children of this parent, sorted by current code
    const siblings = allAccounts
      .filter(a => a.parent_id === parentId && !excludeIds.includes(a.id))
      .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
    
    // Renumber sequentially
    siblings.forEach((sibling, index) => {
      const newNumber = index + 1;
      const newCode = parentCode ? `${parentCode}.${newNumber}` : String(newNumber);
      
      if (sibling.code !== newCode) {
        updates.push({ id: sibling.id, oldCode: sibling.code, newCode });
      }
    });
    
    return updates;
  }, []);

  // Recursively update all descendant codes when a parent code changes
  const getDescendantCodeUpdates = useCallback((
    accountId: string,
    oldCode: string,
    newCode: string,
    allAccounts: any[]
  ): { id: string; oldCode: string; newCode: string }[] => {
    const updates: { id: string; oldCode: string; newCode: string }[] = [];
    
    const children = allAccounts.filter(a => a.parent_id === accountId);
    for (const child of children) {
      const childNewCode = newCode + child.code.substring(oldCode.length);
      updates.push({ id: child.id, oldCode: child.code, newCode: childNewCode });
      
      // Recursively get grandchildren updates
      const grandchildUpdates = getDescendantCodeUpdates(
        child.id,
        child.code,
        childNewCode,
        allAccounts
      );
      updates.push(...grandchildUpdates);
    }
    
    return updates;
  }, []);

  // Apply all code updates to database
  const applyCodeUpdates = useCallback(async (
    updates: { id: string; oldCode: string; newCode: string }[]
  ): Promise<boolean> => {
    for (const update of updates) {
      const { error } = await supabase
        .from("fin_chart_accounts")
        .update({ code: update.newCode })
        .eq("id", update.id)
        .not("tenant_id", "is", null);
      
      if (error) {
        console.error("Error updating code:", error);
        return false;
      }
    }
    return true;
  }, []);

  // Full renumber: renumber siblings and all their descendants
  const fullRenumberSiblings = useCallback((
    parentId: string | null,
    allAccounts: any[],
    excludeIds: string[] = []
  ): { id: string; oldCode: string; newCode: string }[] => {
    const allUpdates: { id: string; oldCode: string; newCode: string }[] = [];
    
    // First get sibling updates
    const siblingUpdates = renumberSiblings(parentId, allAccounts, excludeIds);
    
    // For each sibling that changes, also update all its descendants
    for (const siblingUpdate of siblingUpdates) {
      allUpdates.push(siblingUpdate);
      
      // Get descendant updates for this sibling
      const descendantUpdates = getDescendantCodeUpdates(
        siblingUpdate.id,
        siblingUpdate.oldCode,
        siblingUpdate.newCode,
        allAccounts
      );
      allUpdates.push(...descendantUpdates);
    }
    
    return allUpdates;
  }, [renumberSiblings, getDescendantCodeUpdates]);

  // Calculate the next available code for a new account under a parent
  const getNextCode = useCallback((
    parentId: string | null,
    allAccounts: any[]
  ): string => {
    const parentAccount = parentId ? allAccounts.find(a => a.id === parentId) : null;
    const parentCode = parentAccount?.code || "";
    
    // Count existing siblings
    const siblingCount = allAccounts.filter(a => a.parent_id === parentId).length;
    const newNumber = siblingCount + 1;
    
    return parentCode ? `${parentCode}.${newNumber}` : String(newNumber);
  }, []);

  // Renumber entire chart of accounts to ensure sequential codes
  const renumberAllAccounts = useCallback(async () => {
    if (!accounts || accounts.length === 0) return;

    setBulkLoading(true);
    
    try {
      // Get fresh data
      const { data: freshAccounts } = await supabase
        .from("fin_chart_accounts")
        .select("*")
        .not("tenant_id", "is", null)
        .order("code");

      if (!freshAccounts) throw new Error("Erro ao buscar dados");

      // Build tree to process in order
      const buildOrderedTree = (items: any[], parentId: string | null = null): any[] => {
        const children = items
          .filter(a => a.parent_id === parentId)
          .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
        
        const result: any[] = [];
        children.forEach((child, index) => {
          result.push({ ...child, newIndex: index + 1 });
          result.push(...buildOrderedTree(items, child.id));
        });
        return result;
      };

      const orderedAccounts = buildOrderedTree(freshAccounts);
      const updates: { id: string; newCode: string }[] = [];

      // Calculate new codes for each account
      const getNewCode = (account: any, allAccounts: any[]): string => {
        if (!account.parent_id) {
          // Root account
          const rootSiblings = allAccounts
            .filter(a => a.parent_id === null)
            .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
          const index = rootSiblings.findIndex(a => a.id === account.id);
          return String(index + 1);
        }
        
        // Child account - find parent's new code first
        const parent = allAccounts.find(a => a.id === account.parent_id);
        if (!parent) return account.code;
        
        const parentNewCode = updates.find(u => u.id === parent.id)?.newCode || parent.code;
        const siblings = allAccounts
          .filter(a => a.parent_id === account.parent_id)
          .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
        const index = siblings.findIndex(a => a.id === account.id);
        
        return `${parentNewCode}.${index + 1}`;
      };

      // Process accounts level by level (roots first, then children)
      const processLevel = (items: any[], parentId: string | null = null) => {
        const levelItems = items
          .filter(a => a.parent_id === parentId)
          .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
        
        levelItems.forEach((item, index) => {
          const parentUpdate = parentId ? updates.find(u => u.id === parentId) : null;
          const parentCode = parentUpdate?.newCode || (parentId ? freshAccounts.find(a => a.id === parentId)?.code : "");
          const newCode = parentCode ? `${parentCode}.${index + 1}` : String(index + 1);
          
          if (item.code !== newCode) {
            updates.push({ id: item.id, newCode });
          }
          
          // Process children of this item
          processLevel(items, item.id);
        });
      };

      processLevel(freshAccounts);

      if (updates.length === 0) {
        toast.info("Todos os códigos já estão em ordem sequencial!");
        setBulkLoading(false);
        return;
      }

      // Apply updates to database
      for (const update of updates) {
        const { error } = await supabase
          .from("fin_chart_accounts")
          .update({ code: update.newCode })
          .eq("id", update.id);
        
        if (error) throw error;
      }

      toast.success(`${updates.length} código(s) renumerado(s) com sucesso!`);
      await refetch();
    } catch (error: any) {
      toast.error("Erro ao renumerar: " + error.message);
      await refetch();
    } finally {
      setBulkLoading(false);
    }
  }, [accounts, refetch]);

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  // Handle drag end - opens confirmation dialog
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || !accounts || active.id === over.id) return;

    const draggedAccount = accounts.find(a => a.id === active.id);
    const targetAccount = accounts.find(a => a.id === over.id);

    if (!draggedAccount || !targetAccount) return;

    // Check if trying to drop into a descendant (invalid)
    const descendants = getDescendantIds(draggedAccount.id, accounts);
    if (descendants.has(targetAccount.id)) {
      toast.error("Não é possível mover uma conta para dentro de seus próprios filhos");
      return;
    }

    // Store pending move and open dialog
    setPendingMove({ draggedAccount, targetAccount });
    setMoveDialogOpen(true);
  }, [accounts, getDescendantIds]);

  // Execute move after user confirmation
  const executeMove = useCallback(async (moveType: 'sibling' | 'child') => {
    if (!pendingMove || !accounts) return;

    const { draggedAccount, targetAccount } = pendingMove;
    const targetDepth = getDepthFromCode(targetAccount.code);
    
    let newParentId: string | null;
    let targetPosition: number | null = null; // Position to insert at (for siblings)
    
    if (moveType === 'child') {
      // Become child of target
      if (targetDepth >= 2) {
        toast.error("Não é possível adicionar filho: limite de 3 níveis");
        setMoveDialogOpen(false);
        setPendingMove(null);
        return;
      }
      newParentId = targetAccount.id;
    } else {
      // Become sibling of target (same parent) - INSERT AT TARGET'S POSITION
      newParentId = targetAccount.parent_id;
      
      // Get target's position among its siblings
      const targetSiblings = accounts
        .filter(a => a.parent_id === newParentId && a.id !== draggedAccount.id)
        .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
      
      const targetIndex = targetSiblings.findIndex(a => a.id === targetAccount.id);
      targetPosition = targetIndex >= 0 ? targetIndex : targetSiblings.length;
    }

    // Check if this would exceed max depth
    const descendants = getDescendantIds(draggedAccount.id, accounts);
    const draggedDepth = getDepthFromCode(draggedAccount.code);
    const draggedMaxChildDepth = Math.max(
      draggedDepth,
      ...Array.from(descendants).map(id => {
        const acc = accounts.find(a => a.id === id);
        return acc ? getDepthFromCode(acc.code) : 0;
      })
    );
    const draggedTreeHeight = draggedMaxChildDepth - draggedDepth;
    
    const newDepth = newParentId 
      ? getDepthFromCode(accounts.find(a => a.id === newParentId)?.code || "") + 1
      : 0;
    
    if (newDepth + draggedTreeHeight > 2) {
      toast.error("Movimento inválido: excederia o limite de 3 níveis de hierarquia");
      setMoveDialogOpen(false);
      setPendingMove(null);
      return;
    }

    const oldCode = draggedAccount.code;
    const oldParentId = draggedAccount.parent_id;

    // Close dialog first to prevent DOM conflicts
    setMoveDialogOpen(false);
    setPendingMove(null);
    
    // Clear drag state to prevent DnD DOM errors
    setActiveId(null);

    // Use setTimeout to allow React to finish DOM updates before optimistic update
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      // Step 1: Move the account to new parent with a placeholder code
      const tempCode = `__TEMP__${Date.now()}`;
      const { error: moveError } = await supabase
        .from("fin_chart_accounts")
        .update({ code: tempCode, parent_id: newParentId })
        .eq("id", draggedAccount.id);

      if (moveError) throw moveError;

      // Step 2: Get fresh data 
      const { data: freshAccounts } = await supabase
        .from("fin_chart_accounts")
        .select("*")
        .not("tenant_id", "is", null)
        .order("code");

      if (!freshAccounts) throw new Error("Erro ao buscar dados atualizados");

      // Step 3: Calculate the new code based on position
      const parentAccount = newParentId ? freshAccounts.find(a => a.id === newParentId) : null;
      const parentCode = parentAccount?.code || "";
      
      let newCode: string;
      
      if (moveType === 'sibling' && targetPosition !== null) {
        // For sibling: insert at target's position
        // Get siblings (excluding the dragged account with temp code)
        const siblings = freshAccounts
          .filter(a => a.parent_id === newParentId && !a.code.startsWith("__TEMP__"))
          .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
        
        // Insert at target position - will push others down
        const newNumber = targetPosition + 1;
        newCode = parentCode ? `${parentCode}.${newNumber}` : String(newNumber);
        
        // Update siblings that need to shift (those at or after the target position)
        for (let i = siblings.length - 1; i >= targetPosition; i--) {
          const sibling = siblings[i];
          const shiftedNumber = i + 2; // +2 because we're inserting before
          const shiftedCode = parentCode ? `${parentCode}.${shiftedNumber}` : String(shiftedNumber);
          
          if (sibling.code !== shiftedCode) {
            // First update descendants with the new parent code
            const siblingDescendants = getDescendantCodeUpdates(
              sibling.id,
              sibling.code,
              shiftedCode,
              freshAccounts
            );
            await applyCodeUpdates(siblingDescendants);
            
            // Then update the sibling itself
            await supabase
              .from("fin_chart_accounts")
              .update({ code: shiftedCode })
              .eq("id", sibling.id);
          }
        }
      } else {
        // For child: add at the end
        const siblingCount = freshAccounts.filter(a => a.parent_id === newParentId && !a.code.startsWith("__TEMP__")).length;
        newCode = parentCode ? `${parentCode}.${siblingCount + 1}` : String(siblingCount + 1);
      }
      
      // Step 4: Update the dragged account with final code
      const { error: updateError } = await supabase
        .from("fin_chart_accounts")
        .update({ code: newCode })
        .eq("id", draggedAccount.id);

      if (updateError) throw updateError;

      // Step 5: Update all descendants of the dragged account
      const descendantUpdates = getDescendantCodeUpdates(
        draggedAccount.id,
        oldCode,
        newCode,
        accounts
      );
      await applyCodeUpdates(descendantUpdates);

      // Step 6: Renumber old parent's siblings if parent changed
      if (oldParentId !== newParentId) {
        const { data: postMoveAccounts } = await supabase
          .from("fin_chart_accounts")
          .select("*")
          .order("code");

        if (postMoveAccounts) {
          const oldParentUpdates = fullRenumberSiblings(oldParentId, postMoveAccounts);
          await applyCodeUpdates(oldParentUpdates);
        }
      }

      toast.success(`Conta movida: ${oldCode} → ${newCode}`);
      // Force refetch to ensure data consistency
      await refetch();
    } catch (error: any) {
      console.error("Erro ao mover conta:", error);
      toast.error("Erro ao mover conta: " + error.message);
      await refetch();
    }
  }, [accounts, pendingMove, getDescendantIds, fullRenumberSiblings, getDescendantCodeUpdates, applyCodeUpdates, refetch]);

  // Helper to get the new type preview
  const getMoveTypePreview = useCallback((moveType: 'sibling' | 'child'): { depth: number; name: string } => {
    if (!pendingMove || !accounts) return { depth: 0, name: 'Raiz' };
    
    const { targetAccount } = pendingMove;
    const targetDepth = getDepthFromCode(targetAccount.code);
    
    if (moveType === 'child') {
      const newDepth = targetDepth + 1;
      return { depth: newDepth, name: getLevelName(newDepth) };
    } else {
      // Sibling - same level as target
      return { depth: targetDepth, name: getLevelName(targetDepth) };
    }
  }, [pendingMove, accounts, getLevelName]);

  const handleEdit = (account: any) => {
    setEditing(account);
    setForm({
      code: account.code || "",
      name: account.name || "",
      nature: account.nature || "DESPESA",
      parent_id: account.parent_id || "",
      in_dre: account.in_dre ?? true,
      in_cashflow: account.in_cashflow ?? true,
      active: account.active ?? true,
    });
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditing(null);
    setForm({
      code: "",
      name: "",
      nature: "DESPESA",
      parent_id: "",
      in_dre: true,
      in_cashflow: true,
      active: true,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    // Validações com mensagens claras
    if (!form.name) {
      toast.error("Campo obrigatório: Nome da conta não informado");
      return;
    }
    if (!form.nature) {
      toast.error("Campo obrigatório: Natureza da conta não informada");
      return;
    }

    setLoading(true);
    setDialogOpen(false);

    try {
      const parentId = form.parent_id || null;

      if (editing) {
        // Update existing account
        const data = {
          name: form.name,
          nature: form.nature,
          parent_id: parentId,
          in_dre: form.in_dre,
          in_cashflow: form.in_cashflow,
          active: form.active,
        };

        // If parent changed, we need to recalculate code
        if (editing.parent_id !== parentId) {
          const oldParentId = editing.parent_id;
          const oldCode = editing.code;

          // Get fresh accounts
          const { data: freshAccounts } = await supabase
            .from("fin_chart_accounts")
            .select("*")
            .not("tenant_id", "is", null)
            .order("code");

          if (!freshAccounts) throw new Error("Erro ao buscar dados");

          // Calculate new code for the new parent
          const newCode = getNextCode(parentId, freshAccounts.filter(a => a.id !== editing.id));

          // Update the account with new parent and code
          const { error } = await supabase
            .from("fin_chart_accounts")
            .update({ ...data, code: newCode })
            .eq("id", editing.id)
            .not("tenant_id", "is", null)
            .select("id")
            .single();
          if (error) throw error;

          // Update descendants
          const descendantUpdates = getDescendantCodeUpdates(editing.id, oldCode, newCode, freshAccounts);
          await applyCodeUpdates(descendantUpdates);

          // Renumber old parent's siblings
          const accountsWithoutEdited = freshAccounts.filter(a => a.id !== editing.id);
          const oldParentRenumber = fullRenumberSiblings(oldParentId, accountsWithoutEdited);
          await applyCodeUpdates(oldParentRenumber);

          // Renumber new parent's siblings
          const { data: finalAccounts } = await supabase
            .from("fin_chart_accounts")
            .select("*")
            .not("tenant_id", "is", null)
            .order("code");
          if (finalAccounts) {
            const newParentRenumber = fullRenumberSiblings(parentId, finalAccounts);
            await applyCodeUpdates(newParentRenumber);
          }
        } else {
          // Just update without code change
          const { error } = await supabase
            .from("fin_chart_accounts")
            .update(data)
            .eq("id", editing.id)
            .not("tenant_id", "is", null)
            .select("id")
            .single();
          if (error) throw error;
        }

        toast.success("Conta atualizada!");
      } else {
        // Create new account - auto-generate code
        const { data: freshAccounts } = await supabase
          .from("fin_chart_accounts")
          .select("*")
          .order("code");

        const accountsForCalc = freshAccounts || [];
        const newCode = getNextCode(parentId, accountsForCalc);

        const data = {
          code: newCode,
          name: form.name,
          nature: form.nature,
          parent_id: parentId,
          in_dre: form.in_dre,
          in_cashflow: form.in_cashflow,
          active: form.active,
        };

        const { error } = await supabase
          .from("fin_chart_accounts")
          .insert(data);
        if (error) throw error;

        toast.success(`Conta criada com código ${newCode}!`);
      }

      await refetch();
    } catch (error: any) {
      toast.error("Erro: " + error.message);
      await refetch();
    } finally {
      setLoading(false);
    }
  };

  // Bulk selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked && accounts) {
      setSelectedIds(new Set(accounts.map((a) => a.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const openBulkEditDialog = (field: BulkEditField) => {
    setBulkEditField(field);
    if (field === "nature") {
      setBulkEditValue("DESPESA");
    } else {
      setBulkEditValue(true);
    }
    setBulkEditDialogOpen(true);
  };

  const handleBulkEdit = async () => {
    if (!bulkEditField || selectedIds.size === 0) return;

    const idsToUpdate = Array.from(selectedIds);
    const updateData: Record<string, any> = {};
    updateData[bulkEditField] = bulkEditValue;

    // Optimistic update - apply immediately
    optimisticUpdate((prev) =>
      prev.map((a) => (idsToUpdate.includes(a.id) ? { ...a, ...updateData } : a))
    );

    setBulkEditDialogOpen(false);
    clearSelection();
    setBulkLoading(true);

    try {
      const { error } = await supabase
        .from("fin_chart_accounts")
        .update(updateData)
        .in("id", idsToUpdate);

      if (error) throw error;

      toast.success(`${idsToUpdate.length} conta(s) atualizada(s)!`);
      // Refetch to ensure consistency
      await refetch();
    } catch (error: any) {
      toast.error("Erro: " + error.message);
      await refetch(); // Rollback on error
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0 || !accounts) {
      toast.error("Nenhuma conta selecionada para exclusão");
      return;
    }

    const idsToDelete = Array.from(selectedIds);
    
    // Verificar se alguma conta tem filhos
    const accountsWithChildren = idsToDelete.filter(id => 
      accounts.some(a => a.parent_id === id)
    );
    
    if (accountsWithChildren.length > 0) {
      const accountNames = accountsWithChildren.map(id => {
        const acc = accounts.find(a => a.id === id);
        return acc ? `${acc.code} - ${acc.name}` : id;
      }).join(', ');
      toast.error(`Não é possível excluir: As seguintes contas possuem subcontas: ${accountNames}. Exclua primeiro as subcontas.`);
      setBulkDeleteDialogOpen(false);
      return;
    }

    // Get all parent IDs of accounts being deleted for later renumbering
    const affectedParentIds = new Set<string | null>();
    idsToDelete.forEach(id => {
      const acc = accounts.find(a => a.id === id);
      if (acc) {
        affectedParentIds.add(acc.parent_id);
      }
    });

    setBulkDeleteDialogOpen(false);
    clearSelection();
    setBulkLoading(true);

    try {
      const { error } = await supabase
        .from("fin_chart_accounts")
        .delete()
        .in("id", idsToDelete);

      if (error) {
        if (error.message.includes('foreign key') || error.message.includes('violates')) {
          throw new Error("Esta conta está vinculada a lançamentos financeiros e não pode ser excluída");
        }
        throw error;
      }

      // Renumber all affected parent groups
      const { data: freshAccounts } = await supabase
        .from("fin_chart_accounts")
        .select("*")
        .order("code");

      if (freshAccounts) {
        for (const parentId of affectedParentIds) {
          const renumberUpdates = fullRenumberSiblings(parentId, freshAccounts);
          await applyCodeUpdates(renumberUpdates);
        }
      }

      toast.success(`${idsToDelete.length} conta(s) excluída(s) com sucesso!`);
      await refetch();
    } catch (error: any) {
      toast.error(`Erro ao excluir: ${error.message}`);
      await refetch();
    } finally {
      setBulkLoading(false);
    }
  };

  // Single delete handler
  const handleDeleteSingle = async () => {
    if (!accountToDelete || !accounts) return;

    const idToDelete = accountToDelete.id;
    const parentIdOfDeleted = accountToDelete.parent_id;
    
    // Check if account has children
    const hasChildren = accounts.some(a => a.parent_id === idToDelete);
    if (hasChildren) {
      toast.error("Não é possível excluir: esta conta possui subcontas. Exclua primeiro as subcontas.");
      setDeleteDialogOpen(false);
      setAccountToDelete(null);
      return;
    }

    setDeleteDialogOpen(false);
    setAccountToDelete(null);

    try {
      const { error } = await supabase
        .from("fin_chart_accounts")
        .delete()
        .eq("id", idToDelete);

      if (error) {
        // Mensagem específica para erro de foreign key
        if (error.message.includes('foreign key') || error.message.includes('violates')) {
          throw new Error("Esta conta está vinculada a lançamentos financeiros e não pode ser excluída. Remova os lançamentos primeiro.");
        }
        throw error;
      }

      // After deletion, renumber siblings to fill the gap
      const { data: freshAccounts } = await supabase
        .from("fin_chart_accounts")
        .select("*")
        .order("code");

      if (freshAccounts) {
        const renumberUpdates = fullRenumberSiblings(parentIdOfDeleted, freshAccounts);
        await applyCodeUpdates(renumberUpdates);
      }

      toast.success(`Conta "${accountToDelete.code} - ${accountToDelete.name}" excluída com sucesso!`);
      await refetch();
    } catch (error: any) {
      toast.error(`Erro ao excluir conta: ${error.message}`);
      await refetch();
    }
  };

  const openDeleteDialog = (account: any) => {
    setAccountToDelete(account);
    setDeleteDialogOpen(true);
  };

  const getNatureBadge = useCallback((nature: string) => {
    switch (nature) {
      case "RECEITA":
        return <Badge className="bg-green-600">Receita</Badge>;
      case "DESPESA":
        return <Badge variant="destructive">Despesa</Badge>;
      case "RESULTADO":
        return <Badge className="bg-blue-600">Resultado</Badge>;
      case "FINANCIAMENTO":
        return <Badge className="bg-orange-500">Financiamento</Badge>;
      default:
        return <Badge variant="outline">{nature}</Badge>;
    }
  }, []);

  const getFieldLabel = (field: BulkEditField) => {
    switch (field) {
      case "nature": return "Natureza";
      case "in_dre": return "DRE";
      case "in_cashflow": return "Fluxo de Caixa";
      case "active": return "Status";
      default: return "";
    }
  };

  const isAllSelected = accounts && accounts.length > 0 && selectedIds.size === accounts.length;
  const isSomeSelected = selectedIds.size > 0;

  const activeAccount = activeId ? hierarchicalAccounts.find(a => a.id === activeId) : null;

  return (
    <>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Plano de Contas
        </CardTitle>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOnboardingOpen(true)}
            className="gap-1"
          >
            <Wand2 className="h-4 w-4" />
            Assistente
          </Button>
          <Button variant="outline" size="sm" onClick={expandAll} className="gap-1">
            <ChevronsUpDown className="h-4 w-4" />
            Expandir
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll} className="gap-1">
            <ChevronsUpDown className="h-4 w-4" />
            Agrupar
          </Button>
          <Button onClick={handleNew} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Conta
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Origin filter + intro banner */}
        <div className="mb-4 flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-muted-foreground max-w-2xl">
            <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
            <span>
              Você começa com o <strong className="text-foreground">plano padrão do sistema</strong> (contas marcadas com <ShieldCheck className="inline h-3 w-3 text-primary" />). Elas não podem ser excluídas, mas você pode adicionar contas filhas e criar suas próprias contas para personalizar a estrutura.
            </span>
          </div>
          <div className="inline-flex rounded-md border bg-background p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setOriginFilter("all")}
              className={cn(
                "px-3 py-1.5 rounded-sm transition-colors",
                originFilter === "all" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Todas
            </button>
            <button
              type="button"
              onClick={() => setOriginFilter("core")}
              className={cn(
                "px-3 py-1.5 rounded-sm transition-colors",
                originFilter === "core" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Padrão do sistema
            </button>
            <button
              type="button"
              onClick={() => setOriginFilter("custom")}
              className={cn(
                "px-3 py-1.5 rounded-sm transition-colors",
                originFilter === "custom" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Personalizadas
            </button>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {isSomeSelected && (
          <div className="mb-4 p-3 bg-muted rounded-lg flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-normal">
                {selectedIds.size} selecionado(s)
              </Badge>
              <Button variant="ghost" size="sm" onClick={clearSelection} className="h-7 px-2">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground mr-2">Editar em massa:</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openBulkEditDialog("nature")}
                className="h-8"
              >
                Natureza
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openBulkEditDialog("in_dre")}
                className="h-8"
              >
                DRE
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openBulkEditDialog("in_cashflow")}
                className="h-8"
              >
                Fluxo de Caixa
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openBulkEditDialog("active")}
                className="h-8"
              >
                Status
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setBulkDeleteDialogOpen(true)}
                className="h-8 gap-1"
              >
                <Trash2 className="h-4 w-4" />
                Excluir
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis]}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Selecionar todos"
                    />
                  </TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Natureza</TableHead>
                  <TableHead>DRE</TableHead>
                  <TableHead>Fluxo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <SortableContext
                  items={hierarchicalAccounts.map(a => a.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {hierarchicalAccounts.map((account) => {
                    const hasChildren = account.children && account.children.length > 0;
                    const isExpanded = expandedIds.has(account.id);

                    return (
                      <DraggableAccountRow
                        key={account.id}
                        account={account}
                        isSelected={selectedIds.has(account.id)}
                        isExpanded={isExpanded}
                        hasChildren={hasChildren}
                        onSelect={handleSelectOne}
                        onToggleExpand={toggleExpanded}
                        onEdit={handleEdit}
                        onDelete={openDeleteDialog}
                        getLevelBadge={getLevelBadge}
                        getNatureBadge={getNatureBadge}
                      />
                    );
                  })}
                </SortableContext>
              </TableBody>
            </Table>
            <DragOverlay>
              {activeAccount ? (
                <div className="bg-background border-2 border-primary rounded-md shadow-lg p-3 flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{activeAccount.code}</span>
                  <span className="text-muted-foreground">{activeAccount.name}</span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Conta" : "Nova Conta Contábil"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Código</Label>
                {editing ? (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-md border h-10">
                    <span className="font-mono font-medium">{editing.code}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md border h-10 text-muted-foreground">
                    <span className="text-sm italic">Gerado automaticamente</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Natureza *</Label>
                <Select value={form.nature} onValueChange={(v) => setForm({ ...form, nature: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RECEITA">Receita</SelectItem>
                    <SelectItem value="DESPESA">Despesa</SelectItem>
                    <SelectItem value="RESULTADO">Resultado (Calculado)</SelectItem>
                    <SelectItem value="FINANCIAMENTO">Financiamento (Empréstimos)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                placeholder="Nome da conta..."
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Conta Superior</Label>
              <Select value={form.parent_id || "none"} onValueChange={(v) => setForm({ ...form, parent_id: v === "none" ? "" : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Nenhuma (conta raiz)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma (Raiz)</SelectItem>
                  {parentAccounts.map((a) => {
                    const depth = getDepthFromCode(a.code);
                    const levelName = getLevelName(depth);
                    return (
                      <SelectItem key={a.id} value={a.id}>
                        [{levelName}] {a.code} - {a.name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo da Conta</Label>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md border">
                {getLevelBadge(
                  form.parent_id 
                    ? getDepthFromCode(parentAccounts.find(a => a.id === form.parent_id)?.code || "") + 1 
                    : 0
                )}
                <span className="text-sm text-muted-foreground">
                  (definido automaticamente pela Conta Superior)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.in_dre}
                  onCheckedChange={(checked) => setForm({ ...form, in_dre: checked })}
                />
                <Label>Incluir no DRE</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.in_cashflow}
                  onCheckedChange={(checked) => setForm({ ...form, in_cashflow: checked })}
                />
                <Label>Incluir no Fluxo de Caixa</Label>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={form.active}
                onCheckedChange={(checked) => setForm({ ...form, active: checked })}
              />
              <Label>Conta ativa</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Edit Dialog */}
      <Dialog open={bulkEditDialogOpen} onOpenChange={setBulkEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar {getFieldLabel(bulkEditField)} em Massa</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Alterando <strong>{selectedIds.size}</strong> conta(s) selecionada(s)
            </p>
            
            {bulkEditField === "nature" && (
              <div className="space-y-2">
                <Label>Nova Natureza</Label>
                <Select 
                  value={bulkEditValue as string} 
                  onValueChange={(v) => setBulkEditValue(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RECEITA">Receita</SelectItem>
                    <SelectItem value="DESPESA">Despesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {bulkEditField === "in_dre" && (
              <div className="space-y-2">
                <Label>Incluir no DRE</Label>
                <div className="flex items-center gap-4 mt-2">
                  <Button
                    variant={bulkEditValue === true ? "default" : "outline"}
                    size="sm"
                    onClick={() => setBulkEditValue(true)}
                  >
                    Sim
                  </Button>
                  <Button
                    variant={bulkEditValue === false ? "default" : "outline"}
                    size="sm"
                    onClick={() => setBulkEditValue(false)}
                  >
                    Não
                  </Button>
                </div>
              </div>
            )}

            {bulkEditField === "in_cashflow" && (
              <div className="space-y-2">
                <Label>Incluir no Fluxo de Caixa</Label>
                <div className="flex items-center gap-4 mt-2">
                  <Button
                    variant={bulkEditValue === true ? "default" : "outline"}
                    size="sm"
                    onClick={() => setBulkEditValue(true)}
                  >
                    Sim
                  </Button>
                  <Button
                    variant={bulkEditValue === false ? "default" : "outline"}
                    size="sm"
                    onClick={() => setBulkEditValue(false)}
                  >
                    Não
                  </Button>
                </div>
              </div>
            )}

            {bulkEditField === "active" && (
              <div className="space-y-2">
                <Label>Status da Conta</Label>
                <div className="flex items-center gap-4 mt-2">
                  <Button
                    variant={bulkEditValue === true ? "default" : "outline"}
                    size="sm"
                    onClick={() => setBulkEditValue(true)}
                  >
                    Ativa
                  </Button>
                  <Button
                    variant={bulkEditValue === false ? "default" : "outline"}
                    size="sm"
                    onClick={() => setBulkEditValue(false)}
                  >
                    Inativa
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleBulkEdit} disabled={bulkLoading}>
              {bulkLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Aplicar a {selectedIds.size} conta(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir contas selecionadas?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a excluir <strong>{selectedIds.size}</strong> conta(s) do plano de contas.
              Esta ação não pode ser desfeita e pode afetar lançamentos vinculados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={bulkLoading}
            >
              {bulkLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir {selectedIds.size} conta(s)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Single Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a excluir a conta <strong>{accountToDelete?.code} - {accountToDelete?.name}</strong>.
              Esta ação não pode ser desfeita e pode afetar lançamentos vinculados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSingle}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Move Confirmation Dialog */}
      <AlertDialog open={moveDialogOpen} onOpenChange={(open) => {
        setMoveDialogOpen(open);
        if (!open) setPendingMove(null);
      }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Movimentação</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <div className="p-3 bg-muted rounded-lg space-y-2">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Mover:</span>{" "}
                    <strong className="text-foreground">{pendingMove?.draggedAccount?.code} - {pendingMove?.draggedAccount?.name}</strong>
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Para posição relativa a:</span>{" "}
                    <strong className="text-foreground">{pendingMove?.targetAccount?.code} - {pendingMove?.targetAccount?.name}</strong>
                  </p>
                </div>
                
                <p className="font-medium text-foreground">Como deseja posicionar?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="sm:mr-auto">Cancelar</AlertDialogCancel>
            
            {/* Sibling button */}
            <Button 
              variant="outline"
              onClick={() => executeMove('sibling')}
              className="flex items-center gap-2"
            >
              Mesmo nível (Irmão)
              {getLevelBadge(getMoveTypePreview('sibling').depth)}
            </Button>
            
            {/* Child button - only if target depth allows */}
            {pendingMove && getDepthFromCode(pendingMove.targetAccount?.code || "") < 2 && (
              <Button 
                onClick={() => executeMove('child')}
                className="flex items-center gap-2"
              >
                Dentro de (Filho)
                {getLevelBadge(getMoveTypePreview('child').depth)}
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
    <ChartAccountsOnboardingWizard open={onboardingOpen} onOpenChange={setOnboardingOpen} />
    </>
  );
}
