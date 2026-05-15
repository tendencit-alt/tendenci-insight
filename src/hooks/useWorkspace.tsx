import { useState, useCallback, useMemo, useEffect, createContext, useContext } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";

// ── Types ──
export interface WorkspaceDefinition {
  id: string;
  name: string;
  icon: string; // emoji
  groups: string[]; // which sidebar groups to show
  description: string;
  isDefault?: boolean;
  isTemporary?: boolean;
  projectId?: string; // linked project
  createdAt?: string;
}

export interface WorkspaceState {
  activeWorkspaceId: string;
  customWorkspaces: WorkspaceDefinition[];
}

// ── Default workspaces ──
const DEFAULT_WORKSPACES: WorkspaceDefinition[] = [
  {
    id: "all",
    name: "Completo",
    icon: "🏢",
    groups: [],
    description: "Visualização completa do sistema",
    isDefault: true,
  },
  {
    id: "executivo",
    name: "Executivo",
    icon: "📊",
    groups: ["Hoje", "Financeiro", "Vendas", "Estratégia", "Sistema"],
    description: "Visão executiva: finanças, vendas, estratégia",
  },
  {
    id: "comercial",
    name: "Comercial",
    icon: "🛒",
    groups: ["Hoje", "Vendas", "Sistema"],
    description: "CRM, pipeline, pedidos, clientes",
  },
  {
    id: "operacional",
    name: "Operacional",
    icon: "🏭",
    groups: ["Hoje", "Operações", "Pessoas", "Sistema"],
    description: "Projetos, produção, suprimentos, RH",
  },
];

// ── Temporary workspace templates ──
export const TEMPORARY_TEMPLATES: Omit<WorkspaceDefinition, "id" | "createdAt">[] = [
  {
    name: "Auditoria",
    icon: "🔍",
    groups: ["Hoje", "Financeiro", "Estratégia"],
    description: "Workspace focado em auditoria e verificação",
    isTemporary: true,
  },
  {
    name: "Fechamento Mês",
    icon: "📅",
    groups: ["Hoje", "Financeiro"],
    description: "Workspace focado em fechamento mensal",
    isTemporary: true,
  },
  {
    name: "Implantação Cliente",
    icon: "🚀",
    groups: ["Hoje", "Vendas", "Operações", "Pessoas"],
    description: "Workspace focado em onboarding de cliente",
    isTemporary: true,
  },
];

// ── Storage ──
const STORAGE_KEY = "erp_workspace_state";

function loadState(): WorkspaceState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { activeWorkspaceId: "all", customWorkspaces: [] };
}

function saveState(state: WorkspaceState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ── Role-based auto workspace ──
function getAutoWorkspaceForRole(userLevel: string): string {
  if (userLevel === "system_owner" || userLevel === "tenant_owner") return "all";
  return "all";
}

// ── Context ──
interface WorkspaceContextType {
  activeWorkspace: WorkspaceDefinition;
  allWorkspaces: WorkspaceDefinition[];
  setActiveWorkspace: (id: string) => void;
  createWorkspace: (ws: Omit<WorkspaceDefinition, "id" | "createdAt">) => string;
  updateWorkspace: (id: string, updates: Partial<WorkspaceDefinition>) => void;
  deleteWorkspace: (id: string) => void;
  createFromTemplate: (template: Omit<WorkspaceDefinition, "id" | "createdAt">) => string;
  isGroupVisible: (groupLabel: string) => boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { userLevel } = usePermissions();
  const [state, setState] = useState<WorkspaceState>(loadState);

  // Persist
  useEffect(() => {
    saveState(state);
  }, [state]);

  const allWorkspaces = useMemo(() => {
    return [...DEFAULT_WORKSPACES, ...state.customWorkspaces];
  }, [state.customWorkspaces]);

  const activeWorkspace = useMemo(() => {
    return allWorkspaces.find(w => w.id === state.activeWorkspaceId) || DEFAULT_WORKSPACES[0];
  }, [allWorkspaces, state.activeWorkspaceId]);

  const setActiveWorkspace = useCallback((id: string) => {
    setState(prev => ({ ...prev, activeWorkspaceId: id }));
  }, []);

  const createWorkspace = useCallback((ws: Omit<WorkspaceDefinition, "id" | "createdAt">): string => {
    const id = `custom-${Date.now()}`;
    const newWs: WorkspaceDefinition = { ...ws, id, createdAt: new Date().toISOString() };
    setState(prev => ({
      ...prev,
      customWorkspaces: [...prev.customWorkspaces, newWs],
      activeWorkspaceId: id,
    }));
    return id;
  }, []);

  const createFromTemplate = useCallback((template: Omit<WorkspaceDefinition, "id" | "createdAt">): string => {
    return createWorkspace(template);
  }, [createWorkspace]);

  const updateWorkspace = useCallback((id: string, updates: Partial<WorkspaceDefinition>) => {
    setState(prev => ({
      ...prev,
      customWorkspaces: prev.customWorkspaces.map(w =>
        w.id === id ? { ...w, ...updates } : w
      ),
    }));
  }, []);

  const deleteWorkspace = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      customWorkspaces: prev.customWorkspaces.filter(w => w.id !== id),
      activeWorkspaceId: prev.activeWorkspaceId === id ? "all" : prev.activeWorkspaceId,
    }));
  }, []);

  const isGroupVisible = useCallback((groupLabel: string): boolean => {
    if (activeWorkspace.groups.length === 0) return true;
    // Always show core system areas and any Owner section for authorized Owner profiles.
    if (["Sistema", "Configurações", "Owner", "Owner Panel", "Painel Owner"].includes(groupLabel)) return true;
    if (groupLabel.startsWith("Owner ·") || groupLabel.startsWith("Owner ")) return true;
    return activeWorkspace.groups.includes(groupLabel);
  }, [activeWorkspace]);

  return (
    <WorkspaceContext.Provider value={{
      activeWorkspace,
      allWorkspaces,
      setActiveWorkspace,
      createWorkspace,
      updateWorkspace,
      deleteWorkspace,
      createFromTemplate,
      isGroupVisible,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
