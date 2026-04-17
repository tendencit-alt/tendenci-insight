export type SearchEntityType =
  | "client"
  | "supplier"
  | "order"
  | "project"
  | "expense"
  | "revenue"
  | "payable"
  | "receivable"
  | "goal"
  | "report"
  | "dashboard"
  | "ticket"
  | "integration"
  | "intent"
  | "action";

export interface SearchAction {
  id: string;
  label: string;
  icon?: string;
  variant?: "default" | "primary" | "destructive" | "success";
  onExecute: () => void | Promise<void>;
}

export interface SearchResult {
  id: string;
  type: SearchEntityType;
  title: string;
  subtitle?: string;
  description?: string;
  badge?: string;
  route?: string;
  score?: number;
  metadata?: Record<string, any>;
  actions?: SearchAction[];
}

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  intentKey?: string;
  createdAt: string;
}

export interface SearchAnalyticsEvent {
  query: string;
  timestamp: string;
  resultCount: number;
  hadResults: boolean;
  context?: string;
  actionTaken?: string;
  abandoned?: boolean;
}

export interface IntentDefinition {
  key: string;
  patterns: RegExp[];
  label: string;
  description: string;
  route: string;
  filters?: Record<string, any>;
  type: SearchEntityType;
}

export type SearchContext =
  | "financeiro"
  | "crm"
  | "operacional"
  | "projetos"
  | "relatorios"
  | "global";
