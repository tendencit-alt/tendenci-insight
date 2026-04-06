

## Diagnóstico

Após análise detalhada do código e dos dados, identifiquei os seguintes problemas:

### Problema 1: Lançamentos ABERTOS com `cash_date` preenchido
Os triggers de pedidos populam `cash_date` na criação do lançamento (mesmo com status ABERTO). Isso faz com que lançamentos não pagos apareçam na aba "Lançamentos & Conciliação" (que filtra por `cash_date`), inflando o saldo. **Lançamentos com status ABERTO não deveriam ter `cash_date`** -- só deveria ser preenchido no momento do pagamento/recebimento.

### Problema 2: Pagamento não reflete no Extrato por Conta
Quando se paga uma conta (PayPayableDialog) ou recebe (ReceivePaymentDialog), o `bank_account_id` e `cash_date` são atualizados no `fin_ledger_entries`. Porém, o cálculo de saldo por conta bancária (`bankBalance` no PayablesReceivablesTab) soma apenas entradas com `cash_date NOT NULL` e `bank_account_id` preenchido. Muitos lançamentos ABERTOS já têm `cash_date` mas sem `bank_account_id`, o que cria inconsistência.

### Problema 3: Não existe visão de "Caixa da Empresa" com extrato por conta
Não há uma seção que mostre o saldo e movimentações de cada conta bancária individualmente, mostrando entradas e saídas por conta.

### Dados inconsistentes atuais
- 16 lançamentos com status `ABERTO` têm `cash_date` preenchido e `bank_account_id = null` -- eles não deveriam ter `cash_date`
- 3 lançamentos com status `PAGO_RECEBIDO` estão corretos (com `cash_date` e `bank_account_id`)

---

## Plano de Correção

### Etapa 1: Corrigir dados existentes inconsistentes
Usar a ferramenta de inserção para limpar `cash_date` de todos os `fin_ledger_entries` que estão com status `ABERTO` mas têm `cash_date` preenchido. Isso garante que apenas lançamentos efetivamente pagos/recebidos impactem o caixa.

```sql
UPDATE fin_ledger_entries 
SET cash_date = NULL 
WHERE status = 'ABERTO' AND cash_date IS NOT NULL;
```

### Etapa 2: Corrigir trigger de criação de pedidos
Alterar a lógica do trigger que gera lançamentos a partir de pedidos para **não preencher `cash_date`** na criação. O `cash_date` só será preenchido quando o pagamento/recebimento for efetivamente registrado.

### Etapa 3: Corrigir `LedgerReconciliationTab` para mostrar lançamentos por `competence_date` OU `cash_date`
A aba de Lançamentos atualmente filtra exclusivamente por `cash_date`. Precisa ser ajustada para mostrar todos os lançamentos relevantes (usando `competence_date` como fallback quando `cash_date` é null), para que lançamentos ABERTOS também apareçam na visão do Livro Razão.

### Etapa 4: Criar seção "Extrato por Conta" 
Adicionar na aba de Lançamentos & Conciliação (ou como sub-aba) uma visão de **extrato por conta bancária** que mostra:
- Saldo inicial de cada conta
- Movimentações (entradas/saídas com `bank_account_id` e status `PAGO_RECEBIDO`)
- Saldo atual por conta
- Saldo consolidado total (todas as contas)

### Etapa 5: Garantir sincronização bidirecional completa
Revisar `payPayableWithLedgerSync` e `receivePaymentWithLedgerSync` para garantir que ao registrar pagamento:
1. O `fin_ledger_entries` receba `cash_date`, `bank_account_id` e status `PAGO_RECEBIDO`
2. O título (`fin_payables`/`fin_receivables`) receba `bank_account_id`, `paid_amount`/`received_amount` e status correto
3. A invalidação de cache inclua queries de saldo bancário (`fin-bank-balance-unified`)

### Etapa 6: Atualizar `useFinanceiroSync` 
Incluir invalidação das queries de saldo bancário e caixa consolidado em todas as funções de sync.

---

## Arquivos afetados
- `src/lib/financeiroIntegration.ts` -- Ajustar funções de criação para não popular `cash_date` em ABERTO
- `src/components/financeiro/LedgerReconciliationTab.tsx` -- Ajustar filtro de data e adicionar extrato por conta
- `src/components/financeiro/PayablesReceivablesTab.tsx` -- Incluir invalidação de saldo
- `src/hooks/useFinanceiroSync.ts` -- Adicionar invalidação de queries de saldo
- Trigger SQL (migration) -- Corrigir trigger de pedidos para não preencher `cash_date`
- Dados existentes (insert tool) -- Limpar `cash_date` de registros ABERTOS

