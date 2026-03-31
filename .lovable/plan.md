

## Plano: Gerar Contas a Pagar para Taxas e RT

### Problema
O trigger `update_financial_entries_on_order_edit` cria lançamentos no Livro Razão para **Taxa Cartão**, **Taxa Boleto**, **Taxa Link** e **RT**, mas **não gera os títulos correspondentes em `fin_payables`**. Apenas comissões (Vendedor, Orçamentista, Projetista, Montador, Produção) e Receita geram títulos automaticamente.

### Solução
Atualizar o trigger para que, imediatamente após inserir cada lançamento de despesa de Taxa/RT no razão, também insira o registro correspondente em `fin_payables`, seguindo exatamente o mesmo padrão já usado nas comissões.

### Alteração Técnica

**Migração SQL** — Recriar a função `update_financial_entries_on_order_edit`:

Para cada um dos 4 blocos (Taxa Cartão, Taxa Boleto, Taxa Link, RT), adicionar após o `INSERT INTO fin_ledger_entries`:

```sql
) RETURNING id INTO v_expense_ledger_id;

INSERT INTO public.fin_payables (
  amount, due_date, competence_date, status, description,
  document_number, notes, ledger_entry_id, created_by,
  cost_center_id, project_id, order_id, chart_account_id
) VALUES (
  NEW.taxa_xxx_valor,
  (NOW() + interval '30 days')::date, v_competence_date, 'ABERTO',
  'PED #' || NEW.order_number || ' - Taxa/RT ...',
  v_doc_number, 'Gerado automaticamente...', 
  v_expense_ledger_id, NEW.created_by, 
  v_cost_center_id, NEW.project_id, NEW.id, v_chart_account_id
);
```

### Blocos a modificar (4 inserções novas):
1. **Taxa Cartão** (linha ~110-123) — adicionar `RETURNING id` + `INSERT fin_payables`
2. **Taxa Boleto** (linha ~126-139) — idem
3. **Taxa Link** (linha ~142-155) — idem
4. **RT** (linha ~158-176) — idem

### Correção de dados existentes
Uma segunda migração para criar os `fin_payables` faltantes nos pedidos atuais (PED-1, PED-2, PED-3), vinculando aos `ledger_entry_id` já existentes.

### Resultado
Todos os 10 tipos de lançamento (Receita + 4 Taxas + 5 Comissões) passarão a gerar títulos automaticamente no módulo de Contas a Pagar/Receber.

