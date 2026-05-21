# Unificação Comercial: Projetos → CRM

Hoje o sistema tem **cinco entradas comerciais** que se sobrepõem e confundem:

| Rota | Conteúdo real |
|---|---|
| `/projetos` | Funil de obras (Recebido → Aprovado/Perdido) + KPIs + Performance de arquiteto |
| `/crm-comercial` | Pipeline + Propostas + Forecast de receita |
| `/prospeccao` | Overview + CRM de arquitetos + Tarefas + WhatsApp + Campanhas |
| `/propostas` | Stub "Em breve" |
| `/contratos` | Stub "Em breve" |

Vamos consolidar tudo em **um único módulo CRM** com três visões por papel.

## Decisão de arquitetura

- Rota canônica passa a ser **`/crm`** (rótulo "CRM").
- `/projetos`, `/crm-comercial`, `/prospeccao`, `/propostas`, `/contratos` viram **redirects** para `/crm` (preservando bookmarks).
- Página única `src/pages/CRM.tsx` substitui `Projetos.tsx`, `CRMCommercial.tsx`, `Prospeccao.tsx`, `Propostas.tsx`, `Contratos.tsx`.
- Componentes já existentes são **reaproveitados** (não reescritos). Só a casca/abas muda.

## Visões por perfil

Seletor no topo do módulo (chip-style, salva preferência por usuário):

**Visão SDR — "Captar e qualificar"**
- Abas: `Leads` · `Prospecção (Kanban arquitetos)` · `Campanhas WhatsApp` · `Tarefas do dia`
- Componentes: `ProspeccaoCRM`, `ProspeccaoTasksManager`, `CampanhasManager`, `WhatsAppConnectionManager`, `Leads`
- Esconde: forecast, custos, performance de arquiteto, contratos

**Visão Consultor — "Vender e fechar"**
- Abas: `Meu funil` · `Propostas` · `Contratos` · `Clientes`
- Componentes: `ProjectsBoard` (filtrado por responsável = usuário logado), `CRMProposalsTab`, lista de clientes simples
- Card de obra/projeto vira "Negociação" com botão único **Avançar etapa**
- Esconde: campanhas, KPIs gerenciais, performance comparativa

**Visão Gestor — "Acompanhar pipeline"**
- Abas: `Visão Geral` · `Pipeline completo` · `Forecast` · `Performance` · `Analytics`
- Componentes: `PrjOverview` (KPIs), `CRMPipelineTab`, `CRMForecastTab`, `ArchitectPerformance`, `PrjAnalyticsTab`, `DeadlineAlerts`
- Esconde: WhatsApp/Campanhas operacionais

A visão padrão é detectada pelo papel RBAC do usuário (`useRBACPermissions`), com fallback "Gestor" para owner/admin.

## O que sai do módulo (poluição removida)

- `PrjPlanningTab` e `PrjExecutionTab` (planejamento de tarefas e execução de obra) — **movidos para Operações → Produção**, onde realmente pertencem. Continuam acessíveis lá, não somem.
- `PrjCostsTab` — **movido para Financeiro → Custos por Projeto** (já existe lógica de `fin_origin_links`). Some do CRM.
- Sub-abas duplicadas de Propostas (existem hoje em `/crm-comercial` e como stub em `/propostas`) — unificadas numa única `CRMProposalsTab`.
- Stub "Coming soon" de Contratos — substituído por aba real reutilizando esqueleto de Propostas (lista + status + vincula a pedido). Se for vazio, mostra empty-state didático em vez de página "em breve".
- Aba "Produção (legado)" no sidebar (já estava lá, fica) — não é deste módulo.

## O que entra (faltava para um CRM completo e didático)

1. **Onboarding de 1 linha** no topo: "Você está em **Visão Consultor**. Aqui você acompanha seus negócios, envia propostas e fecha contratos." Troca conforme a visão. Botão "Trocar visão".
2. **Botão único de ação por card** (`Avançar etapa`) — hoje o usuário precisa abrir sheet e mexer em dropdown. Vamos expor o próximo passo direto no card (Recebido → "Pedir orçamento", Orçado → "Apresentar", etc.).
3. **Linha do tempo do lead** no detalhe — junta interações de WhatsApp (`prospeccao`), notas (`ProjectNotes`), mudanças de etapa e propostas enviadas num único histórico cronológico. Hoje está espalhado em 3 lugares.
4. **Resumo do dia** (topo da Visão SDR e Consultor): "Você tem X leads novos, Y tarefas atrasadas, Z propostas aguardando resposta." Usa hooks que já existem (`useActivityFeed`, `useAttentionLayer`).
5. **Empty states didáticos** em cada aba vazia, com botão de ação primária (ex.: "Nenhum lead ainda. Importar planilha de arquitetos →").
6. **Atalho de criação único** ("Novo negócio") no header, que abre wizard de 3 passos: cliente → etapa do funil → responsável. Substitui `CreateProjectDialog` complexo (15+ campos) para o usuário leigo. Campos avançados ficam num accordion "Mais opções".

## Mudanças técnicas

Arquivos novos:
- `src/pages/CRM.tsx` — casca com seletor de visão + tabs dinâmicas
- `src/components/crm/CRMViewSwitcher.tsx` — chips SDR/Consultor/Gestor + persistência (`localStorage` + `ui_preferences` se existir)
- `src/components/crm/views/SDRView.tsx`
- `src/components/crm/views/ConsultorView.tsx`
- `src/components/crm/views/GestorView.tsx`
- `src/components/crm/NewDealWizard.tsx` — wizard 3-passos substituindo o `CreateProjectDialog` no fluxo padrão
- `src/components/crm/DealTimeline.tsx` — timeline unificada

Arquivos editados:
- `src/App.tsx` — adicionar `/crm` apontando para `CRM.tsx`; transformar `/projetos`, `/crm-comercial`, `/prospeccao`, `/propostas`, `/contratos` em `<Navigate to="/crm" replace />`
- `src/components/layout/AppSidebar.tsx` — bloco "Vendas" passa a ter um único item **CRM** (`/crm`). Remover entradas de `Projetos`, `CRM & Pipeline`, `Orçamentos`, `Contratos`, `Leads`. `Pedidos`, `Clientes`, `Catálogo`, `Comissões` ficam (não são CRM).
- `src/lib/roadmap/screen-inventory.ts` e `src/components/smart-search/intentRegistry.ts` — atualizar slugs antigos para `/crm`.

Arquivos **mantidos como estão** (reaproveitados):
- `PrjOverview`, `ProjectsBoard`, `ProjectCard`, `ProjectDetailSheet`, `DeadlineAlerts`, `ArchitectPerformance`, `PrjAnalyticsTab`
- `CRMPipelineTab`, `CRMProposalsTab`, `CRMForecastTab`, `CRMAnalyticsTab`
- `ProspeccaoCRM`, `ProspeccaoTasksManager`, `CampanhasManager`, `WhatsAppConnectionManager`
- Tabelas `prj_projects`, `crm_*`, `prospeccao_*` — **sem mudança de schema**

Movimentações:
- `PrjPlanningTab` e `PrjExecutionTab` referenciados em `src/pages/ProducaoOperacoes.tsx` como abas novas "Planejamento de Obra" e "Execução"
- `PrjCostsTab` referenciado em `src/pages/Financeiro.tsx` (aba "Custos por Projeto")

## Validação

1. `/projetos`, `/crm-comercial`, `/prospeccao`, `/propostas`, `/contratos` redirecionam para `/crm`.
2. Sidebar mostra apenas **CRM** no bloco Vendas.
3. Trocar visão (SDR/Consultor/Gestor) muda as abas e persiste após reload.
4. Card de negócio mostra botão "Avançar etapa" e move o card de coluna ao clicar.
5. Timeline do lead mostra mensagens WhatsApp + notas + mudanças de etapa juntas.
6. Planejamento/Execução de obra agora aparecem em **Operações → Produção**, e Custos por Projeto em **Financeiro**.
7. Owner consegue navegar pela visão Gestor sem erros 403 (corrigir guardas que estavam barrando).
