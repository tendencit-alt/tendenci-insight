

## Plano: Adicionar seleção de Categoria de Receita no Pedido

### Problema
O trigger `create_receivable_from_order` hardcoda `WHERE code = '1'` (conta raiz) para a categoria contábil. O correto é permitir que o usuário escolha entre as subcontas de receita (1.1 - Vendas de Produto, 1.2 - Prestação de Serviços e suas subcategorias) durante a criação/edição do pedido.

### Alterações

**1. Migration SQL — adicionar coluna + corrigir trigger**
- Adicionar coluna `chart_account_id UUID REFERENCES fin_chart_accounts(id)` na tabela `orders`
- Corrigir dados existentes: mover lançamentos de `code = '1'` para `code = '1.1'`
- Recriar trigger `create_receivable_from_order`: usar `NEW.chart_account_id` se preenchido, senão fallback para `code = '1.1'`
- Recriar trigger `update_financial_entries_on_order_edit`: mesma lógica

**2. `src/components/orders/CreateOrderDialog.tsx`**
- Adicionar campo `chart_account_id` ao formulário (na aba de identificação ou itens)
- Buscar contas de receita filhas de `code = '1'` (1.1, 1.2, 1.2.1, 1.2.2, etc.) com Select hierárquico
- Default: `1.1 - Vendas de Produto`
- Salvar `chart_account_id` no INSERT do pedido

**3. `src/components/orders/EditOrderDialog.tsx`**
- Replicar o mesmo campo de categoria de receita (paridade funcional)
- Carregar valor atual do pedido

### Detalhes técnicos

```sql
-- Coluna nova
ALTER TABLE orders ADD COLUMN chart_account_id uuid REFERENCES fin_chart_accounts(id);

-- Corrigir dados existentes
UPDATE fin_ledger_entries 
SET chart_account_id = (SELECT id FROM fin_chart_accounts WHERE code = '1.1')
WHERE chart_account_id = (SELECT id FROM fin_chart_accounts WHERE code = '1');

UPDATE fin_receivables 
SET chart_account_id = (SELECT id FROM fin_chart_accounts WHERE code = '1.1')
WHERE chart_account_id = (SELECT id FROM fin_chart_accounts WHERE code = '1');

-- Trigger usa NEW.chart_account_id com fallback
v_chart_account_id := COALESCE(
  NEW.chart_account_id, 
  (SELECT id FROM fin_chart_accounts WHERE code = '1.1' LIMIT 1)
);
```

O Select exibirá as contas agrupadas:
- 1.1 - Vendas de Produto
- 1.2 - Prestação de Serviços
  - 1.2.1 - Projetos
  - 1.2.2 - Manutenção / Assistência
- 1.3 - Frete Sobre Venda

### Resultado
O pedido passa a carregar a categoria contábil correta para o financeiro, sem hardcode. Dados existentes são corrigidos para `1.1`.

