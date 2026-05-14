## Diagnóstico

Existe a página completa **`/cadastros-financeiros`** (`src/pages/CadastrosFinanceiros.tsx`) com 7 abas: **Contas Bancárias, Plano de Contas, Centros de Custo, Projetos, Compromissos sobre Venda, Responsáveis, Taxas Cartão** — mais aba de configurações com Origem/Eventos/Permissões. Os componentes `Manager` já existem e funcionam.

Por que você não está vendo:

1. **Você está em `/financeiro?section=records`.** Essa página NÃO conecta os cadastros — em `settings` ela mostra `GovernanceTab`, então não há link visível para Plano de Contas a partir do Financeiro.
2. **No menu lateral existe a seção "Controladoria"** com Plano de Contas, Centros de Custo etc., mas os links estão **quebrados**: apontam para `?tab=chart`, `?tab=cost-centers`, `?tab=projects`, mas o componente `CadastrosFinanceiros` ignora `useSearchParams` e usa estado interno com valores diferentes (`chart_accounts`, `cost_centers`, `projects`). Resultado: clicar em qualquer item sempre cai em "Contas Bancárias".
3. Existem `MastersTab.tsx` (em `components/financeiro/`) e `CadastrosFinanceiros.tsx` (em `pages/`) com conteúdo quase idêntico — duplicação que confunde.

Sobre **padrão do sistema vs personalização**: já está implementado no banco. A tabela `fin_chart_accounts` tem 40 contas (35 marcadas `is_core`/`is_system_default`) por tenant, e o `ChartAccountsManager` já bloqueia exclusão de contas core. Falta deixar isso **explícito visualmente** e dar uma ação "duplicar para personalizar".

## Caminho recomendado

**Mantém uma única fonte da verdade** (`/cadastros-financeiros`) e cria atalhos a partir do Financeiro, ao invés de duplicar tudo dentro dele. Razões:

- A página dedicada cabe bem no menu Controladoria (já está lá).
- Evita inflar mais ainda a navegação do `/financeiro` (que já tem 6 abas + relatórios + governance).
- Garante que existe um único componente por cadastro (sem risco de divergir).

## Plano de implementação

### 1. Corrigir roteamento por tab em `CadastrosFinanceiros.tsx`
- Ler `useSearchParams()` e usar `?tab=` como estado inicial.
- Padronizar slugs: `bank-accounts`, `chart`, `cost-centers`, `projects`, `commitments`, `responsibles`, `card-rates`, `origin-rules`, `event-automations`, `permissions`.
- Atualizar `setActiveTab` para também escrever na URL (`setSearchParams`), mantendo deep-link e botão "voltar" funcionando.

### 2. Atualizar links do menu (`AppNavbar.tsx` linhas 141-146 e `AppSidebar.tsx` linha 123)
- Trocar para os slugs corretos.
- Adicionar entradas que faltam: **Compromissos sobre Venda**, **Responsáveis**, **Taxas Cartão**, **Contas Bancárias**.

### 3. Atalho a partir do Financeiro
Em `Financeiro.tsx` adicionar no `headerActions` um botão secundário **"Cadastros & Plano de Contas"** que navega para `/cadastros-financeiros`. Opcionalmente, na aba Settings (hoje `GovernanceTab`), incluir um card no topo com links rápidos para os 4 cadastros mais usados (Plano de Contas, CCs, Projetos, Contas Bancárias).

### 4. Remover duplicação
Excluir `src/components/financeiro/MastersTab.tsx` (não é referenciado em nenhum lugar) para evitar divergência futura. Os 14 arquivos em `components/financeiro/masters/` permanecem intactos — são os Managers reais.

### 5. Tornar visível "Padrão do Sistema vs Personalizado"
No `ChartAccountsManager` (e por extensão `CostCentersManager`):
- Adicionar **filtro segmentado** no topo: `Todos | Padrão do Sistema | Personalizadas`.
- Em cada linha core, manter o badge "Padrão" já existente, e adicionar tooltip explicando: *"Conta padrão do sistema. Não pode ser excluída ou ter código alterado, mas você pode adicionar contas filhas e personalizar a descrição."*
- Adicionar ação **"Duplicar e personalizar"** em contas core: cria uma cópia editável (sem `is_core`) na mesma posição hierárquica. Útil para o usuário começar uma variação sem mexer no padrão.
- Banner informativo no topo da aba Plano de Contas explicando o conceito em 1 frase, dispensável (cookie `cadastros_intro_seen`).

### 6. (Opcional, não-bloqueante) Wizard de primeiro acesso
Se o tenant ainda não tiver nenhuma personalização (`COUNT(*) WHERE NOT is_core = 0`), exibir banner uma única vez sugerindo: *"Comece a partir do plano padrão do sistema. Renomeie, oculte ou adicione contas conforme sua operação."*

## Resumo de arquivos afetados

- `src/pages/CadastrosFinanceiros.tsx` — ler/escrever `?tab=`
- `src/components/layout/AppNavbar.tsx` — corrigir slugs + adicionar entradas faltantes
- `src/components/layout/AppSidebar.tsx` — completar links de Controladoria
- `src/pages/Financeiro.tsx` — botão "Cadastros & Plano de Contas" no header
- `src/components/financeiro/masters/ChartAccountsManager.tsx` — filtro segmentado, ação Duplicar, banner
- `src/components/financeiro/masters/CostCentersManager.tsx` — filtro segmentado
- **Remover** `src/components/financeiro/MastersTab.tsx` (não usado)

Sem mudanças de schema — `fin_chart_accounts.is_core` / `is_system_default` já existem e a proteção contra delete já está aplicada.
