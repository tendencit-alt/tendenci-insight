

## Plano: Rateio Proporcional dos Recursos Estratégicos por Centro de Custo

### Situacao Atual

Hoje, a receita e o custo de producao ja sao rateados proporcionalmente entre os centros de custo dos itens do pedido. Porem, os **8 recursos estrategicos restantes** (Taxa Cartao, Taxa Boleto, Taxa Link, RT, Vendedor, Orcamentista, Projetista, Montador, Producao) sao alocados 100% no centro de custo do cabecalho do pedido (`v_cost_center_id`).

### O Que Muda

Quando o pedido tiver itens com multiplos centros de custo (`v_has_cc_groups = true`), cada recurso estrategico sera rateado proporcionalmente, gerando **um lancamento por CC** no Livro Razao e no Contas a Pagar.

```text
Pedido R$100.000 (CC Nautico 60% + CC Rustico 40%)
├── Comissao Vendedor R$5.000
│   ├── CC Nautico: R$3.000 (60%)
│   └── CC Rustico: R$2.000 (40%)
├── Taxa Cartao R$2.000
│   ├── CC Nautico: R$1.200 (60%)
│   └── CC Rustico: R$800 (40%)
└── ... (mesma logica para todos os 8 tipos)
```

### Detalhes Tecnicos

**Arquivo alterado:** Uma nova migration SQL que recria a funcao `update_financial_entries_on_order_edit()`.

**Logica para cada um dos 8 recursos (itens 2 a 10 do trigger):**

1. Manter a resolucao de supplier/responsavel como esta (fora do loop)
2. Quando `v_has_cc_groups = true`:
   - Iterar sobre os grupos de CC (mesmo loop ja usado na receita e custo de producao)
   - Calcular `v_proportional_amount := valor_total_do_recurso * v_proportion`
   - Inserir um `fin_ledger_entries` + `fin_payables` por CC, com `cost_center_id = v_cc_group.cc_id` e descricao incluindo `[CC: nome]`
3. Quando `v_has_cc_groups = false`: manter comportamento atual (lancamento unico no CC do cabecalho)

**Recursos afetados:**
- Taxa Cartao (item 2)
- Taxa Boleto (item 3)
- Taxa Link Pagamento (item 4)
- RT (item 5)
- Comissao Vendedor (item 6)
- Comissao Orcamentista (item 7)
- Comissao Projetista (item 8)
- Comissao Montador (item 9)
- Comissao Producao (item 10)

Nao ha alteracao de schema -- apenas reescrita da funcao trigger existente.

