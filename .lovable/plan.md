

## Plano: Orçamento Automático 60% + Projetos Ativos com Filtro de Finalização

### Contexto
Atualmente, projetos financeiros (`fin_projects`) são criados com orçamento manual. O pedido precisa alimentar automaticamente o orçamento do projeto com 60% do valor da venda. Além disso, o projeto só deve ser finalizado quando o pedido chegar ao status "entregue", e o dashboard deve permitir filtrar projetos finalizados para visualizar toda a evolução.

### Alterações

#### 1. Trigger SQL — Orçamento automático de 60% no projeto
Na função `create_receivable_from_order()`, após gerar os lançamentos financeiros, adicionar lógica para **atualizar o budget do `fin_projects`** vinculado ao pedido:
- Buscar todos os `project_id` distintos dos `order_items` do pedido
- Para cada projeto, somar o `valor_total` dos itens vinculados a ele
- Calcular 60% desse valor e fazer `UPDATE fin_projects SET budget = COALESCE(budget, 0) + (valor_grupo * 0.6)` para cada projeto
- Mesma lógica na `update_financial_entries_on_order_edit()`: recalcular o budget (subtrair o antigo e somar o novo)

#### 2. Trigger SQL — Finalizar projeto quando pedido for "entregue"
Criar um novo trigger em `orders` que, quando `status` muda para `'entregue'`:
- Busca todos os `project_id` dos `order_items` desse pedido
- Para cada projeto, verifica se **todos** os pedidos vinculados a ele estão com status `'entregue'` ou `'cancelado'`
- Se sim, atualiza `fin_projects.status = 'concluido'` e `fin_projects.end_date = NOW()::date`

#### 3. Frontend — Filtro no ProjectKPIs (Dashboard BI)
No componente `ProjectKPIs.tsx`:
- Adicionar um toggle/filtro para alternar entre "Projetos Ativos" e "Projetos Finalizados" (concluídos)
- Quando "Finalizados" selecionado, buscar `fin_projects` com `status = 'concluido'`
- Manter a mesma tabela com Orçamento vs Executado vs Disponível para análise da evolução completa

#### 4. Frontend — Filtro no FinProjectsManager
No componente `FinProjectsManager.tsx`:
- Adicionar Select de status no topo (Ativos / Finalizados / Todos) para filtrar a tabela principal
- Projetos finalizados mostram badge "Concluído" e toda a evolução orçamento vs realizado

### Resumo de Arquivos Impactados
- **Migration SQL**: Atualizar `create_receivable_from_order()` e `update_financial_entries_on_order_edit()` + novo trigger para finalização
- **`src/components/financeiro/ProjectKPIs.tsx`**: Adicionar filtro Ativos/Finalizados
- **`src/components/financeiro/masters/FinProjectsManager.tsx`**: Adicionar filtro de status na tabela principal

