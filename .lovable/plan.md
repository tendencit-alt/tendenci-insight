

## Plano: Rateio de Receita por Centro de Custo dos Itens

### Problema
A trigger `update_financial_entries_on_order_edit` resolve o centro de custo com `LIMIT 1` dos itens do pedido — pega apenas o primeiro e aplica a **todos** os lançamentos financeiros. No pedido do Juliano, os itens "Rústico" (R$15.900) e "Náutico" (R$12.870) ficam todos lançados como "Náutico".

### Solução
Reescrever a trigger para gerar **um lançamento de receita por centro de custo distinto**, rateando o valor proporcionalmente pelos itens.

### Mudanças

**1. Alterar a trigger `update_financial_entries_on_order_edit` (migração SQL)**

Substituir a lógica atual de receita única por um loop que:
- Agrupa os `order_items` por `centro_custo` (e `project_id` do item, se disponível)
- Para cada grupo, calcula o subtotal dos itens
- Cria um `fin_ledger_entries` (RECEITA) separado por centro de custo com o valor proporcional
- Cria um `fin_receivables` separado por centro de custo
- A descrição incluirá o nome do centro de custo: `Pedido #X - Receita (Náutico)`

Para **comissões e taxas** (que são calculadas sobre o valor total do pedido), a lógica será:
- Ratear proporcionalmente entre os centros de custo, baseado no peso de cada CC no valor total
- Cada comissão gera N lançamentos (um por CC), com valor = `comissão_total × (valor_cc / valor_total)`

**2. Manter o fallback**
- Se não houver itens ou todos os itens não tiverem centro de custo, comportamento atual (CC nulo ou do header)

### Exemplo concreto (pedido Juliano)
```text
Antes:  1 receita R$28.770 → Náutico
Depois: 1 receita R$15.900 → Rústico
        1 receita R$12.870 → Náutico
```

### Detalhes Técnicos
- Uma migração SQL com `CREATE OR REPLACE FUNCTION`
- Loop via `FOR v_item IN (SELECT centro_custo, SUM(valor_total) ... GROUP BY centro_custo)`
- O `document_number` permanece o mesmo (`PED-X`) para todos os lançamentos do pedido
- O `parent_entry_id` para despesas referenciará o primeiro `ledger_id` criado (mantendo a hierarquia)
- Nenhuma alteração de código frontend necessária

