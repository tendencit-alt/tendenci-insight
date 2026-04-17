// Smart Permissions UX Layer — types
export type PermissionLevel = "owner" | "admin" | "manager" | "operator" | "viewer";

export interface PermissionCatalogEntry {
  permission_key: string;
  label: string;
  module: string;
  description?: string | null;
  default_blocked_message?: string | null;
  is_critical: boolean;
}

export interface PermissionDenialRecord {
  id: string;
  user_id: string;
  tenant_id: string | null;
  permission_key: string;
  module: string | null;
  context: Record<string, unknown> | null;
  attempted_at: string;
}

export interface SimulationState {
  active: boolean;
  targetUserId?: string;
  targetProfileTypeId?: string;
  targetProfileName?: string;
  targetUserName?: string;
}
