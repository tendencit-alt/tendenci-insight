

## Plano: Simplificar filtro de datas — usar apenas Data de Criação

### Problema
O seletor "Dt. Emissão / Dt. Criação" confunde o usuário e adiciona complexidade desnecessária.

### Solução
Remover o seletor `dateField` e fixar o filtro de período sempre em `created_at`.

### Alterações

**1. `src/components/orders/OrdersFilters.tsx`**
- Remover o `<Select>` de `dateField` (linhas 169-177)
- Remover `dateField` da interface e do `clearFilters`

**2. `src/pages/Orders.tsx`**
- Remover `dateField` do state `filters` inicial
- Fixar a query para sempre filtrar por `created_at` (remover lógica condicional de `dateColumn`)

**3. `src/components/orders/OrdersKPIs.tsx`** (se referencia `dateField`)
- Ajustar para usar `created_at` fixo

### Resultado
Um filtro de período mais limpo, sem ambiguidade, sempre baseado na data de criação do pedido.

