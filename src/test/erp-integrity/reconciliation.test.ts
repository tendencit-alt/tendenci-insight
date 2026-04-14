import { describe, it, expect } from "vitest";

// ═══════════════════════════════════════════════════════
// TESTES: MOTOR DE CONCILIAÇÃO INTELIGENTE
// Valida o algoritmo de matching usado no smart-reconcile
// ═══════════════════════════════════════════════════════

function normalize(s: string): string {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "").trim();
}

function similarity(a: string, b: string): number {
  const na = normalize(a), nb = normalize(b);
  if (na === nb) return 100;
  const wordsA = new Set(na.split(/\s+/));
  const wordsB = new Set(nb.split(/\s+/));
  const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;
  return union > 0 ? Math.round((intersection / union) * 100) : 0;
}

describe("Normalização de Texto", () => {
  it("remove acentos", () => {
    expect(normalize("Pagamento à vista")).toBe("pagamento a vista");
  });

  it("converte para minúsculo", () => {
    expect(normalize("ALUGUEL ESCRITORIO")).toBe("aluguel escritorio");
  });

  it("remove caracteres especiais", () => {
    expect(normalize("Nota Fiscal #12345")).toBe("nota fiscal 12345");
  });

  it("trata string vazia", () => {
    expect(normalize("")).toBe("");
  });

  it("trata null/undefined", () => {
    expect(normalize(null as any)).toBe("");
  });
});

describe("Similaridade de Texto (Jaccard)", () => {
  it("textos idênticos = 100", () => {
    expect(similarity("Pagamento aluguel", "Pagamento aluguel")).toBe(100);
  });

  it("textos idênticos (case diferente) = 100", () => {
    expect(similarity("PAGAMENTO ALUGUEL", "pagamento aluguel")).toBe(100);
  });

  it("50% palavras em comum", () => {
    // "pagamento aluguel" vs "pagamento energia"
    // intersecção: {pagamento} = 1, união: {pagamento, aluguel, energia} = 3
    expect(similarity("Pagamento aluguel", "Pagamento energia")).toBe(33);
  });

  it("nenhuma palavra em comum = 0", () => {
    expect(similarity("energia eletrica", "salario funcionario")).toBe(0);
  });

  it("textos vazios = 0", () => {
    expect(similarity("", "")).toBe(0);
  });
});

describe("Matching de Transações Bancárias", () => {
  interface Transaction {
    amount: number;
    date: string;
    memo: string;
    direction: "IN" | "OUT";
  }

  interface InternalEntry {
    amount: number;
    due_date: string;
    description: string;
    type: "RECEITA" | "DESPESA";
  }

  function calculateMatchScore(tx: Transaction, entry: InternalEntry): {
    score: number;
    amountScore: number;
    dateScore: number;
    descScore: number;
    typeScore: number;
  } {
    const txAmt = Math.abs(tx.amount);
    const entAmt = Math.abs(entry.amount);
    
    // Amount
    let amountScore = 0;
    if (Math.abs(txAmt - entAmt) < 0.01) amountScore = 40;
    else if (entAmt > 0 && Math.abs(txAmt - entAmt) / entAmt < 0.05) amountScore = 25;

    // Date
    const daysDiff = Math.abs(new Date(tx.date).getTime() - new Date(entry.due_date).getTime()) / 86400000;
    let dateScore = 0;
    if (daysDiff === 0) dateScore = 30;
    else if (daysDiff <= 3) dateScore = 20;
    else if (daysDiff <= 7) dateScore = 10;

    // Description
    const descScore = similarity(tx.memo, entry.description) > 50 ? 20 : 0;

    // Type
    const typeMatch = (tx.direction === "OUT" && entry.type === "DESPESA") ||
                      (tx.direction === "IN" && entry.type === "RECEITA");
    const typeScore = typeMatch ? 10 : 0;

    return {
      score: amountScore + dateScore + descScore + typeScore,
      amountScore,
      dateScore,
      descScore,
      typeScore,
    };
  }

  it("match perfeito (valor+data+tipo+desc) = score 100", () => {
    const tx: Transaction = { amount: -5000, date: "2026-04-10", memo: "Aluguel escritorio", direction: "OUT" };
    const entry: InternalEntry = { amount: 5000, due_date: "2026-04-10", description: "Aluguel escritório", type: "DESPESA" };
    const result = calculateMatchScore(tx, entry);
    expect(result.score).toBe(100);
    expect(result.amountScore).toBe(40);
    expect(result.dateScore).toBe(30);
    expect(result.descScore).toBe(20);
    expect(result.typeScore).toBe(10);
  });

  it("score >= 90 → auto-conciliar", () => {
    const tx: Transaction = { amount: -5000, date: "2026-04-10", memo: "Aluguel escritorio", direction: "OUT" };
    const entry: InternalEntry = { amount: 5000, due_date: "2026-04-10", description: "Aluguel escritório", type: "DESPESA" };
    const { score } = calculateMatchScore(tx, entry);
    expect(score >= 90).toBe(true);
  });

  it("score 70-89 → sugerido", () => {
    const tx: Transaction = { amount: -5000, date: "2026-04-10", memo: "Pagamento fornecedor", direction: "OUT" };
    const entry: InternalEntry = { amount: 5000, due_date: "2026-04-10", description: "Fornecedor ABC", type: "DESPESA" };
    const { score } = calculateMatchScore(tx, entry);
    expect(score >= 70 && score < 90).toBe(true);
  });

  it("score < 70 → pendente", () => {
    const tx: Transaction = { amount: -5000, date: "2026-04-10", memo: "TED 123", direction: "OUT" };
    const entry: InternalEntry = { amount: 4800, due_date: "2026-04-15", description: "Material construção", type: "DESPESA" };
    const { score } = calculateMatchScore(tx, entry);
    expect(score < 70).toBe(true);
  });

  it("direção oposta não pontua tipo", () => {
    const tx: Transaction = { amount: 5000, date: "2026-04-10", memo: "Recebimento", direction: "IN" };
    const entry: InternalEntry = { amount: 5000, due_date: "2026-04-10", description: "Recebimento", type: "DESPESA" };
    const { typeScore } = calculateMatchScore(tx, entry);
    expect(typeScore).toBe(0);
  });

  it("tolerância de 5% no valor gera score parcial", () => {
    const tx: Transaction = { amount: -10000, date: "2026-04-10", memo: "Pagamento", direction: "OUT" };
    const entry: InternalEntry = { amount: 10400, due_date: "2026-04-10", description: "Pagamento", type: "DESPESA" };
    const { amountScore } = calculateMatchScore(tx, entry);
    expect(amountScore).toBe(25); // Dentro de 5%
  });
});

describe("Detecção de Duplicidade", () => {
  interface BankTx {
    id: string;
    bank_account_id: string;
    bank_transaction_id: string;
    amount: number;
    date: string;
  }

  function isDuplicate(tx: BankTx, existingTxs: BankTx[]): boolean {
    return existingTxs.some(
      (e) =>
        e.id !== tx.id &&
        e.bank_account_id === tx.bank_account_id &&
        e.bank_transaction_id === tx.bank_transaction_id
    );
  }

  it("detecta duplicata por bank_transaction_id + bank_account_id", () => {
    const existing: BankTx[] = [
      { id: "tx-1", bank_account_id: "acc-1", bank_transaction_id: "bt-100", amount: 5000, date: "2026-04-01" },
    ];
    const newTx: BankTx = { id: "tx-2", bank_account_id: "acc-1", bank_transaction_id: "bt-100", amount: 5000, date: "2026-04-01" };
    expect(isDuplicate(newTx, existing)).toBe(true);
  });

  it("mesma transação em conta diferente NÃO é duplicata", () => {
    const existing: BankTx[] = [
      { id: "tx-1", bank_account_id: "acc-1", bank_transaction_id: "bt-100", amount: 5000, date: "2026-04-01" },
    ];
    const newTx: BankTx = { id: "tx-2", bank_account_id: "acc-2", bank_transaction_id: "bt-100", amount: 5000, date: "2026-04-01" };
    expect(isDuplicate(newTx, existing)).toBe(false);
  });

  it("não marca a si mesmo como duplicata", () => {
    const existing: BankTx[] = [
      { id: "tx-1", bank_account_id: "acc-1", bank_transaction_id: "bt-100", amount: 5000, date: "2026-04-01" },
    ];
    expect(isDuplicate(existing[0], existing)).toBe(false);
  });
});
