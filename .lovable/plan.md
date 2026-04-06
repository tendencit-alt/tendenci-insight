
Objetivo: corrigir a abertura do “Ver pedido” a partir do BI para exibir o pedido completo, sem parecer cortado ou incompleto.

1. Confirmar a causa no fluxo atual
- O BI abre `OrderDetailSheet` por cima de `CostCenterEntriesDialog`.
- Ambos usam `Sheet` baseado em Radix Dialog, então hoje existe um sheet dentro de outro.
- Isso explica o comportamento de visualização incompleta: o pedido abre em uma camada aninhada, com conflito de foco/portal/área visível, em vez de abrir como uma tela principal de pedido.

2. Ajustar a navegação de origem no BI
- Em vez de abrir `OrderDetailSheet` dentro de `CostCenterEntriesDialog`, mudar o clique do ícone para abrir o pedido na página de pedidos.
- Estratégia recomendada:
  - fechar o drill-down do BI;
  - navegar para `/pedidos` com o `orderId` na URL;
  - deixar a própria página de pedidos abrir o `OrderDetailSheet` no contexto correto.
- Isso reaproveita o fluxo que já funciona quando o usuário abre pedidos diretamente na tela de Pedidos.

3. Preparar a página de Pedidos para autoabrir o pedido vindo do BI
- Ler o `orderId` da URL na página `src/pages/Orders.tsx`.
- Ao detectar esse parâmetro, preencher `selectedOrderId` automaticamente.
- Opcionalmente limpar o parâmetro da URL depois de abrir, para evitar reabertura indevida ao recarregar.

4. Melhorar o conteúdo do `OrderDetailSheet`
- Hoje ele já busca bastante coisa, mas não mostra de forma clara toda a origem financeira/estratégica do pedido.
- Ampliar a visualização para incluir um bloco “Recursos Estratégicos” completo, exibindo:
  - RT;
  - vendedor;
  - orçamentista;
  - projetista;
  - montador;
  - produção;
  - percentual, valor e responsável quando existirem.
- Também incluir observações internas quando existirem, porque hoje aparecem campos usados no pedido mas nem tudo é renderizado no detalhe.

5. Corrigir acessibilidade e sinais de conflito de modal
- Os logs mostram avisos de `DialogContent` sem título/descrição.
- Revisar os dialogs/sheets envolvidos para garantir `Title` e `Description` válidos, reduzindo warnings e instabilidade de montagem.
- Isso não é a causa principal do “pedido incompleto”, mas ajuda a estabilizar a experiência.

Arquivos a ajustar
- `src/components/financeiro/CostCenterEntriesDialog.tsx`
- `src/pages/Orders.tsx`
- `src/components/orders/OrderDetailSheet.tsx`

Resultado esperado
- Ao clicar em “Ver pedido” dentro de receitas/despesas do BI, o sistema abrirá o pedido completo no fluxo correto.
- O usuário verá todos os dados principais do pedido, inclusive recursos estratégicos e observações relevantes.
- O problema de abrir “pela metade” ou em camada quebrada deixa de acontecer porque o pedido não ficará mais aninhado dentro do sheet do BI.

Detalhes técnicos
- Problema principal: nested sheet/dialog (`CostCenterEntriesDialog` + `OrderDetailSheet`).
- Solução mais segura: navegação para rota `/pedidos` com auto-open por query param.
- Benefício: reutiliza um fluxo já existente e reduz risco de novos conflitos de portal/foco.
