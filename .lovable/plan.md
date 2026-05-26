## Diagnóstico

Inspecionei o pedido afetado e a lógica do `EditOrderDialog`:

- **DB hoje (Pedido #12)**: `valor_total = 0`, `subtotal = 0`, **0 linhas em `order_items`** — os itens originais foram apagados.
- **Fluxo do `handleSubmit` em `EditOrderDialog.tsx`**:
  1. `UPDATE orders SET valor_total = total (calculado no React) …`
  2. `DELETE FROM order_items WHERE order_id = X` — **sempre, incondicional**
  3. `INSERT INTO order_items …` a partir do `state items`
- **Trigger `recalculate_order_totals`** (no `order_items`): a cada delete/insert ela faz `UPDATE orders SET subtotal = SUM(items.valor_total), valor_total = subtotal - desconto + frete`. Ou seja, sobrescreve o valor que o React acabou de mandar.

### Causa raiz
O `handleSubmit` apaga todos os itens **antes** de validar que existem itens para reinserir. Quando o `state items` está vazio (caso de race condition: dialog aberto e Salvar clicado antes do query `order-items-for-edit` resolver, ou items recarregados de outra forma), o fluxo executa:
- `DELETE` apaga tudo → trigger zera `valor_total`
- `INSERT []` não recoloca nada → pedido fica com R$ 0,00

Não há nenhuma validação `if (items.length === 0) abortar` nem checagem de "houve mudança real nos itens". Foi exatamente isso que ocorreu ao trocar só o vendedor.

## Plano de correção

### 1. `src/components/orders/EditOrderDialog.tsx` — `handleSubmit`
- **Bloquear o save** se `items.length === 0` OU se a query `orderItems` ainda não carregou (`isLoading`/`data === undefined`), com `toast.error("Itens do pedido ainda não foram carregados. Aguarde e tente novamente.")`.
- **Trocar o "delete-all + insert"** por uma estratégia mais segura:
  - Comparar `items` (estado) com `orderItems` (originais da query) por `id`.
  - **UPDATE** dos itens com `id` existente e que mudaram.
  - **INSERT** apenas dos itens novos (sem `id`).
  - **DELETE** apenas dos `id` que sumiram do estado.
  - Isso elimina a janela em que o pedido fica temporariamente sem itens (evita o trigger zerar `valor_total`) e impede perda de dados em races.
- Manter o `update` da tabela `orders` como está; a trigger continuará reconciliando o `valor_total` ao final, agora a partir dos itens corretos.

### 2. Restaurar o Pedido #12 (data fix)
Migração para recriar o item original do Pedido #12 com `valor_total = 40063.50` (valor conhecido pelo histórico do ledger), o que disparará a trigger e reporá `valor_total`/`subtotal` no pedido. Confirmar comigo o que deve ir como `descricao`/`centro_custo` antes de aplicar — ou eu uso `descricao = 'Item original'` + `centro_custo` do projeto vinculado se existir.

### 3. (Opcional, segurança extra)
Adicionar `WHEN (NEW.* IS DISTINCT FROM OLD.*)` ou um guard na trigger `recalculate_order_totals` para não rodar se a alteração não envolveu valores — apenas se quisermos blindar contra futuras regressões. Recomendo deixar para depois; o fix no front já resolve.

## Arquivos a alterar
- `src/components/orders/EditOrderDialog.tsx` (handleSubmit: guarda + diff-based items sync)
- 1 migração SQL para recompor os itens do Pedido #12

Confirma se posso aplicar (e se prefere que eu use `descricao = 'Item original'` para a linha restaurada)?