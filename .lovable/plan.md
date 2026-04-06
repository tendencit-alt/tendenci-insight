

## Plano: Extrato por Conta Bancária

### Situação Atual
A aba "Lançamentos & Conciliação" já possui o filtro de conta bancária nos filtros globais, mas não há uma visão dedicada de **extrato por conta** que mostre claramente entradas/saídas e saldo acumulado de cada conta.

### Solução
Adicionar uma terceira sub-aba **"Extrato por Conta"** dentro de "Lançamentos & Conciliação" (ao lado de "Lançamentos" e "Extrato Bancário"). Esta sub-aba mostrará:

### Estrutura da nova sub-aba

1. **Seletor de conta bancária** no topo (dropdown com todas as contas ativas)
2. **Cards de resumo**: Saldo anterior, Total Entradas, Total Saídas, Saldo Final
3. **Tabela de extrato** com:
   - Data (cash_date)
   - Descrição
   - Tipo (Receita/Despesa badge)
   - Categoria (chart_account)
   - Entrada (valor se RECEITA)
   - Saída (valor se DESPESA)
   - Saldo Acumulado (calculado linha a linha)
   - Status de conciliação

A query buscará apenas lançamentos com `status = 'PAGO_RECEBIDO'` e `bank_account_id` da conta selecionada, ordenados por `cash_date` ascendente para calcular o saldo progressivo.

### Alterações

**1. `src/components/financeiro/LedgerReconciliationTab.tsx`**
- Adicionar a sub-aba "Extrato por Conta" no TabsList (grid-cols-2 → grid-cols-3)
- Adicionar o estado `selectedAccountId` para o seletor dentro da sub-aba
- Criar query dedicada `fin-account-extract` que busca lançamentos realizados da conta selecionada
- Renderizar a tabela de extrato com cálculo de saldo acumulado progressivo

**2. Componente `BankAccountExtractTab`** (novo arquivo)
- Componente separado para manter o `LedgerReconciliationTab` organizado
- Props: `filters` (para período) 
- Lógica: seletor de conta, query de lançamentos realizados, cálculo de saldo acumulado
- Cards de resumo (saldo anterior, entradas, saídas, saldo final)
- Tabela com colunas separadas de Entrada/Saída e saldo progressivo

### Resultado
O usuário poderá selecionar qualquer conta bancária e ver o extrato completo com entradas, saídas e saldo acumulado — como um extrato bancário real.

