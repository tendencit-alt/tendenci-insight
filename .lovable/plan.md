
Objetivo: tirar Vendedor, Orçamentista, Projetista e Montador da base de usuários do sistema e passar a tratá-los como um cadastro avulso, centralizado em Cadastros, com criação/exclusão independente de login.

O que identifiquei
- Hoje os responsáveis do pedido vêm de `profiles`:
  - `CreateOrderDialog.tsx` e `EditOrderDialog.tsx` buscam vendedores/orçamentistas/projetistas a partir de `profiles`, `role` e `profile_types`.
- Há mistura de regras:
  - vendedor por `role in ('admin','vendedor')`
  - orçamentista por `profile_types.name = 'Orçamentista'`
  - projetista por `role = 'projetista'`
  - montador ainda está acoplado ao mesmo modelo de responsáveis do pedido.
- Você definiu dois direcionamentos:
  - usar Cadastro único
  - migrar tudo

Decisão de desenho
- Criar um cadastro único de responsáveis avulsos, com campo `tipo`:
  - Vendedor
  - Orçamentista
  - Projetista
  - Montador
- Expor esse cadastro em Cadastros, não em Gestão de Usuários.
- Os pedidos novos e antigos passarão a apontar para esse novo cadastro.
- Usuários do sistema continuarão existindo apenas para login, permissões e operação interna.

O que vou implementar
1. Novo cadastro avulso de responsáveis
- Criar uma nova tabela de cadastro, algo como:
  - `order_responsibles` / `cadastro_responsaveis`
- Campos previstos:
  - `id`
  - `name`
  - `type`
  - `is_active`
  - timestamps
- Aplicar RLS para leitura por autenticados e manutenção por admins/master, seguindo o padrão atual.

2. Nova tela em Cadastros
- Adicionar uma nova aba em `Cadastros Financeiros` para “Responsáveis” ou “Equipe Avulsa”.
- Tela no padrão dos managers já existentes:
  - listar
  - filtrar por tipo
  - criar
  - editar
  - ativar/inativar
  - excluir
- Como você pediu, será um cadastro simples, sem vínculo com autenticação.

3. Trocar a fonte dos selects no pedido
- Atualizar `CreateOrderDialog.tsx`
- Atualizar `EditOrderDialog.tsx`
- Os selects de:
  - vendedor
  - orçamentista
  - projetista
  - montador
  passarão a buscar somente no novo cadastro avulso por tipo.
- Isso mantém paridade total entre criação e edição.

4. Migrar histórico
- Ler todos os responsáveis hoje usados nos pedidos.
- Criar registros equivalentes no novo cadastro avulso.
- Reapontar os pedidos antigos para os novos IDs.
- Fazer deduplicação por nome + tipo para evitar cadastros repetidos.
- Onde houver nome ausente/inconsistente, usar fallback controlado e revisar os casos problemáticos.

5. Preservar o que não deve quebrar
- Gestão de Usuários continuará separada.
- Permissões, login e usuários do sistema não serão usados mais como fonte desses responsáveis.
- Vou revisar com cuidado o campo `vendedor_id` do pedido, porque ele também aparece em metas/analytics; a troca para cadastro avulso será aplicada ao fluxo dos responsáveis/comissões sem quebrar indicadores já existentes.

Arquivos/pontos que pretendo ajustar
- `src/pages/CadastrosFinanceiros.tsx`
  - adicionar a nova aba de cadastro
- Novo manager de cadastro avulso
  - seguindo o padrão de `FinProjectsManager`
- `src/components/orders/CreateOrderDialog.tsx`
  - trocar queries de `profiles` pelo novo cadastro
- `src/components/orders/EditOrderDialog.tsx`
  - mesma troca, mantendo paridade
- Possíveis componentes auxiliares de dialog/form para CRUD do novo cadastro

Detalhes técnicos
```text
Hoje
Pedidos -> profiles/profile_types -> usuários do sistema

Depois
Cadastros -> Responsáveis avulsos (tipo)
Pedidos -> cadastro_responsaveis
Usuários do sistema -> apenas login/permissões
```

Cuidados de migração
- Verificar se os UUIDs atuais dos campos `comissao_*_responsavel_id` ainda têm vínculo estrutural antigo no banco.
- Se necessário, ajustar o relacionamento para o novo cadastro.
- Migrar dados antigos antes de trocar totalmente a UI, para não deixar pedidos sem responsável visível.

Validação esperada
- Criar um responsável avulso em Cadastros e usá-lo no novo pedido.
- Excluir/inativar um responsável sem impactar usuários do sistema.
- Abrir pedidos antigos e confirmar que os nomes migrados continuam aparecendo corretamente.
- Conferir criação e edição do pedido fim a fim sem depender de Gestão de Usuários.
