

# Prompt Completo para Exportar o Módulo Financeiro

Segue abaixo o prompt detalhado e autocontido que pode ser colado em outro projeto Lovable para recriar integralmente o módulo Financeiro.

---

## PROMPT PARA OUTRO PROJETO LOVABLE

```text
Crie um módulo financeiro completo em português brasileiro (pt-BR) com as seguintes especificações. O módulo deve usar React + TypeScript, Tailwind CSS, shadcn/ui, @tanstack/react-query, date-fns, recharts, react-resizable-panels e Supabase como backend. A moeda é BRL.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PARTE 1 — BANCO DE DADOS (Supabase / PostgreSQL)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Criar as seguintes tabelas com RLS habilitada para authenticated users (SELECT/INSERT/UPDATE). Todas as colunas UUID usam gen_random_uuid().

### 1.1 fin_bank_accounts
- id UUID PK
- nickname TEXT NOT NULL
- bank_name TEXT
- agency TEXT
- account_number TEXT
- opening_balance DECIMAL(15,2) DEFAULT 0
- opening_balance_date DATE DEFAULT CURRENT_DATE
- active BOOLEAN DEFAULT true
- created_at TIMESTAMPTZ DEFAULT now()
- updated_at TIMESTAMPTZ DEFAULT now()

### 1.2 fin_chart_accounts (hierárquico — plano de contas)
- id UUID PK
- parent_id UUID FK → fin_chart_accounts(id) (auto-referência)
- code TEXT NOT NULL
- name TEXT NOT NULL
- nature TEXT CHECK ('RECEITA','DESPESA','ATIVO','PASSIVO','RESULTADO','CAPITAL','CAIXA')
- in_dre BOOLEAN DEFAULT true
- in_cashflow BOOLEAN DEFAULT true
- active BOOLEAN DEFAULT true
- dre_order INTEGER (para ordenar linhas do DRE)
- created_at TIMESTAMPTZ DEFAULT now()

Seed de dados: criar categorias de nível 1 a 9:
1. Receita Operacional (RECEITA)
  1.1 Vendas de Produtos, 1.2 Serviços Prestados, 1.3 Outras Receitas
2. Deduções da Receita (DESPESA)
  2.1 Impostos sobre Vendas, 2.2 Devoluções
3. Custos (DESPESA)
  3.1 CMV, 3.2 Mão de Obra Direta, 3.3 Outros Custos
4. Despesas Operacionais (DESPESA)
  4.1 a 4.6 (Administrativas, Pessoal, Ocupação, Marketing, Tecnologia, Outras)
5. Outras Receitas/Despesas (RECEITA)
6. Resultado Operacional (RESULTADO) — linha calculada
7. Resultado Financeiro (DESPESA)
  7.1 Juros Pagos, 7.2 Juros Recebidos (RECEITA), 7.3 Multas e Encargos
8. Resultado Antes do Capital (RESULTADO) — calculado
9. Movimentações de Capital (CAPITAL)
  9.1 Contratação Empréstimos, 9.2 Amortização Empréstimos, 9.3 Aportes de Capital, 9.4 Distribuição de Lucros

### 1.3 fin_cost_centers
- id UUID PK, name TEXT NOT NULL, code TEXT, owner_id UUID FK→profiles, active BOOLEAN DEFAULT true, created_at

### 1.4 fin_projects
- id UUID PK, name TEXT NOT NULL, code TEXT, status TEXT DEFAULT 'ativo', owner_id UUID FK→profiles, budget DECIMAL(15,2), start_date DATE, end_date DATE, created_at

### 1.5 fin_ledger_entries (SINGLE SOURCE OF TRUTH — livro razão)
- id UUID PK
- type TEXT CHECK ('RECEITA','DESPESA','TRANSFERENCIA','AJUSTE')
- description TEXT NOT NULL
- amount DECIMAL(15,2) NOT NULL
- competence_date DATE NOT NULL
- cash_date DATE (null = não realizado)
- bank_account_id UUID FK → fin_bank_accounts
- chart_account_id UUID FK → fin_chart_accounts
- cost_center_id UUID FK → fin_cost_centers
- project_id UUID FK → fin_projects
- party_id UUID (fornecedor ou cliente)
- party_type TEXT CHECK ('supplier','client')
- status TEXT CHECK ('ABERTO','PARCIAL','PAGO_RECEBIDO','VENCIDO','CANCELADO') DEFAULT 'ABERTO'
- reconciled BOOLEAN DEFAULT false
- reversal_of_id UUID FK → fin_ledger_entries (estorno)
- parent_entry_id UUID FK → fin_ledger_entries (desdobramento)
- has_splits BOOLEAN DEFAULT false
- loan_contract_id UUID FK → fin_loan_contracts
- payment_method TEXT
- installment_number INTEGER
- total_installments INTEGER
- is_recurring BOOLEAN DEFAULT false
- recurrence_type TEXT
- recurrence_count INTEGER
- recurrence_end_date DATE
- juros_atraso NUMERIC DEFAULT 0
- document_number TEXT
- tags TEXT[]
- notes TEXT
- created_by UUID FK→profiles
- created_at, updated_at

### 1.6 fin_payables (contas a pagar)
- id UUID PK
- supplier_id UUID FK → suppliers
- amount DECIMAL(15,2) NOT NULL
- paid_amount DECIMAL(15,2) DEFAULT 0
- due_date DATE NOT NULL
- competence_date DATE
- status TEXT CHECK ('ABERTO','PARCIAL','PAGO','VENCIDO','CANCELADO') DEFAULT 'ABERTO'
- installment INTEGER DEFAULT 1, total_installments INTEGER DEFAULT 1
- chart_account_id, cost_center_id, project_id (FKs)
- payment_date DATE, bank_account_id UUID FK
- ledger_entry_id UUID FK → fin_ledger_entries (vínculo bidirecional)
- reconciled BOOLEAN DEFAULT false
- description, document_number, notes TEXT
- created_by UUID FK→profiles
- created_at, updated_at

### 1.7 fin_receivables (contas a receber)
- id UUID PK
- customer_id UUID FK → clients
- order_id UUID FK → orders (opcional)
- deal_id UUID FK → crm_deals (opcional)
- amount, received_amount DECIMAL DEFAULT 0
- due_date, competence_date
- status CHECK ('ABERTO','PARCIAL','RECEBIDO','VENCIDO','CANCELADO')
- installment, total_installments
- chart_account_id, cost_center_id, project_id, bank_account_id, ledger_entry_id
- receipt_date DATE
- reconciled, description, document_number, notes, created_by, created_at, updated_at

### 1.8 fin_bank_transactions (extrato OFX importado)
- id UUID PK, bank_account_id FK NOT NULL, bank_transaction_id TEXT NOT NULL
- date DATE NOT NULL, bank_memo TEXT, amount DECIMAL NOT NULL
- direction TEXT CHECK ('IN','OUT') NOT NULL
- status CHECK ('PENDENTE','SUGERIDA','CONCILIADA','IGNORADA','DIVERGENTE') DEFAULT 'PENDENTE'
- file_hash TEXT, import_batch_id UUID, raw_data JSONB, created_at
- UNIQUE(bank_account_id, bank_transaction_id)

### 1.9 fin_reconciliation_links
- id UUID PK, bank_transaction_id FK, ledger_entry_id FK
- match_type CHECK ('AUTO','MANUAL','SPLIT'), score DECIMAL(5,2)
- created_by FK→profiles, created_at

### 1.10 fin_budgets (orçamento)
- id UUID PK, year INT, month INT CHECK 1-12
- chart_account_id, cost_center_id, project_id (FKs)
- amount DECIMAL NOT NULL, version INT DEFAULT 1, notes, created_by, created_at, updated_at

### 1.11 fin_attachments
- id, entity_type TEXT, entity_id UUID, file_name, file_path, file_size INT, uploaded_by FK, created_at

### 1.12 fin_audit_logs
- id, user_id FK, entity_type, entity_id, action TEXT, before_data JSONB, after_data JSONB, ip_address, created_at

### 1.13 fin_reconciliation_rules
- id, name, priority INT, pattern_regex, keywords TEXT[], chart_account_id, cost_center_id, party_id, party_type, active, created_by, created_at

### 1.14 fin_financial_goals (metas financeiras)
- id UUID PK, year INT NOT NULL, month INT NOT NULL, goal_type TEXT NOT NULL, metric_key TEXT NOT NULL
- target_amount DECIMAL(15,2) NOT NULL
- cost_center_id FK, project_id FK, notes, created_by FK, created_at, updated_at
- UNIQUE INDEX parcial usando COALESCE para (year, month, goal_type, metric_key, cost_center_id, project_id)

### 1.15 fin_loan_contracts (empréstimos)
- id, contract_number TEXT NOT NULL, bank_name TEXT NOT NULL, principal_amount DECIMAL NOT NULL
- interest_rate DECIMAL, installments INT, start_date DATE NOT NULL, end_date DATE
- status TEXT DEFAULT 'ativo', notes, created_by FK, created_at, updated_at

### 1.16 fin_ledger_splits (desdobramentos de lançamento)
- id UUID PK, parent_entry_id FK → fin_ledger_entries ON DELETE CASCADE
- description TEXT NOT NULL, amount DECIMAL NOT NULL, percentage DECIMAL
- chart_account_id, cost_center_id (FKs), created_by FK, created_at

### ÍNDICES DE PERFORMANCE
- idx_fin_ledger_competence, idx_fin_ledger_cash, idx_fin_ledger_bank, idx_fin_ledger_chart, idx_fin_ledger_status
- idx_fin_payables_due, idx_fin_payables_status, idx_fin_payables_supplier
- idx_fin_receivables_due, idx_fin_receivables_status, idx_fin_receivables_customer
- idx_fin_bank_tx_date, idx_fin_bank_tx_status
- idx_fin_audit_entity, idx_fin_audit_user

### TRIGGERS
1. **Auditoria automática** (fn_fin_audit_log): Trigger AFTER INSERT/UPDATE/DELETE em fin_ledger_entries, fin_payables, fin_receivables e fin_bank_accounts. Grava antes/depois em fin_audit_logs.
2. **Status vencido** (fn_fin_update_overdue_status): Trigger BEFORE INSERT/UPDATE em fin_payables e fin_receivables. Se status='ABERTO' e due_date < CURRENT_DATE, altera para 'VENCIDO'.
3. **updated_at**: Trigger BEFORE UPDATE em todas as tabelas com updated_at.
4. **Pedido de compra → Conta a pagar**: Trigger AFTER INSERT ON purchase_orders que cria automaticamente uma fin_payables vinculada.

### REALTIME
Habilitar realtime (supabase_realtime) para: fin_ledger_entries, fin_payables, fin_receivables, fin_bank_accounts, fin_financial_goals, fin_projects, fin_cost_centers, fin_chart_accounts, fin_bank_transactions, fin_loan_contracts.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PARTE 2 — ARQUITETURA FRONTEND
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### 2.1 Página principal: /financeiro
Componente: `Financeiro.tsx`
- Layout com DashboardLayout
- Filtros globais no topo (sempre visíveis, collapsible)
- Alerta de lançamentos órfãos (OrphanEntriesAlert)
- Card de alertas de pendências (PendingAlertsCard)
- 5 abas (Tabs com ícones):
  1. **BI/Dashboard** (LayoutDashboard) → FinanceiroDashboard → DashboardBI
  2. **DRE / Fluxo de Caixa** (BarChart3) → DRECashflowView
  3. **Contas a Pagar/Receber** (Wallet) → PayablesReceivablesTab
  4. **Lançamentos & Conciliação** (BookOpen) → LedgerReconciliationTab
  5. **Compras** (ShoppingCart) → PurchasesTab

### 2.2 Filtros Globais (FinanceiroFilters)
Estado: dateFrom, dateTo, bankAccountId, costCenterId, projectId, search, categoryId, subcategoryId, sortField, sortDirection.
- Presets de período: Hoje, Semana, Mês, Mês Ant., Ano
- Calendário range picker com 2 meses
- Busca por texto
- Categoria (apenas parent_id=null) → Subcategoria (filhos da selecionada) — filtragem hierárquica
- Seletores: Conta Bancária, Centro de Custo, Projeto
- Botões de ordenação: Data ↑↓, Valor ↑↓

### 2.3 KPIs Inteligentes (FinanceiroKPIs)
4 cards com border-left colorido (verde/amarelo/vermelho):
1. **Resultado Líquido** — Receitas – Despesas com cor condicional
2. **Fôlego de Caixa** — Runway = saldo / saídas (meses), status: Confortável >6, Atenção ≥3, Crítico <3
3. **Qualidade do Caixa** — Conversão (margem%) + Cobertura (saldo/despesas%), status Boa/Atenção/Crítica
4. **DSCR** — Debt Service Coverage Ratio = Receitas/Despesas, Saudável ≥1.5x, Atenção ≥1.0x, Crítico <1.0x
Todos com tooltips explicativos.

### 2.4 Dashboard BI (DashboardBI)
- KPIs no topo
- Drill-down interativo: clicar num KPI expande tabela com categorias agrupadas por plano de contas
- Cada categoria é expansível, mostra lançamentos individuais com data, descrição, documento, valor
- Porcentagem de cada categoria sobre o total
- Subcomponentes: CostCenterKPIs (cards por centro de custo com receitas/despesas/resultado) e ProjectKPIs (cards por projeto financeiro)

### 2.5 DRE e Fluxo de Caixa (DRECashflowView)
- Toggle de visualização: Lado a Lado (ResizablePanelGroup), Apenas DRE, Apenas Fluxo
- Divisor arrastável entre painéis

**DRETab**: Relatório hierárquico do DRE
- Busca contas com in_dre=true, filtra lançamentos por competence_date
- Linhas expansíveis (árvore de contas) com drill-down nos lançamentos
- Linhas calculadas: Receita Líquida, Lucro Bruto, Resultado Operacional, Resultado Financeiro, Resultado do Período
- Metas (fin_financial_goals) comparadas com realizado
- Sub-filtro por Centro de Custo local
- Exportação Excel
- Semáforo: verde ≥95% meta, amarelo ≥80%, vermelho <80%

**CashflowTab**: Fluxo de Caixa
- Busca contas com in_cashflow=true, filtra por cash_date (somente realizados)
- Mesma estrutura hierárquica com drill-down
- Saldo inicial = soma opening_balance das contas ativas
- Saldo final = inicial + entradas - saídas
- Sub-filtro Centro de Custo, metas, exportação Excel

### 2.6 Contas a Pagar/Receber (PayablesReceivablesTab)
- Sub-tabs: Todas, A Pagar, A Receber
- KPIs resumo: para payables (abertas, vencidas, pagas, a vencer 7d/15d/30d) e receivables (abertas, vencidas, recebidas, a vencer 7d/15d/30d)
- Saldo bancário consolidado (soma opening_balance + entradas - saídas de todos os lançamentos)
- Tabelas com:
  - Filtros por coluna (data, fornecedor/cliente, descrição, categoria, valor, status)
  - Ordenação por coluna clicável
  - Seleção múltipla (checkbox) para operações em lote
  - Badges coloridos por status: ABERTO (outline), PARCIAL (amarelo), PAGO/RECEBIDO (verde), VENCIDO (vermelho), CANCELADO (destructive)
  - Ações por linha: Visualizar, Editar, Baixar pagamento/recebimento, Deletar
  - Ações em lote: Editar status, Deletar selecionados
- Dialogs:
  - CreatePayableDialog: fornecedor (SearchableSelect com botão criar rápido), valor (CurrencyInput), vencimento, competência, categoria, centro de custo, projeto, descrição, parcelas, documento, notas. Suporta initialData para pré-preenchimento (OFX import).
  - CreateReceivableDialog: cliente (SearchableSelect com criar rápido), mesmos campos
  - PayPayableDialog: valor do pagamento, data, conta bancária
  - ReceivePaymentDialog: valor do recebimento, data, conta bancária
  - ViewEditPayableDialog: modo view/edit com todos os campos editáveis
  - ViewEditReceivableDialog: idem

### 2.7 Lançamentos & Conciliação (LedgerReconciliationTab)
- Sub-tabs: Lançamentos, Extrato/Conciliação
- KPIs: Total Lançamentos, Pendentes Conciliação, Transações Extrato, % Conciliado
- Alerta de último extrato importado (aviso se >1 dia)

**Lançamentos**:
- Tabela com colunas: tipo (ícone), data caixa, descrição, categoria, centro de custo, valor formatado (+receita/-despesa), status badge, conciliado (✓)
- Checkbox para selecionar e conciliar em lote
- Ações por entrada: Desdobrar (Split), Histórico (Audit), Conciliar, menu dropdown
- Botão criar novo lançamento
- CreateLedgerEntryDialog: tipo (RECEITA/DESPESA/TRANSFERENCIA/AJUSTE), valor, data competência, data caixa, conta bancária, categoria, centro de custo, projeto, método pagamento, documento, notas. Opção recorrência (diária/semanal/mensal/anual com contagem). Opção party (fornecedor/cliente com SearchableSelect) para criar automaticamente payable/receivable vinculado.

**Extrato/Conciliação**:
- Importação OFX (upload + parse)
- OFXImportDialog: tabela de transações importadas, selecionar para criar payable ou receivable pré-preenchido
- Tabela de transações bancárias com status (PENDENTE, SUGERIDA, CONCILIADA, IGNORADA, DIVERGENTE)
- ReconcileDialog: seleciona lançamentos e vincula com transação bancária
- SplitEntryDialog: desdobra um lançamento em múltiplas categorias (percentual ou valor)

### 2.8 Compras (PurchasesTab)
- Tabela de pedidos de compra com status, filtros (busca, status, fornecedor, período)
- KPIs de compras
- CreatePurchaseOrderDialog, PurchaseOrderDetailSheet
- Trigger automático: ao criar pedido de compra, gera fin_payables

### 2.9 Alertas
- **PendingAlertsCard**: lista payables e receivables vencidas ou vencendo hoje, ordenadas por dias de atraso, com dismiss individual
- **OrphanEntriesAlert**: detecta fin_ledger_entries sem vínculo em payables/receivables, permite sincronização automática
- **FinanceiroAlerts**: alertas contextuais na aba de lançamentos

### 2.10 Cadastros Financeiros (/cadastros-financeiros — página separada)
Componentes masters:
- **BankAccountsManager**: CRUD de contas bancárias
- **ChartAccountsManager**: CRUD do plano de contas hierárquico com drag-and-drop (DraggableAccountRow)
- **CostCentersManager**: CRUD de centros de custo com código e status
- **FinProjectsManager**: CRUD de projetos financeiros com orçamento, datas, status
- **LoanContractsManager**: CRUD de contratos de empréstimo
- **FinancialGoalsManager**: gerenciamento de metas por mês/ano/tipo
- **ProjectKPIsDialog**: visualização de KPIs por projeto

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PARTE 3 — LÓGICA DE INTEGRAÇÃO (financeiroIntegration.ts)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Regras de sincronização bidirecional:
1. Criar Payable → cria Ledger Entry (DESPESA, ABERTO, cash_date=null), vincula via ledger_entry_id
2. Criar Receivable → cria Ledger Entry (RECEITA, ABERTO, cash_date=null), vincula
3. Criar Ledger Entry com party_type=supplier → cria Payable vinculada
4. Criar Ledger Entry com party_type=client → cria Receivable vinculada
5. Pagar Payable → atualiza paid_amount, status (PARCIAL ou PAGO), atualiza Ledger Entry (cash_date, status PAGO_RECEBIDO, bank_account_id)
6. Receber Receivable → atualiza received_amount, status (PARCIAL ou RECEBIDO), atualiza Ledger Entry
7. Conciliar → marca reconciled=true no Ledger Entry e nos Payables/Receivables vinculados, cria reconciliation_link se tiver transação bancária
8. Bulk update payables/receivables → sincroniza status nos Ledger Entries vinculados
9. Bulk delete payables/receivables → marca Ledger Entries como CANCELADO (não deleta)
10. Detecção de órfãos: identifica Ledger Entries DESPESA/RECEITA sem Payable/Receivable vinculado
11. Sincronização de órfãos: cria Payable/Receivable para cada órfão detectado

Funções exportadas:
- createPayableWithLedger(data)
- createReceivableWithLedger(data)
- createLedgerEntryWithIntegration(data, createLinkedRecord, dueDate)
- payPayableWithLedgerSync(...)
- receivePaymentWithLedgerSync(...)
- reconcileWithSync(entryIds, bankTransactionId?, reconcileDate?)
- bulkUpdatePayablesWithSync(ids, newStatus)
- bulkDeletePayablesWithSync(ids)
- bulkUpdateReceivablesWithSync(ids, newStatus)
- bulkDeleteReceivablesWithSync(ids)
- getOrphanLedgerEntries()
- syncOrphanLedgerEntries()

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PARTE 4 — HOOKS DE SINCRONIZAÇÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### useFinanceiroSync
Invalida React Query caches por módulo:
- invalidateAll() — todas as queries fin-*
- invalidatePayables() — fin-payables, fin-payables-summary-tab, fin-ledger-entries
- invalidateReceivables() — fin-receivables, fin-receivables-summary-tab, fin-ledger-entries
- invalidateLedger() — todas as queries financeiras
- invalidateReconciliation() — ledger, bank, payables, receivables

### useFinanceiroRealtime
Subscreve via Supabase Realtime channel "financeiro-realtime" a mudanças em todas as tabelas financeiras + suppliers + clients. Qualquer mudança invalida todas as queries com prefixo "fin-".

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PARTE 5 — UTILITÁRIOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### OFX Parser (src/lib/ofx-parser.ts)
- parseOFX(content): extrai transações de arquivo OFX brasileiro
- Campos: id, type (DEBIT/CREDIT), date, amount, description, fitid
- Extrai bankId, accountId, startDate, endDate
- formatAmountForForm(amount): formata para display BR

### CurrencyInput (src/components/ui/currency-input.tsx)
- Input de moeda com máscara brasileira (1.234,56)
- parseCurrencyToNumber(): converte string BR para number
- formatToCurrencyDisplay(): converte number para string BR

### SearchableSelect
- Select com busca/filtro integrado para fornecedores e clientes

### numericCodeSort
- Ordena arrays por campo de código numérico (ex: "1.2.3" antes de "1.10")

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PARTE 6 — TABELAS DEPENDENTES (pré-requisitos)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

O módulo financeiro depende das seguintes tabelas que devem existir:
- **profiles** (id UUID PK, full_name, role, etc.)
- **suppliers** (id UUID PK, name, cpf_cnpj, active, etc.)
- **clients** (id UUID PK, name, phone, email, etc.)
- **orders** (id UUID PK) — opcional para vincular receivables
- **crm_deals** (id UUID PK) — opcional para vincular receivables
- **purchase_orders** (id, order_number SERIAL, supplier_id FK, status, total, subtotal, discount_value, shipping_cost, created_by FK, created_at, updated_at)
- **purchase_order_items** (id, purchase_order_id FK CASCADE, product_id FK, quantity, unit_price, total, etc.)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PARTE 7 — COMPORTAMENTOS ESPECIAIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Toda formatação de moeda usa pt-BR: `value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })`
2. Datas formatadas com date-fns locale ptBR
3. DRE usa competence_date; Fluxo de Caixa usa cash_date
4. Filtro de categoria é hierárquico: selecionar categoria pai mostra subcategorias
5. SubcategoryId tem prioridade sobre categoryId nos filtros
6. Lançamentos recorrentes geram múltiplas entradas (daily/weekly/monthly/yearly × count)
7. Status VENCIDO é atualizado automaticamente por trigger quando due_date < today
8. Exportação Excel usa biblioteca exceljs
9. Conciliação: marca reconciled=true e cria link em fin_reconciliation_links
10. Semáforo de metas: verde ≥95%, amarelo ≥80%, vermelho <80%
11. Navbar: aba "Financeiro" no menu principal, "Cadastros Financeiros" separado como MASTER
12. Permissão separada: "cadastros_financeiros" para a página de cadastros
```

---

Este prompt é autocontido e cobre: schema completo do banco (16+ tabelas), triggers, RLS, índices, realtime, toda a arquitetura de componentes React (40+ arquivos), lógica de integração bidirecional entre módulos, hooks de sincronização, utilitários (OFX parser, currency input, etc.), e todos os comportamentos de negócio.

