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
import { Plus, Pencil, FileSpreadsheet, Loader2, Trash2, X, ChevronRight, ChevronDown, ChevronsUpDown, GripVertical } from "lucide-react";
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
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: account.id });

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
        isDragging && "opacity-50 bg-muted"
      )}
    >
      <TableCell className="w-8 p-0">
        <div
          {...attributes}
          {...listeners}
          className={cn(
            "flex items-center justify-center h-full w-8 cursor-grab active:cursor-grabbing",
            "text-muted-foreground hover:text-foreground transition-colors"
          )}
        >
          <GripVertical className="h-4 w-4" />
        </div>
      </TableCell>
      <TableCell>
        <Checkbox
          checked={isSelected}
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
              account.depth >= 2 && "text-muted-foreground"
            )}
          >
            {account.code}
          </span>
        </div>
      </TableCell>
      <TableCell>{getLevelBadge(account.depth)}</TableCell>
      <TableCell>
        <span
          className={cn(
            account.depth === 0 && "font-bold",
            account.depth === 1 && "font-semibold",
            account.depth >= 2 && "text-muted-foreground"
          )}
        >
          {account.name}
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
        {account.active ? (
          <Badge className="bg-green-600">Ativa</Badge>
        ) : (
          <Badge variant="secondary">Inativa</Badge>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => onEdit(account)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(account)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
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
        .order("code");
      return data || [];
    },
  });

  // Initialize expanded state with root accounts when data loads
  useEffect(() => {
    if (accounts && accounts.length > 0 && expandedIds.size === 0) {
      const rootIds = accounts.filter(a => !a.parent_id).map(a => a.id);
      setExpandedIds(new Set(rootIds));
    }
  }, [accounts]);

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
    return depth < 2; // Only Raiz and Grupo can be parents
  }) || [];

  // Build hierarchical tree structure
  const buildTree = (items: any[]): any[] => {
    const map = new Map<string, any>();
    const roots: any[] = [];

    // First pass: create map of all items
    items.forEach((item) => {
      map.set(item.id, { ...item, children: [] });
    });

    // Second pass: build parent-child relationships
    items.forEach((item) => {
      const node = map.get(item.id);
      if (item.parent_id && map.has(item.parent_id)) {
        map.get(item.parent_id).children.push(node);
      } else {
        roots.push(node);
      }
    });

    // Sort children by code
    const sortChildren = (nodes: any[]) => {
      nodes.sort((a, b) => a.code.localeCompare(b.code));
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

  const treeData = useMemo(() => accounts ? buildTree(accounts) : [], [accounts]);
  const hierarchicalAccounts = useMemo(() => flattenTree(treeData), [treeData, expandedIds]);

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

  // Calculate new code for an account when moved
  const calculateNewCode = useCallback((
    targetParentId: string | null,
    position: number,
    allAccounts: any[],
    draggedAccountId: string
  ): string => {
    // Get ALL existing codes to ensure uniqueness
    const allExistingCodes = new Set(
      allAccounts
        .filter(a => a.id !== draggedAccountId)
        .map(a => a.code)
    );

    if (!targetParentId) {
      // Root level - find next available root code
      let newCode = 1;
      while (allExistingCodes.has(String(newCode))) {
        newCode++;
      }
      return String(newCode);
    }

    const parentAccount = allAccounts.find(a => a.id === targetParentId);
    if (!parentAccount) return "1";

    // Find next available sub-code under this parent
    let newSubCode = 1;
    let candidateCode = `${parentAccount.code}.${newSubCode}`;
    
    while (allExistingCodes.has(candidateCode)) {
      newSubCode++;
      candidateCode = `${parentAccount.code}.${newSubCode}`;
    }

    return candidateCode;
  }, []);

  // Update all children codes recursively
  const updateChildrenCodes = useCallback(async (
    accountId: string,
    oldCodePrefix: string,
    newCodePrefix: string,
    allAccounts: any[]
  ): Promise<{ id: string; newCode: string }[]> => {
    const updates: { id: string; newCode: string }[] = [];
    
    const children = allAccounts.filter(a => a.parent_id === accountId);
    for (const child of children) {
      const newChildCode = child.code.replace(oldCodePrefix, newCodePrefix);
      updates.push({ id: child.id, newCode: newChildCode });
      
      // Recursively get grandchildren updates
      const grandchildUpdates = await updateChildrenCodes(
        child.id,
        child.code,
        newChildCode,
        allAccounts
      );
      updates.push(...grandchildUpdates);
    }
    
    return updates;
  }, []);

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
      // Become sibling of target (same parent)
      newParentId = targetAccount.parent_id;
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

    // Calculate new code
    const oldCode = draggedAccount.code;
    const newCode = calculateNewCode(newParentId, 0, accounts, draggedAccount.id);

    // Get all children that need updating
    const childUpdates = await updateChildrenCodes(
      draggedAccount.id,
      oldCode,
      newCode,
      accounts
    );

    // Close dialog first to prevent DOM conflicts
    setMoveDialogOpen(false);
    setPendingMove(null);
    
    // Clear drag state to prevent DnD DOM errors
    setActiveId(null);

    // Use setTimeout to allow React to finish DOM updates before optimistic update
    await new Promise(resolve => setTimeout(resolve, 50));

    // Optimistic update
    optimisticUpdate((prev) => {
      const updated = prev.map(a => {
        if (a.id === draggedAccount.id) {
          return { ...a, code: newCode, parent_id: newParentId };
        }
        const childUpdate = childUpdates.find(u => u.id === a.id);
        if (childUpdate) {
          return { ...a, code: childUpdate.newCode };
        }
        return a;
      });
      return updated.sort((a, b) => a.code.localeCompare(b.code));
    });

    try {
      // Update the dragged account
      const { error: mainError } = await supabase
        .from("fin_chart_accounts")
        .update({ code: newCode, parent_id: newParentId })
        .eq("id", draggedAccount.id);

      if (mainError) throw mainError;

      // Update all children
      for (const update of childUpdates) {
        const { error } = await supabase
          .from("fin_chart_accounts")
          .update({ code: update.newCode })
          .eq("id", update.id);
        
        if (error) throw error;
      }

      toast.success(`Conta movida: ${oldCode} → ${newCode}`);
    } catch (error: any) {
      toast.error("Erro ao mover conta: " + error.message);
      await refetch();
    }
  }, [accounts, pendingMove, getDescendantIds, calculateNewCode, updateChildrenCodes, optimisticUpdate, refetch]);

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
    if (!form.code || !form.name || !form.nature) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    setLoading(true);
    const data = {
      code: form.code,
      name: form.name,
      nature: form.nature,
      parent_id: form.parent_id || null,
      in_dre: form.in_dre,
      in_cashflow: form.in_cashflow,
      active: form.active,
    };

    // Generate a temporary ID for new items
    const tempId = `temp-${Date.now()}`;

    // Optimistic update
    if (editing) {
      optimisticUpdate((prev) =>
        prev.map((a) => (a.id === editing.id ? { ...a, ...data } : a))
      );
    } else {
      // Add new item optimistically with temp ID
      const newItem = {
        id: tempId,
        ...data,
        created_at: new Date().toISOString(),
        dre_order: null,
      };
      optimisticUpdate((prev) => {
        // Insert in the right position based on code
        const newList = [...prev, newItem];
        return newList.sort((a, b) => a.code.localeCompare(b.code));
      });
    }

    setDialogOpen(false);

    try {
      if (editing) {
        const { error } = await supabase
          .from("fin_chart_accounts")
          .update(data)
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("Conta atualizada!");
      } else {
        const { error } = await supabase
          .from("fin_chart_accounts")
          .insert(data);
        if (error) throw error;
        toast.success("Conta criada!");
      }

      // Success - optimistic update already applied, no refetch needed
    } catch (error: any) {
      toast.error("Erro: " + error.message);
      await refetch(); // Rollback on error
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
      // Success - optimistic update already applied, no refetch needed
    } catch (error: any) {
      toast.error("Erro: " + error.message);
      await refetch(); // Rollback on error
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    const idsToDelete = Array.from(selectedIds);

    // Optimistic update - remove immediately
    optimisticUpdate((prev) => prev.filter((a) => !idsToDelete.includes(a.id)));

    setBulkDeleteDialogOpen(false);
    clearSelection();
    setBulkLoading(true);

    try {
      const { error } = await supabase
        .from("fin_chart_accounts")
        .delete()
        .in("id", idsToDelete);

      if (error) throw error;

      toast.success(`${idsToDelete.length} conta(s) excluída(s)!`);
      // Success - optimistic update already applied, no refetch needed
    } catch (error: any) {
      toast.error("Erro: " + error.message);
      await refetch(); // Rollback on error
    } finally {
      setBulkLoading(false);
    }
  };

  // Single delete handler
  const handleDeleteSingle = async () => {
    if (!accountToDelete || !accounts) return;

    const idToDelete = accountToDelete.id;
    
    // Check if account has children
    const hasChildren = accounts.some(a => a.parent_id === idToDelete);
    if (hasChildren) {
      toast.error("Não é possível excluir: esta conta possui subcontas. Exclua primeiro as subcontas.");
      setDeleteDialogOpen(false);
      setAccountToDelete(null);
      return;
    }

    // Optimistic update
    optimisticUpdate((prev) => prev.filter((a) => a.id !== idToDelete));

    setDeleteDialogOpen(false);
    setAccountToDelete(null);

    try {
      const { error } = await supabase
        .from("fin_chart_accounts")
        .delete()
        .eq("id", idToDelete);

      if (error) throw error;

      toast.success("Conta excluída!");
      // Success - optimistic update already applied, no refetch needed
    } catch (error: any) {
      toast.error("Erro: " + error.message);
      await refetch(); // Rollback on error
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Plano de Contas
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={expandAll} className="gap-1">
            <ChevronsUpDown className="h-4 w-4" />
            Expandir
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll} className="gap-1">
            <ChevronsUpDown className="h-4 w-4" />
            Colapsar
          </Button>
          <Button onClick={handleNew} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Conta
          </Button>
        </div>
      </CardHeader>
      <CardContent>
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
                <Label>Código *</Label>
                <Input
                  placeholder="Ex: 4.1.1"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                />
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
  );
}
