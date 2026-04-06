

## Plano: Auto-conciliação ao registrar pagamento/recebimento

### Problema atual
Quando um título é pago/recebido, o lançamento no Livro Razão fica com status `PAGO_RECEBIDO` mas `reconciled = false`. A conciliação é um passo manual separado. Isso gera inconsistência: 2 lançamentos "Realizados" estão sem conciliação no banco.

### Solução
Tornar a conciliação automática no momento do pagamento/recebimento, já que a conta bancária é informada nesse momento (o que é suficiente para conciliar).

### Alterações

**1. `src/lib/financeiroIntegration.ts`** — Nas funções `payPayableWithLedgerSync` e `receivePaymentWithLedgerSync`:
- Adicionar `reconciled: true` ao update/insert do `fin_ledger_entries` junto com `status: PAGO_RECEBIDO`
- Adicionar `reconciled: true` ao update do `fin_payables` / `fin_receivables`

**2. `src/lib/financeiroIntegration.ts`** — Nas funções `bulkUpdatePayablesWithSync` e `bulkUpdateReceivablesWithSync`:
- Quando o novo status for `PAGO` ou `RECEBIDO`, incluir `reconciled: true` no update do ledger entry

**3. Corrigir dados existentes** — Usar insert tool para:
```sql
UPDATE fin_ledger_entries SET reconciled = true WHERE status = 'PAGO_RECEBIDO' AND reconciled = false;
UPDATE fin_payables SET reconciled = true WHERE status = 'PAGO' AND reconciled = false;
UPDATE fin_receivables SET reconciled = true WHERE status = 'RECEBIDO' AND reconciled = false;
```

**4. Função `reopenPayableWithLedgerSync` / `reopenReceivableWithLedgerSync`** (se existirem) — Ao reabrir, setar `reconciled = false` junto com o status `ABERTO`.

### Resultado
Todo pagamento/recebimento será automaticamente marcado como conciliado, eliminando o estado intermediário de "Realizado sem conciliação".

