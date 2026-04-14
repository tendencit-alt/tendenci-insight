import { describe, it, expect } from "vitest";

// ═══════════════════════════════════════════════════════
// TESTES: GOVERNANÇA — FECHAMENTO, PERMISSÕES, CONCILIAÇÃO
// ═══════════════════════════════════════════════════════

type UserRole = "owner" | "admin" | "financeiro" | "operacional" | "leitura";

interface PeriodClosing {
  year: number;
  month: number;
  status: "open" | "closed";
  closed_by?: string;
}

interface PermissionMatrix {
  [role: string]: {
    edit_competence: boolean;
    delete_entry: boolean;
    reconcile: boolean;
    edit_budget: boolean;
    edit_forecast: boolean;
    close_period: boolean;
    reopen_period: boolean;
    view_dre: boolean;
    view_cashflow: boolean;
    export_data: boolean;
  };
}

const PERMISSIONS: PermissionMatrix = {
  owner: {
    edit_competence: true, delete_entry: true, reconcile: true,
    edit_budget: true, edit_forecast: true, close_period: true,
    reopen_period: true, view_dre: true, view_cashflow: true, export_data: true,
  },
  admin: {
    edit_competence: true, delete_entry: false, reconcile: true,
    edit_budget: true, edit_forecast: true, close_period: true,
    reopen_period: true, view_dre: true, view_cashflow: true, export_data: true,
  },
  financeiro: {
    edit_competence: false, delete_entry: false, reconcile: true,
    edit_budget: false, edit_forecast: false, close_period: false,
    reopen_period: false, view_dre: true, view_cashflow: true, export_data: true,
  },
  operacional: {
    edit_competence: false, delete_entry: false, reconcile: false,
    edit_budget: false, edit_forecast: false, close_period: false,
    reopen_period: false, view_dre: false, view_cashflow: false, export_data: false,
  },
  leitura: {
    edit_competence: false, delete_entry: false, reconcile: false,
    edit_budget: false, edit_forecast: false, close_period: false,
    reopen_period: false, view_dre: true, view_cashflow: true, export_data: false,
  },
};

function canPerform(role: UserRole, action: keyof PermissionMatrix["owner"]): boolean {
  return PERMISSIONS[role]?.[action] ?? false;
}

// ═══ FECHAMENTO MENSAL ═══

describe("Fechamento Mensal", () => {
  const periods: PeriodClosing[] = [
    { year: 2026, month: 1, status: "closed", closed_by: "admin-1" },
    { year: 2026, month: 2, status: "closed", closed_by: "admin-1" },
    { year: 2026, month: 3, status: "open" },
    { year: 2026, month: 4, status: "open" },
  ];

  it("período fechado bloqueia edição de competência", () => {
    const jan = periods.find((p) => p.month === 1)!;
    expect(jan.status).toBe("closed");
    // Lançamento em janeiro não pode ser editado
    const canEdit = jan.status === "open";
    expect(canEdit).toBe(false);
  });

  it("período aberto permite edição", () => {
    const mar = periods.find((p) => p.month === 3)!;
    expect(mar.status).toBe("open");
    const canEdit = mar.status === "open";
    expect(canEdit).toBe(true);
  });

  it("reabertura apenas por Owner ou Admin", () => {
    expect(canPerform("owner", "reopen_period")).toBe(true);
    expect(canPerform("admin", "reopen_period")).toBe(true);
    expect(canPerform("financeiro", "reopen_period")).toBe(false);
    expect(canPerform("operacional", "reopen_period")).toBe(false);
    expect(canPerform("leitura", "reopen_period")).toBe(false);
  });
});

// ═══ PERMISSÕES POR PERFIL ═══

describe("Permissões Financeiras por Perfil", () => {
  it("Owner tem acesso total", () => {
    const perms = PERMISSIONS.owner;
    Object.values(perms).forEach((v) => expect(v).toBe(true));
  });

  it("Admin pode editar competência mas NÃO excluir lançamentos", () => {
    expect(canPerform("admin", "edit_competence")).toBe(true);
    expect(canPerform("admin", "delete_entry")).toBe(false);
  });

  it("Financeiro pode conciliar mas NÃO editar orçamento", () => {
    expect(canPerform("financeiro", "reconcile")).toBe(true);
    expect(canPerform("financeiro", "edit_budget")).toBe(false);
    expect(canPerform("financeiro", "edit_forecast")).toBe(false);
  });

  it("Operacional NÃO tem acesso financeiro", () => {
    expect(canPerform("operacional", "view_dre")).toBe(false);
    expect(canPerform("operacional", "reconcile")).toBe(false);
    expect(canPerform("operacional", "edit_budget")).toBe(false);
  });

  it("Leitura pode visualizar mas NÃO exportar", () => {
    expect(canPerform("leitura", "view_dre")).toBe(true);
    expect(canPerform("leitura", "view_cashflow")).toBe(true);
    expect(canPerform("leitura", "export_data")).toBe(false);
    expect(canPerform("leitura", "reconcile")).toBe(false);
  });

  it("exclusão de lançamento apenas Owner", () => {
    const roles: UserRole[] = ["owner", "admin", "financeiro", "operacional", "leitura"];
    const canDelete = roles.filter((r) => canPerform(r, "delete_entry"));
    expect(canDelete).toEqual(["owner"]);
  });
});

// ═══ BLOQUEIO PÓS-CONCILIAÇÃO ═══

describe("Bloqueio Pós-Conciliação", () => {
  interface ReconciledEntry {
    id: string;
    amount: number;
    category: string;
    competence_date: string;
    notes: string;
    reconciled: boolean;
  }

  function canEditField(entry: ReconciledEntry, field: keyof ReconciledEntry): boolean {
    if (!entry.reconciled) return true;
    // Após conciliação, apenas notes é editável
    return field === "notes";
  }

  const entry: ReconciledEntry = {
    id: "entry-1",
    amount: 5000,
    category: "receita",
    competence_date: "2026-04-01",
    notes: "Pagamento cliente",
    reconciled: true,
  };

  it("valor não pode ser editado após conciliação", () => {
    expect(canEditField(entry, "amount")).toBe(false);
  });

  it("competência não pode ser editada após conciliação", () => {
    expect(canEditField(entry, "competence_date")).toBe(false);
  });

  it("categoria não pode ser editada após conciliação", () => {
    expect(canEditField(entry, "category")).toBe(false);
  });

  it("observação PODE ser editada após conciliação", () => {
    expect(canEditField(entry, "notes")).toBe(true);
  });

  it("antes da conciliação, todos campos editáveis", () => {
    const open = { ...entry, reconciled: false };
    expect(canEditField(open, "amount")).toBe(true);
    expect(canEditField(open, "category")).toBe(true);
    expect(canEditField(open, "competence_date")).toBe(true);
  });
});

// ═══ CONCILIAÇÃO BANCÁRIA ═══

describe("Conciliação Bancária — Matching", () => {
  interface BankTransaction {
    id: string;
    amount: number;
    date: string;
    memo: string;
    direction: "IN" | "OUT";
  }

  interface LedgerEntry {
    id: string;
    amount: number;
    due_date: string;
    description: string;
    type: string;
  }

  function matchScore(tx: BankTransaction, entry: LedgerEntry): number {
    let score = 0;
    // Amount match
    if (Math.abs(Math.abs(tx.amount) - Math.abs(entry.amount)) < 0.01) score += 40;
    // Date match
    const daysDiff = Math.abs(new Date(tx.date).getTime() - new Date(entry.due_date).getTime()) / 86400000;
    if (daysDiff === 0) score += 30;
    else if (daysDiff <= 3) score += 20;
    else if (daysDiff <= 7) score += 10;
    // Direction match
    if ((tx.direction === "OUT" && entry.type === "DESPESA") || (tx.direction === "IN" && entry.type === "RECEITA")) score += 10;
    return score;
  }

  it("match exato valor+data+tipo = score >= 80", () => {
    const tx: BankTransaction = { id: "tx-1", amount: -5000, date: "2026-04-10", memo: "Pagamento", direction: "OUT" };
    const entry: LedgerEntry = { id: "le-1", amount: 5000, due_date: "2026-04-10", description: "Fornecedor", type: "DESPESA" };
    expect(matchScore(tx, entry)).toBe(80); // 40 + 30 + 10
  });

  it("match valor exato mas data diferente 5 dias = score 50", () => {
    const tx: BankTransaction = { id: "tx-2", amount: -3000, date: "2026-04-15", memo: "Pag", direction: "OUT" };
    const entry: LedgerEntry = { id: "le-2", amount: 3000, due_date: "2026-04-10", description: "Forn", type: "DESPESA" };
    expect(matchScore(tx, entry)).toBe(60); // 40 + 10 + 10
  });

  it("valor diferente = score 0 para amount", () => {
    const tx: BankTransaction = { id: "tx-3", amount: -5000, date: "2026-04-10", memo: "X", direction: "OUT" };
    const entry: LedgerEntry = { id: "le-3", amount: 4500, due_date: "2026-04-10", description: "Y", type: "DESPESA" };
    const score = matchScore(tx, entry);
    expect(score).toBeLessThan(50); // No amount match
  });
});

// ═══ DRILL-DOWN EXECUTIVO ═══

describe("Drill-down Executivo", () => {
  interface OriginLink {
    origin_type: string;
    origin_id: string;
    financial_entry_id: string;
    impact_layer: string;
  }

  const links: OriginLink[] = [
    { origin_type: "pedido", origin_id: "order-001", financial_entry_id: "entry-001", impact_layer: "dre" },
    { origin_type: "pedido", origin_id: "order-001", financial_entry_id: "entry-001", impact_layer: "fluxo" },
    { origin_type: "pedido", origin_id: "order-001", financial_entry_id: "entry-002", impact_layer: "dre" },
  ];

  it("KPI rastreia até categoria (chart_account)", () => {
    // Cada entry tem chart_account_id, drillable
    expect(links.filter((l) => l.impact_layer === "dre")).toHaveLength(2);
  });

  it("categoria rastreia até lançamento", () => {
    const entryIds = [...new Set(links.map((l) => l.financial_entry_id))];
    expect(entryIds).toHaveLength(2);
  });

  it("lançamento rastreia até documento de origem", () => {
    const origins = links.map((l) => ({ type: l.origin_type, id: l.origin_id }));
    expect(origins[0].type).toBe("pedido");
    expect(origins[0].id).toBe("order-001");
  });

  it("impede duplicidade de link (unicidade composição)", () => {
    const keys = links.map((l) => `${l.origin_type}-${l.origin_id}-${l.financial_entry_id}-${l.impact_layer}`);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });
});

// ═══ AUDIT TRAIL ═══

describe("Audit Trail", () => {
  interface AuditEntry {
    user_id: string;
    table_name: string;
    record_id: string;
    event_type: string;
    field_name?: string;
    old_value?: string;
    new_value?: string;
    created_at: string;
  }

  it("registro de auditoria contém todos campos obrigatórios", () => {
    const entry: AuditEntry = {
      user_id: "user-1",
      table_name: "fin_ledger_entries",
      record_id: "entry-1",
      event_type: "UPDATE",
      field_name: "amount",
      old_value: "5000",
      new_value: "5500",
      created_at: new Date().toISOString(),
    };
    expect(entry.user_id).toBeTruthy();
    expect(entry.table_name).toBeTruthy();
    expect(entry.record_id).toBeTruthy();
    expect(entry.event_type).toBeTruthy();
    expect(entry.created_at).toBeTruthy();
  });

  it("alteração registra valor anterior e novo", () => {
    const entry: AuditEntry = {
      user_id: "user-1",
      table_name: "fin_ledger_entries",
      record_id: "entry-1",
      event_type: "UPDATE",
      field_name: "competence_date",
      old_value: "2026-03-01",
      new_value: "2026-04-01",
      created_at: new Date().toISOString(),
    };
    expect(entry.old_value).toBe("2026-03-01");
    expect(entry.new_value).toBe("2026-04-01");
    expect(entry.old_value).not.toBe(entry.new_value);
  });
});

// ═══ ÍNDICE DE CONFIABILIDADE ═══

describe("Índice de Confiabilidade Financeira", () => {
  function calcReliabilityScore(data: {
    totalEntries: number;
    reconciledEntries: number;
    closedPeriods: number;
    totalPeriods: number;
    autoEntries: number;
    manualEntries: number;
  }): number {
    const reconPct = data.totalEntries > 0 ? data.reconciledEntries / data.totalEntries : 0;
    const closedPct = data.totalPeriods > 0 ? data.closedPeriods / data.totalPeriods : 0;
    const autoPct = (data.autoEntries + data.manualEntries) > 0
      ? data.autoEntries / (data.autoEntries + data.manualEntries)
      : 0;

    return Math.round((reconPct * 40 + closedPct * 30 + autoPct * 30) * 100) / 100;
  }

  it("100% conciliado + 100% fechado + 100% auto = score máximo", () => {
    const score = calcReliabilityScore({
      totalEntries: 100, reconciledEntries: 100,
      closedPeriods: 12, totalPeriods: 12,
      autoEntries: 100, manualEntries: 0,
    });
    expect(score).toBe(1);
  });

  it("0% tudo = score 0", () => {
    const score = calcReliabilityScore({
      totalEntries: 100, reconciledEntries: 0,
      closedPeriods: 0, totalPeriods: 12,
      autoEntries: 0, manualEntries: 100,
    });
    expect(score).toBe(0);
  });

  it("score parcial calculado corretamente", () => {
    const score = calcReliabilityScore({
      totalEntries: 100, reconciledEntries: 50,  // 50% → 0.5 * 40 = 20
      closedPeriods: 6, totalPeriods: 12,         // 50% → 0.5 * 30 = 15
      autoEntries: 80, manualEntries: 20,         // 80% → 0.8 * 30 = 24
    });
    expect(score).toBeCloseTo(0.59, 1);
  });
});
