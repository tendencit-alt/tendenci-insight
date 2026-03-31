

## Plano: Nomear projetos com Centro de Custo + Cliente + #Pedido

### Problema Atual
Hoje o projeto é criado apenas com o nome do cliente (ex: "Igreen Comercial S.A"), gerando confusão quando há múltiplos pedidos do mesmo cliente.

### Nova Lógica de Nomenclatura

O nome do projeto seguirá o formato:

```text
[Centro de Custo] - [Nome do Cliente]
```

Quando já existir um projeto com esse mesmo nome (mesmo cliente + mesmo centro de custo), o sistema adicionará o número do pedido:

```text
[Centro de Custo] - [Nome do Cliente] #[order_number]
```

**Exemplos:**
- Primeiro pedido de Planejados para Igreen → `Planejados - Igreen Comercial S.A`
- Segundo pedido de Planejados para Igreen → `Planejados - Igreen Comercial S.A #102`
- E o primeiro será renomeado para → `Planejados - Igreen Comercial S.A #98`

### Alterações Técnicas

**Arquivos a editar:**
1. **`src/components/orders/CreateOrderDialog.tsx`**
   - Alterar `resolveProjectIdForItems` e `resolveProjectId`/`createNewProjectForOrder` para:
     - Receber o centro de custo do item (ou o predominante dos itens)
     - Montar o nome como `[centro_custo] - [clientName]`
     - Verificar se já existe um projeto com esse nome exato
     - Se existir, renomear o existente para `[nome] #[order_number do pedido vinculado]` e criar o novo como `[nome] #[order_number]`
     - Se não existir, criar normalmente sem sufixo
   - Como o `order_number` é gerado pelo banco ao inserir o pedido, o fluxo será: criar o pedido primeiro, obter o `order_number`, e então criar/nomear os projetos

2. **`src/components/orders/EditOrderDialog.tsx`**
   - Aplicar a mesma lógica de nomenclatura na função `resolveProjectIdForItems`

### Fluxo Detalhado

```text
1. Inserir o pedido (orders) → obter order_number
2. Para cada item, determinar o centro_custo
3. Montar nome base: "[centro_custo] - [clientName]"
4. Buscar projetos existentes com esse nome exato
5. Se encontrou:
   a. Renomear o existente adicionando #order_number (consultando o pedido vinculado)
   b. Criar novo projeto com nome "[base] #[novo_order_number]"
6. Se não encontrou:
   a. Criar projeto com o nome base sem sufixo
7. Vincular project_id aos itens
```

### Observação sobre itens com centros de custo diferentes
Quando um pedido tem itens com centros de custo distintos, cada grupo de centro de custo gerará seu próprio projeto, mantendo a separação financeira correta.

