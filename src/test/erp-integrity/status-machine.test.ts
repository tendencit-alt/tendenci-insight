import { describe, it, expect } from "vitest";
import { StatusMachine } from "@/lib/status-machine/engine";
import {
  ORDER_STATUS_CONFIG,
  PAYABLE_STATUS_CONFIG,
  RECEIVABLE_STATUS_CONFIG,
  PRODUCTION_STATUS_CONFIG,
  CONTRACT_STATUS_CONFIG,
  getConfigForEntity,
} from "@/lib/status-machine/config";

// ═══════════════════════════════════════════════════════
// TESTES: STATUS MACHINE - TRANSIÇÕES E BLOQUEIOS
// ═══════════════════════════════════════════════════════

describe("StatusMachine — Fluxo de Pedido (Venda)", () => {
  const machine = new StatusMachine(ORDER_STATUS_CONFIG);

  it("rascunho → aguardando_aprovacao é permitido", () => {
    expect(machine.canTransition("rascunho", "aguardando_aprovacao")).toBe(true);
  });

  it("rascunho → aprovado NÃO é permitido (pula etapa)", () => {
    expect(machine.canTransition("rascunho", "aprovado")).toBe(false);
  });

  it("aprovado → em_execucao é permitido", () => {
    expect(machine.canTransition("aprovado", "em_execucao")).toBe(true);
  });

  it("em_execucao → concluido é permitido", () => {
    expect(machine.canTransition("em_execucao", "concluido")).toBe(true);
  });

  it("concluido bloqueia edição", () => {
    expect(machine.isEditable("concluido")).toBe(false);
  });

  it("cancelado bloqueia edição", () => {
    expect(machine.isEditable("cancelado")).toBe(false);
  });

  it("rascunho permite edição", () => {
    expect(machine.isEditable("rascunho")).toBe(true);
  });

  it("cancelado não tem transições", () => {
    const transitions = machine.getAvailableTransitions("cancelado");
    expect(transitions).toHaveLength(0);
  });

  it("aprovado dispara gerar_financeiro e gerar_producao", () => {
    const events = machine.getEventsForStatus("aprovado");
    expect(events).toContain("gerar_financeiro");
    expect(events).toContain("gerar_producao");
  });

  it("concluido dispara registrar_auditoria e atualizar_indicadores", () => {
    const events = machine.getEventsForStatus("concluido");
    expect(events).toContain("registrar_auditoria");
    expect(events).toContain("atualizar_indicadores");
  });

  it("createTransition retorna null para transição inválida", () => {
    const t = machine.createTransition("cancelado", "rascunho", "user-123");
    expect(t).toBeNull();
  });

  it("createTransition retorna objeto completo para transição válida", () => {
    const t = machine.createTransition("rascunho", "aguardando_aprovacao", "user-123", "Admin", "Solicitação");
    expect(t).not.toBeNull();
    expect(t!.from).toBe("rascunho");
    expect(t!.to).toBe("aguardando_aprovacao");
    expect(t!.userId).toBe("user-123");
    expect(t!.reason).toBe("Solicitação");
    expect(t!.timestamp).toBeDefined();
  });
});

describe("StatusMachine — Contas a Pagar", () => {
  const machine = new StatusMachine(PAYABLE_STATUS_CONFIG);

  it("fluxo completo: provisionado → aprovação → confirmado → a vencer → pago → conciliado", () => {
    expect(machine.canTransition("rascunho", "aguardando_aprovacao")).toBe(true);
    expect(machine.canTransition("aguardando_aprovacao", "aprovado")).toBe(true);
    expect(machine.canTransition("aprovado", "em_execucao")).toBe(true);
    expect(machine.canTransition("em_execucao", "concluido")).toBe(true);
    expect(machine.canTransition("concluido", "arquivado")).toBe(true);
  });

  it("pago (concluido) bloqueia edição", () => {
    expect(machine.isEditable("concluido")).toBe(false);
  });

  it("conciliado (arquivado) bloqueia edição", () => {
    expect(machine.isEditable("arquivado")).toBe(false);
  });

  it("labels financeiros corretos", () => {
    expect(machine.getStatus("rascunho")?.label).toBe("Provisionado");
    expect(machine.getStatus("concluido")?.label).toBe("Pago");
    expect(machine.getStatus("arquivado")?.label).toBe("Conciliado");
  });
});

describe("StatusMachine — Contas a Receber", () => {
  const machine = new StatusMachine(RECEIVABLE_STATUS_CONFIG);

  it("fluxo completo: provisionado → confirmado → a receber → recebido → conciliado", () => {
    expect(machine.canTransition("rascunho", "aguardando_aprovacao")).toBe(true);
    expect(machine.canTransition("aguardando_aprovacao", "aprovado")).toBe(true);
    expect(machine.canTransition("aprovado", "em_execucao")).toBe(true);
    expect(machine.canTransition("em_execucao", "concluido")).toBe(true);
    expect(machine.canTransition("concluido", "arquivado")).toBe(true);
  });

  it("labels financeiros corretos", () => {
    expect(machine.getStatus("rascunho")?.label).toBe("Provisionado");
    expect(machine.getStatus("concluido")?.label).toBe("Recebido");
    expect(machine.getStatus("arquivado")?.label).toBe("Conciliado");
  });
});

describe("StatusMachine — Produção", () => {
  const machine = new StatusMachine(PRODUCTION_STATUS_CONFIG);

  it("em_execucao é rotulado como 'Em Produção'", () => {
    expect(machine.getStatus("em_execucao")?.label).toBe("Em Produção");
  });

  it("concluido é rotulado como 'Produção Concluída'", () => {
    expect(machine.getStatus("concluido")?.label).toBe("Produção Concluída");
  });
});

describe("StatusMachine — Contratos Recorrentes", () => {
  const machine = new StatusMachine(CONTRACT_STATUS_CONFIG);

  it("em_execucao é rotulado como 'Vigente'", () => {
    expect(machine.getStatus("em_execucao")?.label).toBe("Vigente");
  });

  it("contrato vigente pode ser encerrado", () => {
    expect(machine.canTransition("em_execucao", "concluido")).toBe(true);
  });
});

describe("StatusMachine — Auto-Aprovação", () => {
  const machine = new StatusMachine({
    ...ORDER_STATUS_CONFIG,
    autoApprovalRules: [
      { field: "value", operator: "lt", value: 1000, targetStatus: "aprovado" },
      { field: "category", operator: "eq", value: "recorrente", targetStatus: "aprovado" },
      { field: "value", operator: "gte", value: 50000, targetStatus: "aguardando_aprovacao" },
    ],
  });

  it("valor < 1000 → auto-aprovado", () => {
    expect(machine.evaluateAutoApproval({ value: 500 })).toBe("aprovado");
  });

  it("valor >= 50000 → aguardando_aprovacao", () => {
    expect(machine.evaluateAutoApproval({ value: 75000 })).toBe("aguardando_aprovacao");
  });

  it("categoria recorrente → auto-aprovado", () => {
    expect(machine.evaluateAutoApproval({ value: 5000, category: "recorrente" })).toBe("aprovado");
  });

  it("nenhuma regra atende → null", () => {
    expect(machine.evaluateAutoApproval({ value: 2000 })).toBeNull();
  });
});

describe("StatusMachine — getConfigForEntity", () => {
  it("retorna config correta para cada entidade", () => {
    expect(getConfigForEntity("orders").entityType).toBe("orders");
    expect(getConfigForEntity("fin_payables").entityType).toBe("fin_payables");
    expect(getConfigForEntity("fin_receivables").entityType).toBe("fin_receivables");
    expect(getConfigForEntity("production_orders").entityType).toBe("production_orders");
    expect(getConfigForEntity("contracts").entityType).toBe("contracts");
    expect(getConfigForEntity("erp_tasks").entityType).toBe("erp_tasks");
  });

  it("entidade desconhecida retorna config padrão", () => {
    const config = getConfigForEntity("unknown_entity");
    expect(config.entityType).toBe("unknown_entity");
    expect(config.statuses.length).toBeGreaterThan(0);
  });
});
