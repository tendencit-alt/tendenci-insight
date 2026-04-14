import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// ─── Types ───
export interface DuplicateCandidate {
  id: string;
  name: string;
  matchId: string;
  matchName: string;
  similarity: number; // 0-1
  entity: "fornecedor" | "cliente";
}

export interface ClassificationSuggestion {
  supplierId: string;
  supplierName: string;
  suggestedCategory: string;
  confidence: number; // 0-100
  basedOn: number; // number of past entries
}

export interface MasterDataStats {
  totalSuppliers: number;
  totalClients: number;
  totalCostCenters: number;
  totalChartAccounts: number;
  totalBankAccounts: number;
  duplicateCandidates: number;
  uncategorizedSuppliers: number;
  classificationSuggestions: number;
}

export interface MasterEntitySummary {
  id: string;
  name: string;
  category?: string | null;
  status?: string | null;
  extra?: string | null;
}

export interface MasterDataLayerData {
  stats: MasterDataStats;
  supplierDuplicates: DuplicateCandidate[];
  clientDuplicates: DuplicateCandidate[];
  classificationSuggestions: ClassificationSuggestion[];
  costCenters: MasterEntitySummary[];
  bankAccounts: MasterEntitySummary[];
  paymentMethods: string[];
  bankCategories: string[];
}

// Simple similarity (Dice coefficient on bigrams)
function similarity(a: string, b: string): number {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-záàâãéèêíïóôõúüç]/g, "").trim();
  const na = norm(a);
  const nb = norm(b);
  if (na === nb) return 1;
  if (na.length < 2 || nb.length < 2) return 0;
  const bigrams = (s: string) => {
    const set = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) set.add(s.substring(i, i + 2));
    return set;
  };
  const ba = bigrams(na);
  const bb = bigrams(nb);
  let matches = 0;
  ba.forEach(b => { if (bb.has(b)) matches++; });
  return (2 * matches) / (ba.size + bb.size);
}

function findDuplicates(items: { id: string; name: string }[], entity: "fornecedor" | "cliente"): DuplicateCandidate[] {
  const dups: DuplicateCandidate[] = [];
  const threshold = 0.75;
  for (let i = 0; i < items.length && dups.length < 10; i++) {
    for (let j = i + 1; j < items.length && dups.length < 10; j++) {
      const sim = similarity(items[i].name, items[j].name);
      if (sim >= threshold && sim < 1) {
        dups.push({
          id: items[i].id, name: items[i].name,
          matchId: items[j].id, matchName: items[j].name,
          similarity: Math.round(sim * 100) / 100, entity,
        });
      }
    }
  }
  return dups;
}

export const STANDARD_COST_CENTERS = [
  "Comercial", "Produção", "Administrativo", "Financeiro",
  "Marketing", "Estrutura", "Projetos",
];

export const STANDARD_PAYMENT_METHODS = [
  "PIX", "Boleto", "Cartão", "Cartão Antecipado",
  "Transferência", "Financiamento", "Leasing",
];

export const STANDARD_BANK_CATEGORIES = [
  "Conta Operacional", "Conta Reserva", "Conta Impostos", "Conta Investimento",
];

export function useMasterDataLayer() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["master-data-layer", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<MasterDataLayerData> => {
      const [suppRes, clientRes, ccRes, caRes, bankRes, ledgerRes] = await Promise.all([
        supabase.from("suppliers" as any).select("id, name, default_category, default_cost_center").limit(200),
        supabase.from("clients").select("id, name").limit(200),
        supabase.from("fin_cost_centers" as any).select("id, name, active").limit(50),
        supabase.from("fin_chart_accounts" as any).select("id", { count: "exact", head: true }),
        supabase.from("fin_bank_accounts" as any).select("id, bank_name, account_type, active").limit(20),
        // Get recent ledger entries with supplier info for classification suggestions
        (supabase.from("fin_ledger_entries") as any)
          .select("description, chart_account_id")
          .eq("entry_type", "debit")
          .not("chart_account_id", "is", null)
          .limit(500),
      ]);

      const suppliers: any[] = suppRes.data || [];
      const clients: any[] = clientRes.data || [];
      const costCenters: MasterEntitySummary[] = (ccRes.data || []).map((r: any) => ({
        id: r.id, name: r.name, status: r.active ? "ativo" : "inativo",
      }));
      const bankAccounts: MasterEntitySummary[] = (bankRes.data || []).map((r: any) => ({
        id: r.id, name: r.bank_name || "Sem nome",
        category: r.account_type || null, status: r.active ? "ativo" : "inativo",
      }));

      // Duplicate detection
      const supplierDuplicates = findDuplicates(
        suppliers.map((s: any) => ({ id: s.id, name: s.name })),
        "fornecedor"
      );
      const clientDuplicates = findDuplicates(
        clients.map((c: any) => ({ id: c.id, name: c.name })),
        "cliente"
      );

      // Classification suggestions for uncategorized suppliers
      const uncategorized = suppliers.filter((s: any) => !s.default_category);
      const ledgerEntries: any[] = ledgerRes.data || [];

      const classificationSuggestions: ClassificationSuggestion[] = [];
      for (const sup of uncategorized.slice(0, 10)) {
        const related = ledgerEntries.filter((e: any) =>
          e.description && sup.name && e.description.toLowerCase().includes(sup.name.toLowerCase().substring(0, 8))
        );
        if (related.length >= 2) {
          // Find most common category
          const catCount = new Map<string, number>();
          for (const r of related) {
            const cat = r.chart_account_id || "unknown";
            catCount.set(cat, (catCount.get(cat) || 0) + 1);
          }
          const [topCat, topCount] = [...catCount.entries()].sort((a, b) => b[1] - a[1])[0] || ["", 0];
          if (topCount >= 2) {
            classificationSuggestions.push({
              supplierId: sup.id,
              supplierName: sup.name,
              suggestedCategory: topCat,
              confidence: Math.min(95, 50 + topCount * 10),
              basedOn: topCount,
            });
          }
        }
      }

      return {
        stats: {
          totalSuppliers: suppliers.length,
          totalClients: clients.length,
          totalCostCenters: costCenters.length,
          totalChartAccounts: caRes.count || 0,
          totalBankAccounts: bankAccounts.length,
          duplicateCandidates: supplierDuplicates.length + clientDuplicates.length,
          uncategorizedSuppliers: uncategorized.length,
          classificationSuggestions: classificationSuggestions.length,
        },
        supplierDuplicates,
        clientDuplicates,
        classificationSuggestions,
        costCenters,
        bankAccounts,
        paymentMethods: STANDARD_PAYMENT_METHODS,
        bankCategories: STANDARD_BANK_CATEGORIES,
      };
    },
    refetchInterval: 600000,
    staleTime: 300000,
  });
}
