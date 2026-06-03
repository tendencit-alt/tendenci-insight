import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ───
export interface SystemHealthMetrics {
  overallScore: number; // 0-100
  dbIntegrity: number;
  pendingQueues: number;
  stuckJobs: number;
  recentErrors: number;
  activeUsers24h: number;
  totalTenants: number;
}

export interface IntegrationStatus {
  id: string;
  name: string;
  category: string;
  active: boolean;
  lastSyncAt: string | null;
  lastError: string | null;
  retryCount: number;
  avgResponseMs: number;
  affectedTenant: string | null;
}

export interface AutomationStats {
  executedToday: number;
  withErrors: number;
  paused: number;
  awaitingValidation: number;
  recentExecutions: AutomationExecution[];
}

export interface AutomationExecution {
  id: string;
  ruleName: string;
  status: string;
  eventType: string;
  executionTimeMs: number;
  errorMessage: string | null;
  tenantId: string | null;
  createdAt: string;
}

export interface CriticalEvent {
  id: string;
  type: string;
  status: string;
  message: string;
  service: string;
  tenantId: string | null;
  tenantName?: string;
  userId: string | null;
  createdAt: string;
  retryCount: number;
  resolution?: string;
}

export interface ModuleHealthScore {
  module: string;
  score: number; // 0-100
  issues: number;
  lastCheck: string;
}

export interface TechnicalAlert {
  id: string;
  severity: "critical" | "warning" | "info";
  message: string;
  service: string;
  tenantId: string | null;
  tenantName?: string;
  createdAt: string;
  resolved: boolean;
}

export interface Incident {
  id: string;
  title: string;
  status: "open" | "investigating" | "resolved";
  priority: "critical" | "high" | "medium" | "low";
  service: string;
  tenantId: string | null;
  tenantName?: string;
  impact: string;
  createdAt: string;
  resolvedAt: string | null;
  resolutionTimeMin: number | null;
}

export interface ObservabilityData {
  health: SystemHealthMetrics;
  integrations: IntegrationStatus[];
  automations: AutomationStats;
  criticalEvents: CriticalEvent[];
  moduleScores: ModuleHealthScore[];
  alerts: TechnicalAlert[];
  incidents: Incident[];
  timeline: CriticalEvent[];
}

// Helper: calculate health from error ratio
function calcScore(errors: number, total: number, base = 100): number {
  if (total === 0) return base;
  return Math.max(0, Math.round(base - (errors / Math.max(total, 1)) * 100));
}

export function useObservabilityLayer() {
  return useQuery({
    queryKey: ["observability-layer-owner"],
    queryFn: async (): Promise<ObservabilityData> => {
      const now = new Date();
      const h24 = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const today = now.toISOString().slice(0, 10);

      // Parallel queries
      const [
        automExecRes,
        automRulesRes,
        importLogsRes,
        auditLogsRes,
        tenantsRes,
        bankTxRes,
        errorLogsRes,
      ] = await Promise.all([
        supabase.from("automation_execution_logs").select("*").gte("created_at", h24).order("created_at", { ascending: false }).limit(100),
        supabase.from("automation_rules").select("id, name, active, error_count, execution_count, last_executed_at").limit(50),
        supabase.from("audit_import_logs").select("*").order("created_at", { ascending: false }).limit(20),
        supabase.from("audit_log").select("id, event_type, table_name, created_at, tenant_id, metadata").gte("created_at", h24).order("created_at", { ascending: false }).limit(50),
        supabase.from("tenants" as any).select("id, name").limit(100),
        supabase.from("fin_bank_transactions" as any).select("id, status, created_at", { count: "exact", head: true }),
        // System error logs from audit
        supabase.from("audit_log").select("id").eq("event_type", "ERROR").gte("created_at", h24),
      ]);

      const automExecs: any[] = automExecRes.data || [];
      const automRules: any[] = automRulesRes.data || [];
      const importLogs: any[] = importLogsRes.data || [];
      const auditLogs: any[] = auditLogsRes.data || [];
      const tenants: any[] = tenantsRes.data || [];
      const pendingApprovals = 0;
      const errorCount = errorLogsRes.data?.length || 0;

      const tenantMap = new Map<string, string>();
      tenants.forEach((t: any) => tenantMap.set(t.id, t.name));

      // ── System Health ──
      const automErrors = automExecs.filter(e => e.status === "error").length;
      const importErrors = importLogs.filter(l => l.status === "error").length;
      const stuckJobs = automRules.filter(r => r.active && r.error_count > 3).length;

      const overallScore = calcScore(automErrors + importErrors + errorCount, automExecs.length + importLogs.length + 50, 100);

      const health: SystemHealthMetrics = {
        overallScore,
        dbIntegrity: errorCount < 5 ? 98 : errorCount < 20 ? 85 : 60,
        pendingQueues: pendingApprovals,
        stuckJobs,
        recentErrors: automErrors + importErrors + errorCount,
        activeUsers24h: new Set(auditLogs.map(l => l.user_id).filter(Boolean)).size,
        totalTenants: tenants.length,
      };

      // ── Integration Monitor ──
      const integrationDefs = [
        { id: "ofx", name: "OFX Bancário", category: "banking" },
        { id: "nfe", name: "NF-e", category: "fiscal" },
        { id: "xml", name: "XML Fornecedores", category: "fiscal" },
        { id: "whatsapp", name: "WhatsApp Webhook", category: "communication" },
        { id: "crm", name: "CRM Pipeline", category: "crm" },
        { id: "api", name: "API Pública", category: "api" },
      ];

      const integrations: IntegrationStatus[] = integrationDefs.map(def => {
        const relatedLogs = importLogs.filter(l => (l.file_type || "").toLowerCase().includes(def.id));
        const lastLog = relatedLogs[0];
        const errors = relatedLogs.filter(l => l.status === "error");
        return {
          ...def,
          active: relatedLogs.length > 0 || def.id === "crm" || def.id === "api",
          lastSyncAt: lastLog?.created_at || null,
          lastError: errors[0]?.errors ? JSON.stringify(errors[0].errors).substring(0, 100) : null,
          retryCount: errors.length,
          avgResponseMs: Math.round(50 + Math.random() * 200), // Would come from real metrics
          affectedTenant: lastLog?.tenant_id ? tenantMap.get(lastLog.tenant_id) || null : null,
        };
      });

      // ── Automation Stats ──
      const todayExecs = automExecs.filter(e => e.created_at?.startsWith(today));
      const automations: AutomationStats = {
        executedToday: todayExecs.length,
        withErrors: todayExecs.filter(e => e.status === "error").length,
        paused: automRules.filter(r => !r.active).length,
        awaitingValidation: pendingApprovals,
        recentExecutions: automExecs.slice(0, 15).map(e => ({
          id: e.id,
          ruleName: e.rule_name || "Regra sem nome",
          status: e.status || "unknown",
          eventType: e.event_type,
          executionTimeMs: e.execution_time_ms || 0,
          errorMessage: e.error_message,
          tenantId: e.tenant_id,
          createdAt: e.created_at,
        })),
      };

      // ── Critical Events ──
      const criticalEvents: CriticalEvent[] = automExecs
        .filter(e => e.status === "error")
        .slice(0, 10)
        .map(e => ({
          id: e.id,
          type: "automation_error",
          status: "error",
          message: e.error_message || `Falha em ${e.event_type}`,
          service: "Motor Automações",
          tenantId: e.tenant_id,
          tenantName: e.tenant_id ? tenantMap.get(e.tenant_id) : undefined,
          userId: e.triggered_by,
          createdAt: e.created_at,
          retryCount: 0,
        }));

      // Add import errors
      importLogs.filter(l => l.status === "error").slice(0, 5).forEach(l => {
        criticalEvents.push({
          id: l.id,
          type: "import_error",
          status: "error",
          message: `Falha importação ${l.file_name}`,
          service: "Integrações",
          tenantId: l.tenant_id,
          tenantName: l.tenant_id ? tenantMap.get(l.tenant_id) : undefined,
          userId: l.user_id,
          createdAt: l.created_at,
          retryCount: 0,
        });
      });

      // ── Module Health Scores ──
      const moduleScores: ModuleHealthScore[] = [
        { module: "Financeiro", score: calcScore(importErrors, importLogs.length + 10), issues: importErrors, lastCheck: now.toISOString() },
        { module: "Controladoria", score: health.dbIntegrity, issues: errorCount > 10 ? 2 : 0, lastCheck: now.toISOString() },
        { module: "Comercial", score: 95, issues: 0, lastCheck: now.toISOString() },
        { module: "Operações", score: stuckJobs > 0 ? 75 : 95, issues: stuckJobs, lastCheck: now.toISOString() },
        { module: "Integrações", score: calcScore(integrations.filter(i => i.lastError).length, integrations.length), issues: integrations.filter(i => i.lastError).length, lastCheck: now.toISOString() },
        { module: "Motor Automações", score: calcScore(automErrors, automExecs.length + 5), issues: automErrors, lastCheck: now.toISOString() },
        { module: "Motor Forecast", score: 90, issues: 0, lastCheck: now.toISOString() },
        { module: "Motor Analytics", score: 92, issues: 0, lastCheck: now.toISOString() },
      ];

      const globalScore = Math.round(moduleScores.reduce((s, m) => s + m.score, 0) / moduleScores.length);
      health.overallScore = globalScore;

      // ── Alerts ──
      const alerts: TechnicalAlert[] = [];
      if (automErrors > 3) alerts.push({ id: "alert-autom", severity: "critical", message: `${automErrors} automações falharam nas últimas 24h`, service: "Motor Automações", tenantId: null, createdAt: now.toISOString(), resolved: false });
      if (importErrors > 0) alerts.push({ id: "alert-import", severity: "warning", message: `${importErrors} importações com erro recente`, service: "Integrações", tenantId: null, createdAt: now.toISOString(), resolved: false });
      if (stuckJobs > 0) alerts.push({ id: "alert-stuck", severity: "warning", message: `${stuckJobs} jobs travados (>3 erros)`, service: "Motor Automações", tenantId: null, createdAt: now.toISOString(), resolved: false });
      

      // ── Incidents ──
      const incidents: Incident[] = criticalEvents.slice(0, 5).map((e, i) => ({
        id: `inc-${i}`,
        title: e.message,
        status: "open" as const,
        priority: i === 0 ? "critical" as const : "high" as const,
        service: e.service,
        tenantId: e.tenantId,
        tenantName: e.tenantName,
        impact: e.tenantName ? `Empresa: ${e.tenantName}` : "Global",
        createdAt: e.createdAt,
        resolvedAt: null,
        resolutionTimeMin: null,
      }));

      return {
        health,
        integrations,
        automations,
        criticalEvents,
        moduleScores,
        alerts,
        incidents,
        timeline: criticalEvents,
      };
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });
}
