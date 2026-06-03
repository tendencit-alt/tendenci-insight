import { useQuery } from "@tanstack/react-query";
import { auditStub } from "@/lib/audit-stub";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// ─── Types ───
export type ConnectorStatus = "connected" | "configured" | "available" | "error";

export interface ConnectorInfo {
  id: string;
  name: string;
  category: "banking" | "fiscal" | "acquirer" | "communication" | "crm" | "bi" | "api";
  status: ConnectorStatus;
  lastSync?: string | null;
  recordsSynced?: number;
  description: string;
  icon: string; // lucide icon name
}

export interface SyncEvent {
  id: string;
  connector: string;
  event: string;
  status: "success" | "error" | "pending";
  recordCount: number;
  timestamp: string;
  details?: string;
}

export interface IntegrationStats {
  totalConnectors: number;
  activeConnectors: number;
  totalSynced: number;
  lastSyncAt: string | null;
  autoClassifiedPercent: number;
  pendingClassification: number;
  apiCallsToday: number;
  errorRate: number;
}

export interface IntegrationLayerData {
  stats: IntegrationStats;
  connectors: ConnectorInfo[];
  recentSyncs: SyncEvent[];
  acquirers: ConnectorInfo[];
  webhookUrl: string | null;
}

// Standard connectors catalog
const CONNECTORS_CATALOG: Omit<ConnectorInfo, "status" | "lastSync" | "recordsSynced">[] = [
  { id: "ofx", name: "Bancário OFX/Open Finance", category: "banking", description: "Importação extrato, saldo, movimentações e tarifas", icon: "Landmark" },
  { id: "nfe", name: "NF-e Emitidas", category: "fiscal", description: "Notas fiscais, produtos, impostos e receita automática", icon: "FileText" },
  { id: "xml-fornecedor", name: "XML Fornecedores", category: "fiscal", description: "Notas de entrada, despesas e classificação DRE", icon: "FileDown" },
  { id: "pagarme", name: "Pagar.me", category: "acquirer", description: "Parcelas, taxas e antecipações de recebíveis", icon: "CreditCard" },
  { id: "stone", name: "Stone", category: "acquirer", description: "Parcelas, taxas e antecipações de recebíveis", icon: "CreditCard" },
  { id: "cielo", name: "Cielo", category: "acquirer", description: "Parcelas, taxas e antecipações de recebíveis", icon: "CreditCard" },
  { id: "rede", name: "Rede", category: "acquirer", description: "Parcelas, taxas e antecipações de recebíveis", icon: "CreditCard" },
  { id: "whatsapp", name: "WhatsApp Operacional", category: "communication", description: "Alertas de pedido, cobrança e montagem", icon: "MessageCircle" },
  { id: "crm", name: "CRM Pipeline", category: "crm", description: "Conversão lead→pedido automática", icon: "Users" },
  { id: "powerbi", name: "Power BI", category: "bi", description: "Conexão BI externo com base ERP", icon: "BarChart3" },
  { id: "metabase", name: "Metabase", category: "bi", description: "Conexão BI externo com base ERP", icon: "BarChart3" },
  { id: "api-publica", name: "API Pública ERP", category: "api", description: "Endpoint REST para sistemas externos", icon: "Globe" },
];

export function useIntegrationLayer() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["integration-layer", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<IntegrationLayerData> => {
      // Parallel queries for integration status
      const [bankTxRes, ledgerRes, importLogsRes] = await Promise.all([
        supabase.from("fin_bank_transactions" as any).select("id, status, created_at", { count: "exact", head: false }).order("created_at", { ascending: false }).limit(5),
        supabase.from("fin_ledger_entries").select("id, classification_status, created_at").not("classification_status", "is", null).limit(100),auditStub().select("*").order("created_at", { ascending: false }).limit(10),
      ]);

      const bankTxCount = bankTxRes.count || 0;
      const bankTxData: any[] = bankTxRes.data || [];
      const ledgerData: any[] = ledgerRes.data || [];
      const importLogs: any[] = importLogsRes.data || [];

      // Determine connector statuses based on data
      const webhookUrl = typeof window !== "undefined" ? localStorage.getItem("n8n_webhook_url") : null;
      const hasWhatsAppConfig = typeof window !== "undefined" && !!localStorage.getItem("evolution_instance_name");

      const connectors: ConnectorInfo[] = CONNECTORS_CATALOG.map(c => {
        let status: ConnectorStatus = "available";
        let lastSync: string | null = null;
        let recordsSynced = 0;

        if (c.id === "ofx" && bankTxCount > 0) {
          status = "connected";
          lastSync = bankTxData[0]?.created_at || null;
          recordsSynced = bankTxCount;
        } else if (c.id === "whatsapp" && hasWhatsAppConfig) {
          status = "configured";
        } else if (c.id === "crm") {
          status = "connected"; // CRM is always the internal pipeline
          recordsSynced = 0;
        } else if (c.id === "api-publica") {
          status = "configured";
        } else if (webhookUrl && c.id === "whatsapp") {
          status = "configured";
        }

        return { ...c, status, lastSync, recordsSynced };
      });

      // Auto-classification stats
      const classified = ledgerData.filter((e: any) => e.classification_status === "auto" || e.classification_status === "confirmed");
      const pending = ledgerData.filter((e: any) => e.classification_status === "suggested" || e.classification_status === "pending");
      const autoPercent = ledgerData.length > 0 ? Math.round((classified.length / ledgerData.length) * 100) : 0;

      // Recent syncs from import logs
      const recentSyncs: SyncEvent[] = importLogs.map((log: any) => ({
        id: log.id,
        connector: log.file_type === "ofx" ? "OFX Bancário" : log.file_type || "Manual",
        event: `Importação ${log.file_name}`,
        status: log.status === "completed" ? "success" as const : log.status === "error" ? "error" as const : "pending" as const,
        recordCount: log.success_count || log.record_count || 0,
        timestamp: log.created_at,
        details: log.error_count ? `${log.error_count} erros` : undefined,
      }));

      const activeConnectors = connectors.filter(c => c.status === "connected" || c.status === "configured").length;

      return {
        stats: {
          totalConnectors: connectors.length,
          activeConnectors,
          totalSynced: bankTxCount + importLogs.reduce((s: number, l: any) => s + (l.success_count || 0), 0),
          lastSyncAt: importLogs[0]?.created_at || bankTxData[0]?.created_at || null,
          autoClassifiedPercent: autoPercent,
          pendingClassification: pending.length,
          apiCallsToday: 0,
          errorRate: importLogs.length > 0 ? Math.round((importLogs.filter((l: any) => l.status === "error").length / importLogs.length) * 100) : 0,
        },
        connectors,
        recentSyncs,
        acquirers: connectors.filter(c => c.category === "acquirer"),
        webhookUrl,
      };
    },
    refetchInterval: 300000,
    staleTime: 120000,
  });
}
