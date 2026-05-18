## Objetivo

Trazer de volta a visão rica de Projetos (que existia em `Projects.tsx` mas não estava roteada) e criar uma nova aba **Projetos** dentro de `/operacao` focada em acompanhar a evolução da produção (OPs vinculadas), com KPIs no topo e toggle Kanban/Tabela.

## Situação atual

- `/projetos` aponta para `Projetos.tsx` (37 linhas, abas vazias `PrjCadastroTab`, `PrjPlanningTab`, etc.).
- `Projects.tsx` (450 linhas) existe mas **não está roteado** — contém KPIs por estágio, `ProjectsBoard` (Kanban), `ProjectsTable`, `ProjectsFilters`, `DeadlineAlerts`, `ArchitectPerformance`, `ProjectDetailSheet`, `KPIDetailDialog`. Usa a tabela `projects` (estágios comerciais: recebido → em_orcamento → orcado → apresentado → em_negociacao → aprovado/perdido).
- `/operacao` (`ProducaoOperacoes.tsx`) tem 5 abas: Ordens, Planejamento, Execução, Custos, Analytics — sem aba Projetos.
- Tabela `production_orders` já existe e é a fonte para evolução de produção (linkada a `projects` via cost center / order).

## Mudanças

### 1. Reativar `/projetos` com a UI rica

- Substituir o conteúdo de `src/pages/Projetos.tsx` para renderizar a página rica (KPIs por estágio comercial + Board/Tabela + Filtros + DeadlineAlerts + ArchitectPerformance), mantendo o wrapper `DashboardLayout` + `ModuleShell` (canônico do projeto).
- Manter as quatro sub-abas existentes (Cadastro, Planejamento, Execução, Custos) **dentro** de `ModuleShell records`, mas a aba inicial **Cadastro** passa a exibir a visão rica (Kanban/Tabela com KPIs e filtros) em vez do esqueleto atual.
- Manter `PrjAnalyticsTab` em `reports`.
- A página atual `Projects.tsx` vira o conteúdo da aba Cadastro (extraído como componente `PrjOverview.tsx` em `src/components/projects/`), e o arquivo `Projects.tsx` solto é removido.

### 2. Nova aba **Projetos** em `/operacao`

- Adicionar `TabsTrigger value="projetos"` em `ProducaoOperacoes.tsx` (entre "Ordens" e "Planejamento") com ícone `FolderKanban`.
- Criar `src/components/ops/OpsProjectsTab.tsx`:
  - **KPIs no topo** (cards horizontais): Projetos em produção, Aguardando início, Atrasados (deadline < hoje), Concluídos no mês, % OPs no prazo.
  - **Toggle Kanban ⇄ Tabela** (Tabs internas).
  - **Kanban**: colunas pelos estágios de produção das OPs vinculadas (ex.: `aguardando`, `em_producao`, `montagem`, `acabamento`, `entregue`) usando as etapas já definidas em `mem://modules/production/kanban-editable-stages`. Cards exibem: nome do projeto, cliente, % OPs concluídas, deadline, responsável; drag-and-drop atualiza o estágio agregado.
  - **Tabela**: linhas = projetos aprovados; colunas = cliente, valor, deadline, OPs (concluídas/total com barra de progresso), próximo SLA, responsável, ações (abrir detalhe).
  - **Filtros**: período (deadline), cost center, status agregado, responsável, busca.
  - Reaproveita `ProjectDetailSheet` para abrir o painel lateral.
- Fonte de dados: `projects` (apenas `stage='aprovado'`) join com `production_orders` agregando contagem/% por projeto. Query direta no Supabase respeitando RLS (memory: dashboard direto no Postgres).

### 3. Navegação

- Sidebar e Home Launcher já apontam para `/projetos` — sem mudança.
- Quick action no Home Launcher: link "Projetos em produção" → `/operacao?tab=projetos`.

## Detalhes técnicos

- Estágios de produção lidos de `production_kanban_stages` (ou hook existente equivalente) para manter editabilidade.
- Drag-and-drop reaproveita o pattern do Kanban de Ordens (`OpsOrdersTab`/`ProjectsBoard`).
- KPIs calculados client-side a partir do resultado da query agregada (sem edge function nova).
- `ProducaoOperacoes.tsx` passa a aceitar `?tab=` via `useSearchParams` para deep-link.
- Toda nova UI usa tokens semânticos do design system; sem cores hardcoded.

## Arquivos

**Criar**
- `src/components/ops/OpsProjectsTab.tsx`
- `src/components/projects/PrjOverview.tsx` (extraído de `Projects.tsx`)
- `src/hooks/useProjectProductionProgress.ts` (agregação projects + production_orders)

**Editar**
- `src/pages/Projetos.tsx` — usa `PrjOverview` na aba Cadastro
- `src/pages/ProducaoOperacoes.tsx` — adiciona TabsTrigger/TabsContent "projetos" + `useSearchParams`
- `src/pages/HomeLauncher.tsx` — atalho opcional para `/operacao?tab=projetos`

**Remover**
- `src/pages/Projects.tsx` (conteúdo migrado para `PrjOverview.tsx`)

## Fora de escopo

- Mudanças de schema (todas as tabelas necessárias já existem).
- Novas regras de RLS.
- Edição dos estágios de produção (já existe em outra tela).
