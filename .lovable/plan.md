

## Plano: Unificar "Extrato Bancário" no "Extrato por Conta"

### Problema
Existem 3 cards de navegação, sendo que "Extrato Bancário" (transações importadas via OFX) e "Extrato por Conta" (lançamentos realizados por conta) são visões complementares da mesma informação por conta bancária. Isso confunde o usuário.

### Solução
Remover o card e a sub-aba "Extrato Bancário" e incorporar suas funcionalidades no "Extrato por Conta", que passa a mostrar tanto os lançamentos realizados quanto as transações importadas (OFX) da conta selecionada.

### Alterações

**1. `src/components/financeiro/LedgerReconciliationTab.tsx`**
- Remover o card clicável "Extrato Bancário" (linhas 557-581)
- Mudar grid de `grid-cols-3` para `grid-cols-2`
- Remover toda a `TabsContent value="bank"` (linhas 784-887) com KPIs e tabela de transações bancárias
- Atualizar o card "Extrato por Conta" para exibir métricas dinâmicas: total de transações importadas + pendentes (dados que antes estavam no card "Extrato Bancário")
- Passar dados de transações bancárias (`transactions`, `bankKpis`, handlers) como props para `BankAccountExtractTab`

**2. `src/components/financeiro/BankAccountExtractTab.tsx`**
- Adicionar nova seção abaixo do extrato de lançamentos: **"Transações Importadas (OFX)"** filtrada pela conta selecionada
- Buscar `fin_bank_transactions` da conta selecionada no período
- Exibir tabela com: Data, Memo, Valor, Status de conciliação, Lançamento vinculado, botão Conciliar
- Adicionar KPIs compactos da conciliação bancária (importadas, pendentes, conciliadas, %) integrados aos cards de resumo já existentes

### Resultado
De 3 cards → 2 cards (Lançamentos + Extrato por Conta). O "Extrato por Conta" se torna a visão completa de cada conta bancária: lançamentos realizados com saldo acumulado + transações importadas OFX e status de conciliação.

