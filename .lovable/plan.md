## Problema

Em `/fornecedores`, o KPI "Total Fornecedores" mostra **7** para o Owner mesmo no tenant Master Owner, que não tem nenhum fornecedor cadastrado.

## Causa

A função `public.suppliers_metrics()` é `SECURITY DEFINER` e conta **globalmente**, ignorando RLS e `tenant_id`:

```sql
'total_suppliers', (SELECT COUNT(*) FROM suppliers WHERE active = true)
```

Os 7 fornecedores existem em outro tenant (Tendenci Planejados) e vazam para a contagem do Owner. O mesmo vale para `purchases_this_month`, `purchases_value_this_month` e `pending_orders`.

Além disso, o `queryKey` do `SuppliersKPIs` não inclui o tenant ativo, então não revalida ao trocar de empresa.

## Mudanças

### 1. Banco — recriar `suppliers_metrics()` com filtro por tenant
Substituir a função para escopar pelo tenant ativo do usuário (`get_user_tenant_id()`). Quando o usuário estiver no Master Owner (estrutura/templates) ou sem tenant, todos os contadores retornam 0.

```sql
CREATE OR REPLACE FUNCTION public.suppliers_metrics()
RETURNS json
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid := public.get_user_tenant_id();
  result json;
BEGIN
  IF v_tenant IS NULL
     OR v_tenant = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid THEN
    RETURN json_build_object(
      'total_suppliers', 0,
      'purchases_this_month', 0,
      'purchases_value_this_month', 0,
      'pending_orders', 0
    );
  END IF;

  SELECT json_build_object(
    'total_suppliers',
      (SELECT COUNT(*) FROM suppliers
        WHERE active = true AND tenant_id = v_tenant),
    'purchases_this_month',
      (SELECT COUNT(*) FROM purchase_orders
        WHERE tenant_id = v_tenant
          AND created_at >= date_trunc('month', CURRENT_DATE)),
    'purchases_value_this_month',
      (SELECT COALESCE(SUM(total), 0) FROM purchase_orders
        WHERE tenant_id = v_tenant
          AND created_at >= date_trunc('month', CURRENT_DATE)
          AND status <> 'cancelado'),
    'pending_orders',
      (SELECT COUNT(*) FROM purchase_orders
        WHERE tenant_id = v_tenant
          AND status IN ('enviado','confirmado','parcial'))
  ) INTO result;
  RETURN result;
END;
$$;
```

### 2. Frontend — `SuppliersKPIs.tsx`
- Incluir `activeTenantId` no `queryKey` para revalidar ao trocar de tenant.
- Desabilitar a query quando `onMasterOwner` (mesmo padrão já aplicado em `Suppliers.tsx`), evitando hit desnecessário e mostrando 0.

Nenhuma outra tela precisa mudar — `suppliers_metrics` só é consumido aqui.

## Verificação

- Owner no Master Owner → KPIs zerados.
- Owner impersonando Tendenci Planejados → total = 7.
- Owner impersonando Tendenci Mobiliarios → total = 0.
- Usuário comum → vê apenas seu tenant.
