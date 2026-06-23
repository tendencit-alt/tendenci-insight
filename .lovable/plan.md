## Erro identificado

`Erro ao criar pedido: column "type" does not exist`

A função de trigger do banco `update_financial_entries_on_order_edit` (disparada em INSERT/UPDATE da tabela `orders`) executa esta consulta:

```sql
SELECT id INTO v_chart_receita
FROM public.fin_chart_accounts
WHERE (code = '1.1' OR LOWER(name) LIKE '%venda%')
  AND tenant_id = NEW.tenant_id
  AND type = 'RECEITA'
ORDER BY code ASC LIMIT 1;
```

A tabela `fin_chart_accounts` **não** tem coluna `type` — a coluna correta é `nature` (valores `RECEITA`, `DESPESA`, etc.). Quando o pedido é criado/ativado com status que dispara a geração financeira, o Postgres aborta com `column "type" does not exist` e o front mostra o toast.

## Correção

Migration que recria `public.update_financial_entries_on_order_edit` trocando o filtro `type = 'RECEITA'` por `nature = 'RECEITA'` no lookup de `fin_chart_accounts`. Todo o resto da função permanece igual (incluindo os usos legítimos de `type` em `fin_ledger_entries`, que possui essa coluna).

Nenhuma alteração de frontend é necessária.
