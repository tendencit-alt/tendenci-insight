## Objetivo
Rodar uma validação end-to-end do sistema em SQL direto, criando dados marcados `[TESTE]`, corrigindo falhas no caminho, sem afrouxar segurança nem tocar EditOrderDialog / Pedido #12. Entregar relatório consolidado ao final.

## Estratégia geral
- Tudo via `psql` + `supabase--migration` (para correções de schema/policy/grant) + `supabase--insert` (para dados `[TESTE]`).
- Cada parte roda em **bloco transacional onde aplicável**; **dados `[TESTE]` ficam comitados** (para você apagar depois); **simulações de isolamento e provisionamento de tenant rodam em `BEGIN … ROLLBACK`**.
- Identificadores `[TESTE]` em todo `name`, `description`, `notes`, etc., para facilitar limpeza com `LIKE '%[TESTE]%'`.
- Tenant alvo: o tenant que possui o cost center `Planejados` (descobrir via `SELECT tenant_id FROM cost_centers WHERE name='Planejados'`).
- Para simular "usuário não-admin": usar `SET LOCAL role authenticated` + `SET LOCAL request.jwt.claims = '{"sub":"<uuid>","role":"authenticated"}'` com um user real do tenant que tenha role ≠ owner/admin. Se não existir, criar um perfil `[TESTE]` com `role='user'`.

## PARTE 1 — E2E RH/PJ
1. Localizar tenant Planejados, cost center, supplier "Folha de Pagamento" e "Prestadores PJ" (criar se faltar, marcados `[TESTE]`).
2. Inserir 1 `hr_employees` `[TESTE]` (CPF, salário, admissão, tenant_id).
3. Inserir 1 `pj_contracts` `[TESTE]` (CNPJ/CPF, valor mensal, vigência cobrindo o mês corrente, tenant_id).
4. Executar `SELECT public.generate_hr_payroll_payables(date_trunc('month', now())::date)` e `generate_pj_contract_payables(...)`.
5. Verificar em `fin_payables` (ou tabela equivalente de Contas a Pagar):
   - Existe linha com `origin in ('hr_payroll','pj_contract')`, valor = salário/valor contrato, `tenant_id` correto.
6. Rodar as duas funções de novo (idempotência) e confirmar que `count(*)` não dobra.
7. Verificar DRE: somar `fin_ledger_entries` por `competence_date` do mês — confirmar uma única ocorrência por origem.
8. Se quebrar: ler erro, ajustar função/policy/grant via `migration`, repetir.

## PARTE 2 — Regressão pós-migrações de segurança

### 2a. E2E pedido como NÃO-admin
1. Identificar/criar user `[TESTE]` no tenant com role `user` (não admin, não owner).
2. `SET LOCAL` para esse user. Em sequência:
   - Criar `customer` `[TESTE]`
   - Criar `order` rascunho `[TESTE]`
   - Inserir `order_items`
   - Promover status: rascunho → ativo → aprovado → faturado → entregue (via `UPDATE` direto, respeitando a state machine).
3. Após cada transição verificar a propagação:
   - `projects` criado com nome `[CC] - [Client] #[order]`
   - `order_compromissos` gerados
   - `fin_receivables` criado com valor correto
   - `fin_ledger_entries` (RECEITA) lançada
   - `production_orders` por item
   - `inventory_reservations` (se aplicável)
   - `delivery_orders` / `assembly_orders`
   - `cross_module_events` registrando o fluxo
4. Toda falha do tipo `permission denied`, `RLS`, `tenant_id NOT NULL`, `restrictive policy` → corrigir via migração:
   - Faltou `GRANT` para `authenticated`? Adicionar.
   - Policy RESTRICTIVE bloqueando insert legítimo de filha sem tenant herdado? Adicionar trigger `BEFORE INSERT` que herda `tenant_id` do pai (sem afrouxar policy).
   - Função `SECURITY DEFINER` sem `SET search_path = public`? Corrigir.

### 2b. CRUD básico nos módulos principais (como user `[TESTE]`)
Para cada um: insert + select + update marcando `[TESTE]`:
- CRM: `leads`, `deals`
- `customers`
- `products`
- `inventory_items` / `stock_movements`
- `purchase_orders`
- `production_orders`
- `delivery_orders`, `assembly_orders`

Corrigir regressões idênticas ao 2a.

## PARTE 3 — Isolamento + provisionamento (ROLLBACK)
1. **Isolamento cross-tenant**: pegar 2 tenants distintos (criar segundo `[TESTE]` se necessário). Em transação:
   - `SET LOCAL` como user do tenant A → tentar `SELECT/INSERT/UPDATE` em linhas do tenant B (orders, customers, fin_*, ia_processing_failures, cadences, cadence_steps, hr_employees, pj_contracts).
   - Deve retornar 0 linhas / erro de policy.
   - `ROLLBACK`.
2. **Provisionamento de tenant novo**:
   - `BEGIN`; criar tenant `[TESTE]` + owner profile; rodar a função de provisionamento padrão (`provision_new_tenant` ou equivalente); validar que nascem: plano de contas (6 raízes), cost centers core, status registry, RBAC profiles, automation_rules system defaults, etc.
   - Verificar contagem mínima esperada de cada artefato.
   - `ROLLBACK`.
3. Qualquer gap → corrigir a função de provisionamento (migração) e re-testar.

## Re-scan de segurança
- Ao final: `security--run_security_scan` → confirmar 0 findings exploráveis.
- Se aparecer algo novo introduzido pelas correções, corrigir imediatamente.

## Entregável
Relatório consolidado em markdown na chat:
- ✅ Passou (lista)
- 🔧 Corrigido (item → causa → fix aplicado, com referência à migração)
- ⚠️ Pendente (se algo não pôde ser corrigido nesta passada)
- 🔒 Scan: 0 exploráveis
- 🧹 Lista de IDs `[TESTE]` para você apagar depois (por tabela).

## Garantias
- Nenhum `UPDATE/DELETE` em EditOrderDialog, Pedido #12, ou registros não-`[TESTE]`.
- Nenhuma policy afrouxada: correções fazem **herança de tenant_id via trigger**, **GRANTs específicos por role**, ou **ajuste de signature de função**. Nada de `USING (true)`.
- Idempotente: o script detecta dados `[TESTE]` existentes e reaproveita em vez de duplicar.

Posso prosseguir?
