
Objetivo: corrigir o erro que criou um projeto ativo de “TESTE 2” no BI sem que o pedido tivesse sido finalizado, e evitar que isso volte a acontecer.

O que identifiquei
- O problema não está no carregamento da lista de pedidos.
- O banco confirma:
  - cliente “TESTE 2” existe;
  - projeto ativo “TESTE 2” existe em `fin_projects`;
  - não existe pedido novo para esse cliente;
  - o pedido mais recente continua vinculado ao cliente “Teste”.
- A causa está no fluxo do item do pedido:
  - em `src/components/orders/OrderItemsTable.tsx`, ao abrir o formulário de item (`isAddingItem=true`), o sistema tenta achar um projeto com o nome do cliente;
  - se não achar, ele cria automaticamente um projeto em `fin_projects` imediatamente;
  - isso acontece antes de salvar o pedido;
  - se a tela atualizar, der erro, ou o usuário abandonar o processo, o projeto fica criado sozinho no BI.

Trecho responsável
```text
OrderItemsTable.tsx
useEffect(() => {
  if (!isAddingItem || !clientName || autoProjectDone) return;

  const existing = PROJETOS.find(p => p.label === clientName);
  if (existing) {
    setNewItem(prev => ({ ...prev, project_id: existing.value }));
    setAutoProjectDone(true);
  } else if (!creatingProject) {
    setAutoProjectDone(true);
    handleCreateProjectForClient();
  }
}, ...)
```

Por que isso gerou o caso “TESTE 2”
- O cliente foi criado corretamente.
- Ao entrar na aba de itens, o sistema detectou que não havia projeto “TESTE 2”.
- Criou o projeto imediatamente.
- O pedido não foi concluído por causa da falha/refresh.
- Resultado:
  - BI mostra projeto ativo;
  - relação de pedidos não mostra pedido, porque ele nunca foi salvo.

Plano de correção
1. Remover a criação automática prematura do projeto ao apenas abrir o item
- O item pode continuar sendo pré-preenchido com um projeto existente, se já houver um com o nome do cliente.
- Mas não deve criar projeto novo nesse momento.

2. Mudar a criação do projeto para o momento certo
- Criar o projeto somente quando o pedido for realmente salvo com sucesso.
- Fluxo ideal:
  - usuário cria cliente;
  - adiciona itens;
  - se algum item não tiver `project_id`, no `handleSubmit` do pedido o sistema:
    - procura projeto com o nome do cliente;
    - cria projeto se não existir;
    - preenche esse `project_id` nos itens;
    - só então insere `orders` e `order_items`.

3. Garantir atomicidade lógica do fluxo
- Mesmo sem transação completa no frontend, o fluxo fica muito mais seguro se o projeto só nascer junto da persistência real do pedido.
- Se ocorrer erro antes do submit, nada é criado no BI.
- Se ocorrer erro durante submit, o comportamento fica muito mais coerente e rastreável.

4. Corrigir o dado inconsistente já existente
- Como estamos em modo de plano, não vou alterar agora.
- Na implementação, vou:
  - identificar se o projeto “TESTE 2” está órfão mesmo;
  - se não houver `order_items` nem vínculos financeiros reais usando esse projeto, remover ou inativar esse projeto órfão;
  - manter cuidado para não apagar algo que já tenha sido reaproveitado manualmente.

Arquivos que pretendo ajustar
- `src/components/orders/OrderItemsTable.tsx`
  - remover a criação automática em `useEffect`;
  - manter apenas seleção automática de projeto já existente.
- `src/components/orders/CreateOrderDialog.tsx`
  - antes de inserir `order_items`, resolver/criar o projeto do cliente quando necessário;
  - aplicar o `project_id` final nos itens sem depender da criação antecipada.
- Possivelmente `src/components/orders/EditOrderDialog.tsx`
  - revisar se existe a mesma lógica ou se precisa alinhar o comportamento para edições.

Resultado esperado
- Não haverá mais KPI/projeto ativo criado sozinho por abrir a aba de itens.
- O projeto só aparecerá no BI quando o pedido realmente for salvo.
- O fluxo continua prático para o usuário, mas sem deixar “lixo” no BI em caso de falha.
- O caso do “TESTE 2” será saneado.

Detalhes técnicos
```text
Hoje:
abrir item -> criar projeto automaticamente -> refresh/erro -> projeto órfão

Após correção:
abrir item -> apenas sugerir/procurar projeto existente
salvar pedido -> resolver/criar projeto -> salvar pedido e itens
```

Validação que farei na implementação
- Criar cliente novo e abandonar o pedido antes de salvar:
  - não deve criar projeto no BI.
- Criar cliente novo e finalizar pedido:
  - deve criar projeto automaticamente e vincular os itens.
- Abrir pedido para cliente com projeto já existente:
  - deve reaproveitar o projeto existente.
- Verificar fim a fim:
  - cliente, pedido, itens e BI de projetos ativos.

<lov-actions>
<lov-suggestion message="Test the order creation flow end-to-end, including creating a new client and abandoning the order before saving, to confirm no orphan project appears in active BI projects.">Verify that it works</lov-suggestion>
<lov-suggestion message="Implement the fix to create projects only when the order is actually saved, and clean up the orphan TESTE 2 project if it has no real links.">Apply the fix</lov-suggestion>
<lov-suggestion message="Add a safeguard report or badge to identify orphan active projects with no related order items or financial entries.">Add orphan project detection</lov-suggestion>
<lov-suggestion message="Review the edit-order flow to ensure project auto-linking follows the same safe behavior as new orders.">Align edit flow</lov-suggestion>
</lov-actions>
