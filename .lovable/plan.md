

## Problema

O campo `centro_custo` na tabela `orders` (cabeçalho) está `NULL` para o pedido Igreen. O centro de custo está armazenado apenas nos **itens** do pedido (`order_items.centro_custo = 'Planejados'`). A coluna na listagem lê `orders.centro_custo`, que é nulo.

## Solução

Modificar a query de listagem em `Orders.tsx` para incluir os itens do pedido e, na `OrdersTable`, exibir o centro de custo derivado dos itens quando o campo do cabeçalho estiver vazio.

### Passos

1. **Alterar a query em `Orders.tsx`** — adicionar `order_items(centro_custo)` no select para trazer os centros de custo dos itens junto com cada pedido.

2. **Atualizar `OrdersTable.tsx`** — na célula de Centro de Custo, fazer fallback: se `order.centro_custo` for nulo, extrair os valores únicos de `order.order_items` e exibi-los (ex: "Planejados"). Se houver múltiplos centros, separar por vírgula.

### Escopo técnico
- **`src/pages/Orders.tsx`**: adicionar `order_items(centro_custo)` ao select da query
- **`src/components/orders/OrdersTable.tsx`**: atualizar interface `Order` para incluir `order_items` opcional e ajustar a célula para mostrar o centro de custo dos itens como fallback

