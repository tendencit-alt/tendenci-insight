// ══════════════════════════════════════════════════════════════════════
// DECOMPOSIÇÃO TÉCNICA — SPRINT 5: FINANCEIRO OPERACIONAL
// Detalhamento bloco-a-bloco com status, gaps e dependências
// ══════════════════════════════════════════════════════════════════════

import type { DecompositionBlock, DecompositionItem, SprintDecomposition } from "./sprint1-decomposition";

// ══════════════════════════════════════════════════════════════════════
// BLOCO 1 — CONTAS A RECEBER
// ══════════════════════════════════════════════════════════════════════

const BLOCK_1: DecompositionBlock = {
  id: "s5-b1-receivables",
  number: 1,
  name: "Contas a Receber",
  objective: "CRUD completo com status layering, parcelamento e integração com pedidos",
  status: "done",
  doneWhen: [
    "fin_receivables com cliente, pedido, categoria, centro custo, projeto, valor, vencimento, competência",
    "Status: PROVISIONADO → CONFIRMADO → A_VENCER/VENCIDO → RECEBIDO → CONCILIADO → CANCELADO",
    "Formulário de criação com todos os campos",
    "Dialog de recebimento com data, valor, conta bancária",
    "Integração automática com Livro Razão (ledger_entry_id)",
    "Listagem com filtros, busca e ações por linha",
    "KPIs: total a receber, vencidos, recebidos no período",
  ],
  items: [
    {
      id: "s5-b1-01",
      name: "Tabela fin_receivables",
      status: "done",
      existing: [
        "fin_receivables com amount, due_date, competence_date, customer_id, order_id, deal_id",
        "chart_account_id, cost_center_id, project_id, bank_account_id",
        "status, installment, total_installments, ledger_entry_id",
        "receipt_date, received_amount, reconciled, conciliado_em/por",
        "cancelado_em/por, motivo_cancelamento, origem, document_number",
        "tenant_id, created_by, RLS",
      ],
      gaps: [],
      files: [],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
    {
      id: "s5-b1-02",
      name: "CRUD de Contas a Receber",
      status: "done",
      existing: [
        "CreateReceivableDialog com cliente, valor, vencimento, competência, parcelas",
        "ReceivablesTab com listagem completa, filtros por status, busca",
        "ReceivePaymentDialog para registrar recebimento",
        "ViewEditReceivableDialog para edição",
        "PayablesReceivablesTab como container unificado",
        "KPIs de recebíveis na aba",
        "Ações: receber, editar, cancelar, estornar",
        "Sincronização bidirecional com Livro Razão",
      ],
      gaps: [],
      files: [
        "src/components/financeiro/CreateReceivableDialog.tsx",
        "src/components/financeiro/ReceivablesTab.tsx",
        "src/components/financeiro/ReceivePaymentDialog.tsx",
        "src/components/financeiro/ViewEditReceivableDialog.tsx",
      ],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 2 — CONTAS A PAGAR
// ══════════════════════════════════════════════════════════════════════

const BLOCK_2: DecompositionBlock = {
  id: "s5-b2-payables",
  number: 2,
  name: "Contas a Pagar",
  objective: "CRUD completo com status layering, parcelamento e integração com pedidos/compras",
  status: "done",
  doneWhen: [
    "fin_payables com fornecedor, pedido, categoria, centro custo, projeto, valor, vencimento",
    "Status: PROVISIONADO → CONFIRMADO → A_VENCER/VENCIDO → PAGO → CONCILIADO → CANCELADO",
    "Formulário de criação com todos os campos",
    "Dialog de pagamento com data, valor, conta bancária",
    "Integração automática com Livro Razão",
    "Listagem com filtros e ações",
    "KPIs: total a pagar, vencidos, pagos",
  ],
  items: [
    {
      id: "s5-b2-01",
      name: "Tabela fin_payables",
      status: "done",
      existing: [
        "fin_payables com amount, due_date, competence_date, supplier_id, order_id",
        "chart_account_id, cost_center_id, project_id, bank_account_id",
        "status, installment, total_installments, ledger_entry_id",
        "payment_date, paid_amount, reconciled, conciliado_em/por",
        "cancelado_em/por, motivo_cancelamento, origem, document_number",
        "tenant_id, created_by, RLS",
      ],
      gaps: [],
      files: [],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
    {
      id: "s5-b2-02",
      name: "CRUD de Contas a Pagar",
      status: "done",
      existing: [
        "CreatePayableDialog com fornecedor, valor, vencimento, competência, parcelas",
        "PayablesTab com listagem completa, filtros por status, busca",
        "PayPayableDialog para registrar pagamento",
        "ViewEditPayableDialog para edição",
        "QuickCreateSupplierDialog para criar fornecedor inline",
        "Ações: pagar, editar, cancelar, estornar",
        "Sincronização bidirecional com Livro Razão",
        "Auto-geração a partir de pedidos via triggers",
      ],
      gaps: [],
      files: [
        "src/components/financeiro/CreatePayableDialog.tsx",
        "src/components/financeiro/PayablesTab.tsx",
        "src/components/financeiro/PayPayableDialog.tsx",
        "src/components/financeiro/ViewEditPayableDialog.tsx",
      ],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 3 — PARCELAMENTO AUTOMÁTICO
// ══════════════════════════════════════════════════════════════════════

const BLOCK_3: DecompositionBlock = {
  id: "s5-b3-installments",
  number: 3,
  name: "Parcelamento Automático",
  objective: "Geração automática de parcelas a partir de valor total e condição de pagamento",
  status: "done",
  doneWhen: [
    "Campo 'parcelas' nos diálogos de criação de pagar/receber",
    "Geração automática de N parcelas com datas sequenciais",
    "installment e total_installments registrados",
    "Descrição inclui '(parcela X/N)'",
    "Cada parcela gera lançamento individual no Livro Razão",
    "Triggers de pedido geram parcelas automaticamente",
  ],
  items: [
    {
      id: "s5-b3-01",
      name: "Engine de parcelamento",
      status: "done",
      existing: [
        "CreateReceivableDialog com campo de parcelas (1-48)",
        "CreatePayableDialog com campo de parcelas (1-48)",
        "Loop de criação gera N registros com installment/total_installments",
        "Datas de vencimento incrementadas automaticamente (30 em 30 dias)",
        "Trigger de pedido gera parcelas baseado em forma de pagamento",
        "Descrição enriquecida: '{desc} (Parcela X/N)'",
        "Cada parcela vinculada ao respectivo ledger_entry",
      ],
      gaps: [],
      files: [
        "src/components/financeiro/CreateReceivableDialog.tsx",
        "src/components/financeiro/CreatePayableDialog.tsx",
      ],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 4 — MOVIMENTOS BANCÁRIOS / LIVRO RAZÃO
// ══════════════════════════════════════════════════════════════════════

const BLOCK_4: DecompositionBlock = {
  id: "s5-b4-ledger",
  number: 4,
  name: "Movimentos Bancários / Livro Razão",
  objective: "Livro Razão como fonte única de verdade com entrada, saída e classificação",
  status: "done",
  doneWhen: [
    "fin_ledger_entries como fonte única de verdade",
    "Campos: amount, competence_date, cash_date, chart_account_id, cost_center_id, project_id",
    "Classificação: manual, automática e sugerida via IA",
    "Status: ABERTO → PAGO_RECEBIDO → CANCELADO",
    "Listagem com filtro dual-date (cash_date + competence_date)",
    "CRUD completo com detalhes e auditoria",
    "Rateio por centro de custo (fin_ledger_splits)",
  ],
  items: [
    {
      id: "s5-b4-01",
      name: "Livro Razão completo",
      status: "done",
      existing: [
        "fin_ledger_entries com ~40 campos incluindo: amount, competence_date, cash_date",
        "chart_account_id, cost_center_id, project_id, bank_account_id, order_id",
        "party_id, party_type, client_id, payment_method",
        "classification_status, classification_score, classification_source, classification_rule_id",
        "has_splits, reversal_of_id, parent_entry_id, loan_contract_id",
        "recurrence_type, recurrence_count, recurrence_end_date, is_recurring",
        "juros_atraso, installment_number, origem",
        "LedgerTab com listagem completa e filtro dual-date",
        "LedgerReconciliationTab com visão de conciliação",
        "CreateLedgerEntryDialog para criação manual",
        "EntryDetailsDialog para detalhes",
        "LedgerAuditSheet para auditoria",
        "SplitEntryDialog para rateio",
        "CostCenterApportionmentPanel para distribuição por CC",
        "ClassificationSuggestionPanel e Badge para classificação IA",
        "OrphanEntriesAlert para entradas sem classificação",
        "fin_ledger_splits para rateio detalhado",
      ],
      gaps: [],
      files: [
        "src/components/financeiro/LedgerTab.tsx",
        "src/components/financeiro/LedgerReconciliationTab.tsx",
        "src/components/financeiro/CreateLedgerEntryDialog.tsx",
        "src/components/financeiro/EntryDetailsDialog.tsx",
        "src/components/financeiro/LedgerAuditSheet.tsx",
      ],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 5 — CONCILIAÇÃO BANCÁRIA
// ══════════════════════════════════════════════════════════════════════

const BLOCK_5: DecompositionBlock = {
  id: "s5-b5-reconciliation",
  number: 5,
  name: "Conciliação Bancária",
  objective: "Importação OFX, match automático e conciliação manual/automática",
  status: "done",
  doneWhen: [
    "fin_bank_transactions com importação OFX",
    "fin_reconciliation_links vinculando transação bancária a lançamento",
    "Status: PENDENTE → SUGERIDA → CONCILIADA → IGNORADA → DIVERGENTE",
    "Match automático por valor/data/conta",
    "Match provável por similaridade (score)",
    "Conciliação manual via dialog",
    "KPIs: total importadas, pendentes, conciliadas, %",
    "Edge Function smart-reconcile para processamento",
    "Detecção de duplicidade (is_duplicate, duplicate_of_id)",
  ],
  items: [
    {
      id: "s5-b5-01",
      name: "Importação OFX e transações bancárias",
      status: "done",
      existing: [
        "fin_bank_transactions com ~25 campos incluindo: amount, date, direction, bank_memo",
        "bank_transaction_id, bank_account_id, status, balance_after",
        "classification_status, classification_score, classification_reason",
        "suggested_chart_account_id, suggested_cost_center_id, suggested_project_id",
        "is_duplicate, duplicate_of_id, file_hash, import_batch_id, raw_data",
        "reconciliation_method, reconciliation_score",
        "OFXImportDialog para upload de arquivos OFX",
        "ReconciliationTab com listagem, KPIs e ações",
        "ReconcileDialog para conciliação manual",
      ],
      gaps: [],
      files: [
        "src/components/financeiro/OFXImportDialog.tsx",
        "src/components/financeiro/ReconciliationTab.tsx",
        "src/components/financeiro/ReconcileDialog.tsx",
      ],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
    {
      id: "s5-b5-02",
      name: "Smart Reconciliation Engine",
      status: "done",
      existing: [
        "Edge Function smart-reconcile com lógica de match",
        "Edge Function classify-entry para classificação automática",
        "fin_reconciliation_links com ledger_entry_id, bank_transaction_id, match_type, score",
        "Scores independentes para Vínculo e Classificação",
        "Detecção de duplicidade por hash e valor/data",
        "Classificação baseada em histórico de lançamentos anteriores",
      ],
      gaps: [],
      files: [
        "supabase/functions/smart-reconcile/index.ts",
        "supabase/functions/classify-entry/index.ts",
      ],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 6 — TRANSFERÊNCIAS BANCÁRIAS
// ══════════════════════════════════════════════════════════════════════

const BLOCK_6: DecompositionBlock = {
  id: "s5-b6-transfers",
  number: 6,
  name: "Transferências Bancárias",
  objective: "Transferências entre contas com impacto no saldo e sem impacto no DRE",
  status: "partial",
  doneWhen: [
    "Tabela fin_bank_transfers ou lógica via Livro Razão",
    "Campos: conta origem, conta destino, valor, data, status",
    "Transferência gera 2 lançamentos no razão (saída + entrada)",
    "Sem impacto no DRE (categoria neutra ou flag)",
    "UI de criação e listagem de transferências",
    "Atualização automática de saldos bancários",
  ],
  items: [
    {
      id: "s5-b6-01",
      name: "Transferências entre contas",
      status: "partial",
      existing: [
        "TreasuryTab com listagem de contas bancárias e saldos",
        "Conceito de tesouraria implementado na aba",
        "Saldos bancários com current_balance em fin_bank_accounts",
        "useFinanceiroSync para invalidação de queries",
      ],
      gaps: [
        "Criar tabela 'fin_bank_transfers' (id, tenant_id, from_account_id, to_account_id, amount, transfer_date, description, status, created_at, created_by)",
        "RLS por tenant_id",
        "Trigger: ao confirmar transferência, gerar 2 lançamentos no razão (saída da origem + entrada no destino) com chart_account_id de categoria neutra (Capital/Movimentação)",
        "Atualizar saldos bancários automaticamente",
        "UI: CreateTransferDialog com conta origem, destino, valor, data",
        "Listagem de transferências na aba Tesouraria",
        "Validação: impedir transferência para mesma conta",
        "Validação: impedir transferência com valor <= 0",
      ],
      files: ["src/components/financeiro/TreasuryTab.tsx"],
      estimatedHoursRemaining: 8,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 7 — FLUXO DE CAIXA PREVISTO
// ══════════════════════════════════════════════════════════════════════

const BLOCK_7: DecompositionBlock = {
  id: "s5-b7-cashflow-forecast",
  number: 7,
  name: "Fluxo de Caixa Previsto",
  objective: "Projeção de entradas e saídas futuras baseada em obrigações abertas",
  status: "done",
  doneWhen: [
    "Cálculo automático baseado em fin_ledger_entries com status ABERTO",
    "Agrupamento por período (dia/semana/mês)",
    "Saldo projetado acumulado",
    "Indicadores: Burn Rate, Runway, Saldo Projetado 30/90 dias",
    "Alerta de saldo mínimo de segurança",
    "Visualização em tabela hierárquica por categoria",
  ],
  items: [
    {
      id: "s5-b7-01",
      name: "Fluxo de Caixa Previsto",
      status: "done",
      existing: [
        "CashflowTab com visão hierárquica por categoria",
        "7 blocos: Entradas Operacionais, Saídas sobre Vendas, Saídas Estrutura, Geração Operacional, Mov. Financeiras, Capital, Investimentos",
        "Modo Executivo para visão simplificada",
        "Burn Rate, Runway, Geração Operacional calculados",
        "Saldo Projetado 30/90 dias",
        "Alerta de Saldo Mínimo de Segurança (company_settings.min_safety_balance)",
        "Filtro por centro de custo com resolução de rateio",
        "Drill-down por categoria com DrillDownEntriesDialog",
        "Exportação de dados",
      ],
      gaps: [],
      files: [
        "src/components/financeiro/CashflowTab.tsx",
        "src/components/financeiro/ExecutiveView.tsx",
        "src/components/financeiro/DrillDownEntriesDialog.tsx",
      ],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 8 — FLUXO DE CAIXA REALIZADO
// ══════════════════════════════════════════════════════════════════════

const BLOCK_8: DecompositionBlock = {
  id: "s5-b8-cashflow-actual",
  number: 8,
  name: "Fluxo de Caixa Realizado",
  objective: "Visão do caixa efetivamente movimentado com base em cash_date",
  status: "done",
  doneWhen: [
    "Filtragem por cash_date (apenas lançamentos liquidados)",
    "Saldo progressivo calculado linha a linha",
    "Extrato por conta bancária individual",
    "Visão consolidada de todas as contas",
  ],
  items: [
    {
      id: "s5-b8-01",
      name: "Fluxo Realizado e Extrato por Conta",
      status: "done",
      existing: [
        "BankAccountExtractTab com extrato detalhado por conta",
        "Saldo progressivo calculado: Saldo Inicial + movimentos anteriores ao período",
        "Entradas e saídas sequenciais com saldo acumulado",
        "Integração com transações OFX importadas",
        "CashflowTab filtra por cash_date para itens liquidados (PAGO_RECEBIDO)",
        "Filtro dual-date no LedgerTab: cash_date para realizados + competence_date para abertos",
        "Conciliação automática: pagamento marca reconciled=true e preenche cash_date",
      ],
      gaps: [],
      files: [
        "src/components/financeiro/BankAccountExtractTab.tsx",
        "src/components/financeiro/CashflowTab.tsx",
      ],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 9 — COMPARADOR PREVISTO VS REALIZADO
// ══════════════════════════════════════════════════════════════════════

const BLOCK_9: DecompositionBlock = {
  id: "s5-b9-forecast-vs-actual",
  number: 9,
  name: "Comparador Previsto vs Realizado",
  objective: "Dashboard comparativo com desvios percentuais e indicadores",
  status: "partial",
  doneWhen: [
    "Entrada prevista vs realizada lado a lado",
    "Saída prevista vs realizada lado a lado",
    "Desvio percentual calculado por categoria",
    "Saldo previsto vs saldo real",
    "Filtro por período e centro de custo",
    "Visualização em tabela e/ou gráfico",
  ],
  items: [
    {
      id: "s5-b9-01",
      name: "Comparador Previsto vs Realizado",
      status: "partial",
      existing: [
        "DRECashflowView com visão de DRE e Fluxo de Caixa integrados",
        "PlanejamentoFinanceiro com metas e % atingido",
        "FinancialGoalsManager com gestão de metas em 3 camadas (DRE, Fluxo, Indicadores)",
        "Alertas visuais: Vermelho <60%, Amarelo <80%, Verde >=100%",
        "Projeção de fechamento de mês (Realizado / dias corridos * dias totais)",
        "CashflowTab com indicadores de Burn Rate e Runway",
      ],
      gaps: [
        "Criar componente ForecastVsActualComparator dedicado",
        "Tabela lado-a-lado: Categoria | Previsto | Realizado | Desvio R$ | Desvio %",
        "Gráfico comparativo (barras agrupadas previsto vs realizado)",
        "Drill-down por categoria para ver lançamentos individuais",
        "Filtro por período mensal para comparação mês-a-mês",
        "Exportação do comparativo (CSV/PDF)",
      ],
      files: [
        "src/components/financeiro/DRECashflowView.tsx",
        "src/components/financeiro/PlanejamentoFinanceiro.tsx",
      ],
      estimatedHoursRemaining: 8,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 10 — REGRA COMPETÊNCIA VS CAIXA
// ══════════════════════════════════════════════════════════════════════

const BLOCK_10: DecompositionBlock = {
  id: "s5-b10-accrual-vs-cash",
  number: 10,
  name: "Regra Competência vs Caixa",
  objective: "Separação rígida entre competence_date (DRE) e cash_date (Fluxo)",
  status: "done",
  doneWhen: [
    "competence_date obrigatório em todo lançamento",
    "cash_date NULL quando status ABERTO, preenchido na liquidação",
    "DRE filtra por competence_date",
    "Fluxo de Caixa filtra por cash_date",
    "Triggers garantem integridade: cash_date NULL em ABERTO",
    "Estorno limpa cash_date e restaura status",
  ],
  items: [
    {
      id: "s5-b10-01",
      name: "Integridade competência vs caixa",
      status: "done",
      existing: [
        "competence_date NOT NULL em fin_ledger_entries",
        "cash_date nullable, preenchido apenas na liquidação",
        "Triggers PostgreSQL garantem cash_date NULL quando status ABERTO",
        "DRETab filtra exclusivamente por competence_date",
        "CashflowTab filtra por cash_date para realizados",
        "Estorno: limpa cash_date, reconciled=false, restaura saldo bancário",
        "LedgerTab usa filtro dual-date (cash_date para liquidados + competence_date para abertos)",
        "Regra documentada e implementada em todas as UIs de criação/edição",
      ],
      gaps: [],
      files: [],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 11 — INTEGRAÇÃO COM PEDIDOS
// ══════════════════════════════════════════════════════════════════════

const BLOCK_11: DecompositionBlock = {
  id: "s5-b11-order-integration",
  number: 11,
  name: "Integração Automática com Pedidos",
  objective: "Geração automática de financeiro a partir de aprovação/faturamento de pedidos",
  status: "done",
  doneWhen: [
    "Trigger: pedido aprovado/faturado → gera contas a receber",
    "Trigger: pedido aprovado → gera compromissos sobre venda (contas a pagar)",
    "Rateio proporcional por centro de custo quando múltiplos itens",
    "Descrição enriquecida com número do pedido e projeto",
    "Projeto financeiro criado automaticamente",
    "Comissões (10 tipos) geradas automaticamente",
    "Limpeza e recriação em caso de edição",
  ],
  items: [
    {
      id: "s5-b11-01",
      name: "Automação pedido → financeiro",
      status: "done",
      existing: [
        "Trigger generate_order_financial_entries gera receita e despesas",
        "Rateio proporcional por item/centro de custo",
        "Limpeza de lançamentos anteriores antes de recriar (idempotência)",
        "10 tipos de comissões: Vendedor, Orçamentista, Projetista, Montador, Produção, Parceiros, RT, etc.",
        "Taxas de cartão/link de pagamento calculadas automaticamente",
        "Projeto financeiro (PED-{numero} {client}) criado automaticamente",
        "fin_payables gerados com order_id para rastreabilidade",
        "Centro de custo resolvido a partir dos itens do pedido (fallback)",
        "process-business-event Edge Function para eventos complexos",
        "fin_business_events para auditoria de todos os eventos processados",
      ],
      gaps: [],
      files: [
        "supabase/functions/process-business-event/index.ts",
      ],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// SPRINT 5 CONSOLIDADO
// ══════════════════════════════════════════════════════════════════════

export const SPRINT_5_DECOMPOSITION: SprintDecomposition = {
  sprint: 5,
  name: "Financeiro Operacional Completo",
  objective: "Contas a Pagar/Receber, Parcelamento, Conciliação Bancária, Fluxo de Caixa, Integração com Pedidos",
  totalBlocks: 11,
  totalItems: 14,
  estimatedHoursRemaining: 16,
  blocks: [
    BLOCK_1,
    BLOCK_2,
    BLOCK_3,
    BLOCK_4,
    BLOCK_5,
    BLOCK_6,
    BLOCK_7,
    BLOCK_8,
    BLOCK_9,
    BLOCK_10,
    BLOCK_11,
  ],
  doneCriteria: [
    "Gerar contas a receber automático a partir de pedido aprovado/faturado",
    "Gerar contas a pagar automático a partir de compromissos sobre vendas",
    "Parcelamento automático com N parcelas e datas sequenciais",
    "Registrar pagamentos com data, valor e conta bancária",
    "Registrar recebimentos com data, valor e conta bancária",
    "Importar extrato OFX e detectar duplicidades",
    "Conciliar banco automático via smart-reconcile (score-based)",
    "Conciliar banco manual via dialog",
    "Transferências entre contas sem impacto no DRE",
    "Visualizar fluxo de caixa previsto com projeções 30/90 dias",
    "Visualizar fluxo de caixa realizado via extrato por conta",
    "Comparar previsto vs realizado com desvio percentual",
    "Separação rígida competência (DRE) vs caixa (Fluxo)",
    "Auditoria automática em todas as transições financeiras",
  ],
};

// ══════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════

export function getSprint5PendingItems(): DecompositionItem[] {
  return SPRINT_5_DECOMPOSITION.blocks.flatMap(b =>
    b.items.filter(i => i.status !== "done" && i.status !== "not_needed")
  );
}

export function getSprint5ReadyItems(): DecompositionItem[] {
  const doneIds = new Set(
    SPRINT_5_DECOMPOSITION.blocks
      .flatMap(b => b.items)
      .filter(i => i.status === "done")
      .map(i => i.id)
  );
  return getSprint5PendingItems().filter(item =>
    item.dependencies.every(dep => doneIds.has(dep))
  );
}

export function getSprint5BlockSummary() {
  return SPRINT_5_DECOMPOSITION.blocks.map(b => ({
    block: b.number,
    name: b.name,
    status: b.status,
    total: b.items.length,
    done: b.items.filter(i => i.status === "done").length,
    partial: b.items.filter(i => i.status === "partial").length,
    pending: b.items.filter(i => i.status === "pending").length,
    hoursRemaining: b.items.reduce((sum, i) => sum + i.estimatedHoursRemaining, 0),
  }));
}
