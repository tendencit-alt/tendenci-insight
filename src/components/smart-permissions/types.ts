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


export interface SimulationState {
  active: boolean;
  targetUserId?: string;
  targetProfileTypeId?: string;
  targetProfileName?: string;
  targetUserName?: string;
}
