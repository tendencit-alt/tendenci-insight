
## Plano: Sistema Multi-Tenant SaaS

### Visão Geral
Transformar o sistema atual (single-tenant) em uma plataforma SaaS multi-tenant onde:
- **Super Admin** (você/Pablo): dono do sistema, gerencia todas as empresas e pode ver todos os dados
- **Admin de Empresa**: cada empresa contratante tem seu admin que gerencia seus próprios usuários
- **Isolamento total**: cada empresa vê apenas seus próprios dados
- **Planos com limites**: controle de quantidade de usuários por empresa

---

### Fase 1 — Estrutura de Dados (Migrations)

#### 1.1 Tabela `tenants` (Empresas contratantes)
| Campo | Tipo | Descrição |
|---|---|---|
| `id` | uuid | ID da empresa |
| `name` | text | Nome da empresa |
| `slug` | text | Identificador único (URL-friendly) |
| `plan` | text | Plano contratado (basic/pro/enterprise) |
| `max_users` | int | Limite de usuários do plano |
| `active` | boolean | Empresa ativa/inativa |
| `created_at` / `updated_at` | timestamp | Datas |

#### 1.2 Tabela `tenant_plans` (Definição dos planos)
| Campo | Tipo | Descrição |
|---|---|---|
| `id` | uuid | ID do plano |
| `name` | text | Nome (Básico, Pro, Enterprise) |
| `max_users` | int | Limite de usuários |
| `price` | numeric | Valor mensal |
| `features` | jsonb | Features incluídas |

#### 1.3 Alteração na tabela `profiles`
- Adicionar coluna `tenant_id` (uuid, FK → tenants)
- Adicionar coluna `is_super_admin` (boolean, default false)
- O Pablo atual receberá `is_super_admin = true` e `tenant_id` de uma empresa "Sistema"

#### 1.4 Alteração na tabela `company_settings`
- Adicionar coluna `tenant_id` (uuid, FK → tenants)
- Cada empresa terá sua própria configuração de branding

---

### Fase 2 — Isolamento de Dados (RLS por tenant)

Todas as tabelas principais receberão a coluna `tenant_id` e políticas RLS:
- `orders`, `order_items`, `clients`, `suppliers`, `architects`
- `crm_deals`, `crm_pipelines`, `crm_stages`, `leads`
- `fin_*` (todas as tabelas financeiras)
- `production_*`, `stock_*`

**Política padrão**: 
- Usuários comuns: `tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())`
- Super Admin: acesso a todos os tenants

**Função helper**:
```sql
CREATE FUNCTION get_user_tenant_id() RETURNS uuid AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE FUNCTION is_super_admin() RETURNS boolean AS $$
  SELECT is_super_admin FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

---

### Fase 3 — Interface do Super Admin

#### 3.1 Painel de Empresas (`/admin/tenants`)
- Lista todas as empresas cadastradas
- Criar/editar/desativar empresas
- Atribuir plano e limite de usuários
- Ver quantidade de usuários ativos vs limite

#### 3.2 Gerenciamento de Admins
- Criar admin para cada empresa
- Resetar senha de admins
- Visualizar dados de qualquer empresa (switch de contexto)

#### 3.3 Dashboard do Super Admin
- Total de empresas ativas
- Total de usuários no sistema
- Receita por plano
- Empresas criadas recentemente

---

### Fase 4 — Adaptação do Fluxo Existente

#### 4.1 Cadastro de nova empresa
1. Super Admin cria tenant + admin
2. Admin da empresa faz login e configura branding (company_settings)
3. Admin cria seus usuários dentro do limite do plano

#### 4.2 Login
- Após login, o sistema identifica o `tenant_id` do usuário
- Super Admin vê menu extra "Gestão de Empresas"
- Admin de empresa vê o sistema normal (isolado)

#### 4.3 Verificação de limites
- Ao criar usuário, verificar `COUNT(profiles WHERE tenant_id = X) < tenant.max_users`
- Bloquear criação se limite atingido

---

### Fase 5 — Migração dos Dados Existentes

1. Criar tenant "Tendenci" (ou nome atual)
2. Atribuir `tenant_id` a todos os registros existentes
3. Marcar Pablo como `is_super_admin = true`
4. Todos os usuários existentes recebem o tenant_id da empresa atual

---

### ⚠️ Escopo e Riscos

**Esta é a maior mudança arquitetural do sistema.** Envolve:
- ~50+ tabelas precisam de `tenant_id`
- ~50+ políticas RLS precisam ser reescritas
- Todas as queries do sistema precisam considerar tenant
- Triggers existentes precisam propagar `tenant_id`

**Recomendação**: Implementar em fases incrementais:
1. **Fase 1**: Criar estrutura base (tenants, plans, profiles alterado) + Super Admin UI
2. **Fase 2**: Adicionar `tenant_id` nas tabelas principais + RLS
3. **Fase 3**: Adaptar triggers e lógica de negócio
4. **Fase 4**: Testes e refinamentos

Devo começar pela **Fase 1** (estrutura base + tela do Super Admin)?
