## Objetivo

Tornar os KPIs de receita / custo / resultado / saldo dos 3 dashboards financeiros consistentes com o DRE e o Fluxo de Caixa, usando a coluna `grupo_fluxo` (`ENTRADA`, `SAIDA`, `NAO_CAIXA`) já existente em `fin_chart_accounts`.

Escopo: **só** `DashboardSimple.tsx`, `ExecutiveStatusBar` (via `useCompanyStatus`) e `FinanceiroDashboard` (via `DashboardBI`). Nada mais é tocado.

## Regra única que será aplicada

Para somar valores monetários nos KPIs:

- **Receita** = lançamentos cuja conta tem `grupo_fluxo = ENTRADA`
- **Custo/Despesa** = lançamentos cuja conta tem `grupo_fluxo = SAIDA`
- **Resultado / Margem** = Receita − Custo
- **Saldo de caixa do período** = Σ ENTRADA − Σ SAIDA (ignora `NAO_CAIXA`)
- Lançamentos com conta sem `grupo_fluxo` (NULL) são **ignorados** no numerador, mas contados num campo auxiliar `naoClassificados` para alerta opcional.

Fallback: se a conta tiver `grupo_fluxo = NULL`, cai-se no comportamento antigo (`type RECEITA/DESPESA` ou `entry_type credit/debit`) só para não zerar painéis enquanto o usuário não classifica tudo.

## Mudanças por arquivo

### 1. `src/pages/DashboardSimple.tsx`
- Trocar as queries diretas em `fin_receivables` / `fin_payables` por `fin_ledger_entries` com join: `chart_account:fin_chart_accounts(grupo_fluxo)`.
- Filtrar pelo período (`competence_date` do mês atual).
- `revenue` = soma onde `grupo_fluxo = 'ENTRADA'`.
- `costs` = soma onde `grupo_fluxo = 'SAIDA'`.
- `margin` mantida: `(revenue − costs) / revenue`.
- `cash` (saldo bancário) e `inadimplencia` ficam como estão (não dependem de grupo_fluxo).

### 2. `src/hooks/useCompanyStatus.ts` (alimenta `ExecutiveStatusBar`)
- Substituir os 4 `ledger().eq("entry_type", "credit"/"debit")` por queries com join em `fin_chart_accounts(grupo_fluxo)`.
- `revenue` / `expenses` (mês atual e anterior) passam a usar `grupo_fluxo`.
- `monthlyResult = revenue − expenses` segue igual.
- Demais KPIs (`cashBalance`, `openOrders`, `overduePayables`, `goalProgress`) ficam intactos.

### 3. `src/components/financeiro/DashboardBI.tsx` (renderizado por `FinanceiroDashboard`)
- No `useQuery` principal:
  - Estender o select do join de chart_account para incluir `grupo_fluxo`.
  - Trocar os reduces de `receitas` / `despesas` / `receitasRealizadas` / `despesasRealizadas` para usar `grupo_fluxo` em vez de `entry.type`.
  - Mesma troca para `allReceitas` / `allDespesas` (saldo consolidado) — adicionar join também na `balanceQuery`.
  - Manter fallback `type === "RECEITA" / "DESPESA"` quando `grupo_fluxo` estiver NULL.
- Agrupamento de categorias (`receitasByAccount` / `despesasByAccount`) passa a usar `grupo_fluxo` para decidir o mapa de destino (não mais `entry.type`).

### 4. (Opcional, sem custo) Indicador "Não classificados"
- Acrescentar `naoClassificados` ao retorno de `DashboardBI` e exibir um Badge discreto no `FinanceiroKPIs` quando `> 0`, com link para o Plano de Contas. Útil para o usuário corrigir contas sem `grupo_fluxo`.

## Fora do escopo

- Outros dashboards (executivo, cockpit, command center, BI personalizadas).
- DRE/Cashflow (já usam `grupo_fluxo`).
- Migrações de banco — nada muda no schema.
- Novos componentes de UI ou novos KPIs.

## Validação

1. Rodar o preview e abrir as 3 telas: Home → ExecutiveStatusBar; `/dashboard` simples; Financeiro → DashboardBI.
2. Conferir que Receita do mês bate com a linha `1` do DRE e que Custo bate com `2+3` do DRE para o mesmo período.
3. Conferir que se eu marcar uma conta `4.* NÃO CAIXA` (depreciação) ela some dos KPIs mas continua aparecendo no DRE.
