## Problema

Hoje a venda **não dá baixa** no estoque: não existe trigger entre `order_items` e `stock_movements`. O badge "Sem estoque" no seletor de produto é apenas visual e não bloqueia, mas como nada é decrementado, o estoque nunca chega a ficar negativo. O trigger `update_product_stock` em `stock_movements` já permite saldo negativo (não há `GREATEST(0, …)`).

## Decisões aprovadas

- Baixa **ao criar o item do pedido** (`order_items` INSERT).
- Estoque negativo é **permitido** e **destacado em vermelho** na UI.

## O que será feito

### 1. Migration: baixa automática de estoque na venda

Criar trigger `AFTER INSERT/UPDATE/DELETE ON order_items` que mantém um `stock_movements` espelho do item:

- **INSERT** com `product_id` not null → cria movimento `movement_type = 'saida'`, `reference_type = 'order_item'`, `reference_id = NEW.id`, `quantity = NEW.quantity`, `tenant_id = NEW.tenant_id`. O trigger existente de `stock_movements` decrementa `products.current_stock` (pode ficar negativo).
- **UPDATE** de `quantity` ou `product_id` → estorna o movimento anterior (entrada compensatória) e cria o novo de saída.
- **DELETE** → cria entrada compensatória (`movement_type = 'entrada'`, `reference_type = 'order_item_revert'`).
- Itens sem `product_id` (serviço, produto avulso) são ignorados.
- Idempotência: a função busca movimento existente por `(reference_type='order_item', reference_id=order_item.id)` antes de inserir, evitando duplicação em re-execuções.

### 2. Reconciliação retroativa

Script único na mesma migration:
- Para cada `order_items` existente com `product_id` que ainda não tenha `stock_movement` correspondente, gerar a saída.
- Recalcula `products.current_stock` somando movimentos (entrada − saída) para corrigir divergências históricas.

### 3. UI: destaque de estoque negativo

Componentes a ajustar (somente visual, sem mudar regra de negócio):

- `src/components/inventory/ProductsTable.tsx` — célula de estoque: se `current_stock < 0`, badge `variant="destructive"` com texto `Negativo: {valor}`.
- `src/components/orders/OrderItemsTable.tsx` (linha 387-388) — badge do seletor: 3 estados → `> 0` default, `= 0` secondary "Sem estoque", `< 0` destructive "Negativo: {valor}".
- `src/components/inventory/InventoryKPIs.tsx` — adicionar KPI "Estoque Negativo" (count de produtos com `current_stock < 0`) ao lado de "Sem Estoque".
- `src/components/inventory/LowStockAlerts.tsx` — listar produtos negativos no topo com severidade alta.
- `src/pages/Produtos.tsx` (linha 290) — mesmo tratamento do badge.

Nenhum bloqueio de venda é adicionado: usuário pode vender mesmo com saldo negativo.

### 4. Detalhes técnicos

```sql
CREATE OR REPLACE FUNCTION public.sync_order_item_stock_movement()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_prev_stock NUMERIC;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.product_id IS NOT NULL THEN
      SELECT current_stock INTO v_prev_stock FROM products WHERE id = OLD.product_id;
      INSERT INTO stock_movements (tenant_id, product_id, movement_type, quantity,
        previous_stock, reference_type, reference_id, notes)
      VALUES (OLD.tenant_id, OLD.product_id, 'entrada', OLD.quantity,
        COALESCE(v_prev_stock, 0), 'order_item_revert', OLD.id,
        'Estorno automático de venda (item removido)');
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.product_id IS NOT NULL
     AND (OLD.quantity <> NEW.quantity OR OLD.product_id IS DISTINCT FROM NEW.product_id) THEN
    SELECT current_stock INTO v_prev_stock FROM products WHERE id = OLD.product_id;
    INSERT INTO stock_movements (...) VALUES (...'entrada'... reference_type='order_item_revert');
  END IF;

  IF NEW.product_id IS NOT NULL THEN
    SELECT current_stock INTO v_prev_stock FROM products WHERE id = NEW.product_id;
    INSERT INTO stock_movements (tenant_id, product_id, movement_type, quantity,
      previous_stock, reference_type, reference_id, notes)
    VALUES (NEW.tenant_id, NEW.product_id, 'saida', NEW.quantity,
      COALESCE(v_prev_stock, 0), 'order_item', NEW.id,
      'Baixa automática de venda');
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_order_item_stock
AFTER INSERT OR UPDATE OR DELETE ON order_items
FOR EACH ROW EXECUTE FUNCTION sync_order_item_stock_movement();
```

Observação: `stock_movements.previous_stock` e `new_stock` continuam sendo calculados pelo trigger `update_product_stock` já existente — o `previous_stock` que passamos é só placeholder.

## Fora de escopo

- Reserva de estoque por status de pedido (rascunho vs confirmado).
- Bloqueio configurável por produto (já existe campo `permite_venda_sem_estoque` mas não será usado nessa entrega — venda nunca é bloqueada).
- Controle por localização (`location_id`).