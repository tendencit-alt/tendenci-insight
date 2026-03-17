

## Plano: Projeto pré-preenchido automaticamente com nome do cliente

### Problema atual
O campo Projeto só oferece a opção de "Criar" manualmente. O comportamento correto é: ao abrir "Novo Produto", o sistema deve **automaticamente criar** o projeto com o nome do cliente (se não existir) e pré-preencher o campo. Se já existir, pré-selecionar. O usuário pode trocar por outro existente se quiser.

### Solução

Modificar `src/components/orders/OrderItemsTable.tsx`:

1. **Adicionar `useEffect`** que dispara quando `isAddingItem` muda para `true` e `clientName` está disponível:
   - Busca em `PROJETOS` se já existe projeto com o nome do cliente
   - Se **existe**: pré-seleciona automaticamente (`setNewItem(prev => ({ ...prev, project_id: matched.value }))`)
   - Se **não existe**: chama `handleCreateProjectForClient()` automaticamente, criando o projeto e pré-selecionando

2. **O Select permanece editável** — o usuário pode trocar para qualquer outro projeto existente a qualquer momento.

3. **Remover** a opção manual "➕ Criar: {clientName}" do dropdown, pois a criação agora é automática.

### Arquivo alterado
- `src/components/orders/OrderItemsTable.tsx`

