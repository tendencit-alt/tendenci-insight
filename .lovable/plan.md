

## Plano: Unificar Alertas de Pendências em um único painel

### Problema
Existem dois componentes de alerta separados na tela Financeiro:
1. **PendingAlertsCard** — card grande vermelho no topo da página (contas a pagar/receber vencidas), muito chamativo e poluindo a interface
2. **FinanceiroAlerts** — painel colapsável dentro da aba Lançamentos & Conciliação (alertas de conciliação, extrato, etc.)

Ambos mostram "Alertas de Pendências" mas de forma redundante e inconsistente.

### Solução
Remover o `PendingAlertsCard` e incorporar os dados de contas vencidas (payables/receivables) como uma nova seção dentro do `FinanceiroAlerts`, mantendo tudo em um único painel colapsável e clean.

### Alterações

**1. `src/components/financeiro/FinanceiroAlerts.tsx`**
- Adicionar nova prop opcional: `pendingItems` (contas vencidas a pagar/receber)
- Ou adicionar query interna para buscar contas vencidas (payables + receivables com status ABERTO/VENCIDO e due_date <= hoje)
- Criar nova seção colapsável **"Contas vencidas"** com ícone vermelho, mostrando:
  - Total pendente/vencido no header da seção
  - Lista compacta: nome da parte, descrição, badge Pagar/Receber, dias de atraso, valor
  - Botão de dismiss individual (mantendo funcionalidade atual)
- Esta seção aparece como primeira na lista de alertas (prioridade mais alta)
- O badge total no header do painel passa a somar também as contas vencidas

**2. `src/pages/Financeiro.tsx`**
- Remover import e uso do `PendingAlertsCard`
- Remover linhas 8 e 90

**3. `src/components/financeiro/LedgerReconciliationTab.tsx`**
- Nenhuma alteração necessária (já usa FinanceiroAlerts)

### Resultado
Um único painel colapsável "Alertas de Pendências" concentra todos os tipos de alerta: contas vencidas, conciliação pendente, extrato desatualizado, sem plano de contas e divergências. Interface limpa sem o card vermelho grande no topo.

