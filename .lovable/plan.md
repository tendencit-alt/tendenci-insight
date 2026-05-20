## Objetivo

Tornar as configurações financeiras (Plano de Contas, Estrutura DRE/Fluxo de Caixa, Centros de Custo, Projetos, Compromissos Sobre Venda, Responsáveis, Taxas Cartão, Automações por Origem, Automações por Evento, Permissões Financeiras) acessíveis diretamente dentro da página **Configurações** (`/configuracoes`), em vez de só na rota separada `/cadastros-financeiros`.

## Situação atual

- `/configuracoes` (`ProjectSettings.tsx`) só mostra 4 abas: Usuários, Tipos de Perfil, Empresa, Personalização.
- A tela `CadastrosFinanceiros.tsx` (`/cadastros-financeiros`) já contém todos os managers financeiros (ChartAccountsManager, CostCentersManager, FinProjectsManager, StrategicResourceCategoriesManager, OrderResponsiblesManager, CardRatesManager, OriginRulesMatrix, EventAutomationRulesPanel, FinancePermissionsMatrix), mas o usuário não percebe que ela existe a partir do menu Configurações.
- O dropdown "Configurações" do navbar lista apenas Usuários, Permissões e Integrações.

## Mudanças

### 1. Adicionar nova aba "Financeiro" em `src/pages/ProjectSettings.tsx`

Inserir como 5ª aba (visível para `isMaster`), com sub-abas internas reaproveitando os managers existentes:

- Plano de Contas / Estrutura DRE & Fluxo de Caixa → `ChartAccountsManager`
- Centros de Custo → `CostCentersManager`
- Projetos → `FinProjectsManager`
- Compromissos Sobre Venda → `StrategicResourceCategoriesManager`
- Responsáveis → `OrderResponsiblesManager`
- Taxas Cartão / Financeiras → `CardRatesManager`
- Automação por Origem → `OriginRulesMatrix`
- Automações por Evento → `EventAutomationRulesPanel`
- Permissões Financeiras → `FinancePermissionsMatrix`

Sub-abas serão renderizadas com `Tabs` rolável (mesmo padrão usado em `CadastrosFinanceiros`).

### 2. Adicionar atalho no dropdown "Configurações" do navbar

Em `src/components/layout/AppNavbar.tsx`, no item `configuracoes.items`, incluir:

- `{ label: "Financeiro", route: "/configuracoes?tab=financeiro", icon: "Landmark", available: true }`

A página `ProjectSettings` passa a ler `?tab=` da URL para abrir a aba correspondente (compatível com `usuarios`, `tipos`, `empresa`, `personalizacao`, `financeiro`).

### 3. Manter `/cadastros-financeiros` funcionando

A rota antiga continua existindo (não quebra links/favoritos), mas a entrada principal de acesso passa a ser via Configurações.

## Fora do escopo

- Nenhuma mudança em RLS, schema do banco ou lógica de negócio.
- Nenhum manager financeiro será reescrito — apenas reaproveitados.
- Sem alteração no `/configuracoes/catalogo` ou `/configuracoes/modulos`.

## Arquivos afetados

- `src/pages/ProjectSettings.tsx` (adicionar aba Financeiro + leitura de `?tab=`)
- `src/components/layout/AppNavbar.tsx` (adicionar item Financeiro no dropdown Configurações)
