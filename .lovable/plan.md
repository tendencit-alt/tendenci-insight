## Causa raiz

A tabela `fin_chart_accounts` tem 2 conjuntos de policies de RLS conflitantes:

- ✅ `tenant_isolation_select_fin_chart_accounts` — correta (mostra tenant + templates `is_core`)
- ❌ `Authenticated users can view fin_chart_accounts` com `USING (true)` — **vaza tudo**, inclusive os 79 registros template (`tenant_id IS NULL`)

Resultado: o usuário vê **a linha do próprio tenant + a linha do template** lado a lado. A Raiz 2 aparece duplicada (e na verdade Raízes 1, 3, 4, 5 e 6 também estão duplicando — só não foram notadas ainda).

Estado atual dos dados:
- Tenant `a1b2…7890` tem: `1`, `2`, `2.1` + filhos CMV, `3`, `4`, `5`, `6` (raízes vazias)
- Template (`tenant_id NULL`) tem: estrutura completa (79 contas) com `2.1` CMV, `2.2` Impostos, `2.3` Taxas, `2.4` Custos diretos, `2.5` Comissões, `2.6` Antecipação, etc.

## Correções

### 1. Remover policies permissivas (RLS)
Migration removendo:
- `Authenticated users can view fin_chart_accounts` (USING true)
- `Authenticated users can update fin_chart_accounts` (USING true)
- `Authenticated users can insert fin_chart_accounts` (sem qualificação)
- `Tenant users delete fin_chart_accounts` (duplicado de `tenant_isolation_delete_…`)

Sobram apenas as `tenant_isolation_*` + a leitura pública dos templates core, que é o comportamento correto multi-tenant.

### 2. Completar a estrutura do tenant
Após a correção de RLS, o tenant deixa de ver as contas template e fica só com `1`, `2`, `2.1` (+ filhos CMV), `3`, `4`, `5`, `6`. Precisa receber o restante via cópia da árvore template:

- `2.2 Impostos sobre venda` (+ 4 filhos: ICMS, ISS, PIS/COFINS, Simples Nacional)
- `2.3 Taxas sobre venda` (+ 4 filhos: cartão crédito, cartão débito, Pix, boleto)
- `2.4 Custos diretos da venda` (+ filhos atuais do template)
- `2.5 Comissões sobre venda` (+ filhos)
- `2.6 Antecipação de recebíveis` (+ filhos)
- E também os filhos de `1`, `3`, `4`, `5`, `6` que existem no template mas não no tenant

Será feito com um bloco recursivo que clona toda subárvore template → tenant, preservando `code`, `name`, `parent_id` (remapeando para os novos UUIDs) e demais campos, pulando `code`s que o tenant já tem.

### 3. Verificação
Após a migration:
```sql
SELECT code, name FROM fin_chart_accounts 
WHERE tenant_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
ORDER BY code;
```
Deve listar a estrutura completa sem duplicatas, e a UI mostrar uma única Raiz 2.

## Detalhes técnicos

- Tipo: 1 migration SQL (DROP POLICY + DO block recursivo de cópia)
- Sem alteração de código front-end (a query atual já filtra por `order("code")` e RLS fará o resto)
- Sem impacto em outros tenants (só existe 1 tenant real hoje)
- Templates (`tenant_id NULL`, `is_core=true`) permanecem intactos para futuros tenants
