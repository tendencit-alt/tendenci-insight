

## Plano: Padronizar exibição de datas nos lançamentos do BI

### Problema
No drill-down do BI (ao expandir uma categoria), os lançamentos exibem datas de forma inconsistente:
- Alguns mostram data, outros mostram "-"
- A data exibida vem de `cash_date || competence_date` (linha 224 do DashboardBI.tsx), então se ambos forem nulos, não aparece data
- O pedido "Juliano" pode ter 2 lançamentos com datas diferentes (cash_date vs competence_date)

### Alteração

**`src/components/financeiro/DashboardBI.tsx`**

1. Na construção do `EntryData` (linha 224), priorizar `competence_date` como fallback confiável:
   ```
   date: entry.cash_date || entry.competence_date
   ```
   Isso já está correto, mas vamos garantir que **sempre** exista uma data — se ambas forem nulas, usar a data do período filtrado ou mostrar "Sem data" de forma padronizada.

2. No render dos lançamentos expandidos (linha 442), padronizar o formato para **todos** os lançamentos:
   - Sempre exibir a data no formato `dd/MM/yy`
   - Se não houver data, exibir um badge sutil "Sem data" em vez de "-"
   - Manter a mesma posição e estilo para todos os itens

### Resultado
Todos os lançamentos no drill-down do BI terão o mesmo padrão visual: data formatada consistentemente à esquerda da descrição, sem variações de layout entre itens com e sem data.

