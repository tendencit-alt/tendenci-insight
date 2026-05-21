# Padronização: exibir centavos (R$ 0,00) em todo o sistema

## Diagnóstico

O padrão `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })` já formata com 2 casas (R$ 1.234,56). O problema é que ~15 arquivos sobrescrevem com `minimumFractionDigits: 0` / `maximumFractionDigits: 0`, truncando os centavos. A correção é remover esses overrides.

## Arquivos a corrigir (remover `minimumFractionDigits:0` / `maximumFractionDigits:0`)

KPIs e cards do Home/Dashboard:
- `src/pages/HomeHoje.tsx` (linha 46) — fmtBRL dos 4 cards da Central
- `src/pages/DashboardSimple.tsx` (linha 10)
- `src/components/ui/ComparisonKPICard.tsx` (linhas 128-129)

CRM / Metas:
- `src/components/crm/CRMBoard.tsx` (linhas 330-331)
- `src/components/crm/MasterGoalsPanel.tsx` (linhas 322-323)
- `src/components/goals/GoalsAnalytics.tsx` (linhas 266, 313)

Projetos:
- `src/components/projects/PrjOverview.tsx` (linhas 258, 287)
- `src/components/projects/ArchitectPerformance.tsx` (linha 114)

Pedidos / Produção:
- `src/components/orders/OrdersKPIs.tsx` (linha 18)
- `src/components/orders/OrdersReports.tsx` (linha 39)
- `src/components/production/ProductionKPIs.tsx` (linha 87)
- `src/components/production/ProductionCardSimple.tsx` (linha 408)
- `src/components/production/OptimizedDroppableColumn.tsx` (linha 119)
- `src/components/production/DroppableColumn.tsx` (linha 49)

Exceção mantida:
- `src/components/ui/currency-input.tsx` — é input de digitação (o componente controla decimais internamente; alterar quebraria a UX de entrada). Não tocar.

## Detalhes técnicos

A mudança em cada arquivo é remover a chave que zera as casas decimais. Exemplo:

Antes:
```ts
new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n)
```

Depois:
```ts
new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
```

Para os casos com `R$ {n.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}` (PrjOverview, ArchitectPerformance), trocar por:
```ts
n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
```
(remove o "R$ " manual e usa o formatador padrão, que já inclui o símbolo e 2 casas).

## Escopo / fora do escopo

- Somente apresentação (frontend). Sem mudanças de schema, queries ou lógica.
- O helper `formatCurrency` em `src/lib/utils.ts` já usa o padrão de 2 casas — nenhum ajuste necessário lá.
