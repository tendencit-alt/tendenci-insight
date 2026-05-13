# Simplificação da Navegação e UI

Objetivo: reduzir o sistema à UX de uma "marcenaria pequena começando", controlando visibilidade via feature flag por módulo. Nada é deletado — tudo é reversível.

## 1. Banco — tabela `modules_config`

Migration cria:

- `modules_config(module_key text PK, label text, icon text, category text, visible_in_menu bool default false, visible_in_routes bool default true, sort_order int, created_at, updated_at)`
- RLS: `SELECT` para `authenticated`; `INSERT/UPDATE/DELETE` apenas se `is_master_owner(auth.uid())` (função SECURITY DEFINER que lê `profiles.is_owner`).
- Seed com 51 módulos. Apenas estes 8 com `visible_in_menu=true`:
  `clientes, catalogo-produtos, pedidos, estoque, financeiro, dashboard, configuracoes-usuarios, configuracoes-marca`.
- Categorias: `comercial`, `operacional`, `financeiro`, `relatorios`, `configuracoes`, `futuro`, `master`.

## 2. Hook `useModulesConfig`

`src/hooks/useModulesConfig.ts` — React Query, retorna lista filtrada `visible_in_menu=true` agrupada por `category`. Cache 5min, invalidado quando `/configuracoes/modulos` salva.

## 3. Menu "Módulos" enxuto

Refatorar dropdown em `src/components/layout/AppNavbar.tsx` para consumir o hook. Resultado:

```text
COMERCIAL    → Clientes • Catálogo • Pedidos
OPERAÇÃO     → Estoque
FINANCEIRO   → Financeiro
RELATÓRIOS   → Dashboard
CONFIGURAÇÕES→ Usuários & Permissões • Marca & Catálogo
```

Categorias vazias somem automaticamente. Categoria `master` nunca entra aqui.

## 4. Painel Master separado

Novo componente `MasterPanelMenu` (ícone Crown no canto direito do header), só renderiza se `profile.is_owner === true`. Dropdown lateral com 4 grupos fixos (TENANTS, BILLING, PLATAFORMA, SAÚDE) listando rotas `/owner/*` já existentes. Remover essas rotas do menu Módulos / Configurações principal.

## 5. Simplificações por página

- **ModuleHeader compartilhado**: reduzir tabs de 6 → 2 (`Registros`, `Relatórios`). KPIs (antes em "Visão Geral") movem para topo de Registros.
- **Páginas Pedidos / Clientes / Produtos / Estoque / Financeiro**: remover barras "AÇÕES:" e "PRÓXIMO:". Único botão `+ Novo X` no canto direito do header.
- **Command Center (`/`)**: substituir 6 view-tabs por uma tela única "Hoje":
  - 4 KPIs: Receita do Mês • Pedidos Abertos • Saldo Caixa • Contas Vencidas
  - Seção "Caixa de Entrada" (Leads/Pedidos/Propostas — itens condicionados a `visible_in_menu` do módulo)
  - Seção "Hoje você precisa" (tarefas do dia)
  - Remover dropdown view-mode, search global visível, "Configuração do Sistema" (3 cards), "Status Executivo".
- **Dashboard (`/dashboard` = `/bi-dashboard`)**: 4 KPIs (Receita do Mês • Margem Bruta • Saldo Caixa • Inadimplência). Remover sub-tabs DRE/Fluxo/Planejamento/Orçamento/Forecast/Integração nesta versão.

## 6. Página `/configuracoes/modulos`

Nova rota visível só pra master_owner. Lista checkboxes por módulo agrupados por categoria, toggle em `visible_in_menu` (mutation direta). Invalida cache do menu ao salvar.

## 7. Reversibilidade

- Nenhum arquivo deletado. Nenhuma rota removida do `App.tsx`.
- Componentes antigos (tabs extras, barras de ação, view-tabs) ficam comentados/condicionados a flag, não removidos.
- URLs diretas continuam funcionando (`visible_in_routes=true`).

## Detalhes técnicos

- Função SQL: `is_master_owner(uid uuid) returns boolean` SECURITY DEFINER lendo `profiles.is_owner`.
- `useModulesConfig.isVisible(key)` exposto para condicionar seções (Leads na Caixa de Entrada, etc.).
- `AppNavbar.tsx`: substituir array hardcoded `MODULES` pelo retorno do hook; manter fallback estático enquanto carrega.
- Rota `/dashboard` aliasada para componente atual de `/bi-dashboard`; a versão simplificada vive em flag dentro do mesmo componente (`MODULES_SIMPLIFIED=true`).

## Validação

Após implementar: checar dropdown enxuto, painel master só pra owner, header de Pedidos com 2 tabs, `/` mostrando "Hoje", `/dashboard` com 4 KPIs, `/leads` ainda acessível por URL, `/configuracoes/modulos` togglando visibilidade em runtime.
