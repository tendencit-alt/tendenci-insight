# Reestruturação visual do CRM

Hoje a página `/crm` empilha 4 camadas de UI (cabeçalho → banner → abas do papel → conteúdo com filtros + 5 KPIs + alertas + sub-abas Board/Tabela/Performance). Isso gera ruído, filtros no meio da tela e o usuário leigo se perde.

A proposta é manter o que já existe, mas reorganizar em **3 zonas claras**: Topbar fixo → KPIs compactos → Conteúdo único. Tudo no frontend, sem mexer em dados.

## Antes x Depois (Visão Consultor — a mais usada)

Antes:
```
┌ Cabeçalho CRM + Switcher + Novo negócio
├ Banner "Sparkles" (tagline)
├ Abas: Meu funil | Propostas | Clientes
│  └ Filtros (linha 1) ......... [Atualizar][Exportar][Novo Projeto]
│     Card gigante "Valor Total Orçado"
│     4 Cards KPI coloridos com emojis
│     Toggle "Detalhes do funil" + 3 KPIs
│     Bloco DeadlineAlerts
│     Sub-abas: Board | Tabela | Performance
│        └ Kanban
```

Depois:
```
┌ Topbar sticky:
│   [Ícone] CRM   • Funil • Propostas • Clientes      [Visão ▾][🔍 Buscar][Filtros ▾][⚠ 3][Kanban|Tabela][+ Novo ▾]
├ KPI Strip compacto (1 linha, sem emojis):
│   Total Orçado · Recebidos · Em Orçamento · Aprovado · Perdido    [▾ mais]
└ Área de conteúdo (uma única view ativa: Kanban OU Tabela)
```

## Mudanças por arquivo

**`src/pages/CRM.tsx`**
- Remover o banner Sparkles (vira `aria-description` discreta no header).
- Header compacto em uma linha; `CRMViewSwitcher` vira um menu suspenso "Visão" pequeno (SDR / Consultor / Gestor) em vez de pílulas largas.
- Adicionar `sticky top-0 bg-background/80 backdrop-blur z-20` na toolbar.
- Botão "Novo negócio" vira um dropdown "+ Novo" (Negócio · Cliente · Lead) para juntar entradas hoje espalhadas.

**`src/components/crm/views/ConsultorView.tsx`** (principal alvo)
- Abas (Funil / Propostas / Clientes) sobem para a toolbar do CRM como navegação principal — eliminando uma camada de tabs.
- Aba Clientes deixa de ser um placeholder grande com botão "Abrir Clientes": vira simplesmente um redirect direto (`<Navigate to="/clientes"/>`) ou um link no menu superior.

**`src/components/projects/PrjOverview.tsx`** (refatoração visual, sem mudar lógica de dados)
- Remover linha de `ProjectsFilters` do meio da página. Filtros passam a viver no botão **"Filtros"** da topbar (Popover): período, etapa, responsável, busca. Apenas chips dos filtros ativos ficam visíveis abaixo da topbar.
- Trocar o card-hero "Valor Total Orçado" + 4 cards + bloco expandível por **um KPI strip horizontal único** (`flex` com 5 itens, sem gradientes nem emojis, usando tokens semânticos). Um botão "▾ mais" abre os 3 KPIs secundários (Orçado / Apresentado / Em Negociação) em popover.
- `DeadlineAlerts` deixa de ser bloco grande: vira um **badge ⚠ com contador na topbar** que abre um Sheet/Popover com a mesma lista.
- Eliminar as sub-abas internas "Board | Tabela | Performance":
  - Board/Tabela viram um **toggle de visualização** (ícones `LayoutGrid` / `Table`) na topbar — só um aparece por vez.
  - "Desempenho dos Parceiros" sai daqui (já existe na Visão Gestor) → remove duplicidade.
- Botões "Atualizar / Exportar / Novo Projeto" colapsam num menu "⋯" na topbar (Exportar e Atualizar) + o "+ Novo" global.

**`src/components/crm/CRMFilters.tsx`** e **`src/components/projects/ProjectsFilters.tsx`**
- Sem mudança de API. Apenas serão renderizados dentro de um `Popover` "Filtros" em vez de na linha principal.

**`src/components/crm/views/SDRView.tsx`** e **`GestorView.tsx`**
- Mesmo padrão: as TabsList saem do corpo e sobem para a topbar do CRM (uma única barra de navegação contextual ao papel selecionado).
- GestorView: manter Performance e Analytics só aqui.

## O que removemos (poluição)

- Banner "Sparkles" com tagline repetida do título.
- Card-hero gigante "Valor Total Orçado" (vira item do strip).
- Emojis nos KPIs (🔵 📥 📝 ✅ ❌ 💰 📊 🤝) → ícones lucide neutros.
- Gradientes coloridos `from-primary/20 to-primary/5` e `border-l-4` coloridos → cards lisos com tokens.
- Sub-abas Board/Tabela/Performance dentro de aba dentro de aba.
- Placeholder "Sua carteira de clientes" com botão grande.
- Botão "Limpar filtros" vermelho — vira um "x" discreto no chip.
- Linha `ProjectsFilters` no meio da página.
- `DeadlineAlerts` como bloco grande.

## O que adicionamos (usabilidade)

- **Topbar sticky** com tudo essencial em uma linha.
- **Dropdown "+ Novo"** unificando Negócio/Cliente/Lead.
- **Chips de filtros ativos** logo abaixo da topbar (clicar = remove).
- **Toggle Kanban/Tabela** com persistência em `localStorage`.
- **Badge ⚠ de alertas de prazo** na topbar com popover.
- **Atalhos de teclado básicos** (`/` foca busca, `n` abre Novo).
- **Estado vazio amigável** no Kanban quando filtros zeram resultados ("Nenhum negócio com esses filtros · limpar").

## Não-objetivos

- Não mexer em RLS, queries, schema, edge functions.
- Não alterar regras de pipeline, automações ou DRE.
- Não renomear rotas existentes.

## Próximo passo

Posso já implementar exatamente este desenho, ou prefere que eu mostre 2-3 direções visuais renderizadas (mais minimal vs. mais "dashboard") antes de aplicar?
