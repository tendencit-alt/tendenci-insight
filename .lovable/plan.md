

## Plano: Corrigir campo `responsavel_id` inexistente no trigger

### Problema
A migration criada para o rateio proporcional usa `NEW.responsavel_id` em toda a função trigger, mas esse campo **não existe** na tabela `orders`. O campo correto é `NEW.vendedor_id`.

O erro aparece ao salvar: *"record 'new' has no field 'responsavel_id'"*.

### Correção
Uma nova migration SQL que faz `CREATE OR REPLACE FUNCTION` substituindo **todas** as ocorrências de `NEW.responsavel_id` por `NEW.vendedor_id` na função `update_financial_entries_on_order_edit()`.

Também será corrigida a linha que busca o nome do responsável:
```sql
-- DE:
SELECT full_name INTO v_responsible_name FROM public.profiles WHERE id = NEW.responsavel_id;
-- PARA:
SELECT full_name INTO v_responsible_name FROM public.profiles WHERE id = NEW.vendedor_id;
```

### Escopo
- **1 migration SQL** — reescrita completa da função com a substituição global de `responsavel_id` → `vendedor_id`
- Nenhuma alteração de schema ou de código frontend

