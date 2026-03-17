

## Plano: Comissões de Orçamentista, Projetista e Montador 100% no Centro de Custo "Planejados"

### Problema Atual
As comissões de Orçamentista, Projetista e Montador estão sendo rateadas proporcionalmente entre os centros de custo dos itens do pedido (ex: 77% Planejados, 23% Rústico). O correto é que essas três comissões sejam atribuídas 100% ao centro de custo **"Planejados"** (ID: `4d82d12e-...`).

### O que muda
- **Comissão Vendedor, Taxas (Cartão/Boleto), RT** → mantêm o rateio proporcional atual (sem alteração).
- **Comissão Orçamentista, Projetista, Montador** → valor integral (100%) atribuído ao CC "Planejados", sem rateio. Gerados **fora do loop** de itens, uma única vez cada.

### Alteração Técnica
Uma migration SQL que atualiza as duas functions:

1. **`create_receivable_from_order()`** — Mover os blocos de Orçamentista, Projetista e Montador para **fora do loop `FOR v_item`**, buscando o `cost_center_id` de "Planejados" via query direta (`SELECT id FROM fin_cost_centers WHERE name = 'Planejados'`). O valor inserido será o total da comissão (sem multiplicar por `v_item_proportion`).

2. **`update_financial_entries_on_order_edit()`** — Mesma alteração: mover as três comissões para fora do loop e atribuir 100% ao CC Planejados.

### Resumo do Impacto
- Pedidos futuros terão Orçamentista/Projetista/Montador no CC Planejados.
- Pedidos existentes não são afetados (apenas novos triggers).
- KPIs de Centro de Custo refletirão corretamente essas comissões concentradas em Planejados.

