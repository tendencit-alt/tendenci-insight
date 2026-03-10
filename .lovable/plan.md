

# Reestruturar Menu: Manter apenas 6 Modulos

## Estado Atual (menu_items no banco)

Existem 19 itens no menu. O usuario quer manter apenas 6 modulos e remover 3 abas do dropdown Configuracoes.

## Itens a MANTER (visible = true)

| Item | Categoria | Rota |
|------|-----------|------|
| BI / Dashboard | master | /bi-dashboard |
| Pedidos | comercial | /pedidos |
| Fase Produtiva | producao | /producao |
| Financeiro | financeiro | /financeiro |
| Fornecedores | cadastros | /fornecedores |
| Produtos / Materia Prima | cadastros | /estoque |
| Cadastros Financeiros | master | /cadastros-financeiros |
| Excluidos | master | /excluidos |
| Erros do Sistema | master | /system-errors |

## Itens a OCULTAR (visible = false)

**Comercial (remover tudo exceto Pedidos):**
- Leads
- CRM Arquitetos
- CRM Clientes
- Projetos e Orcamentos
- Metas

**Configuracoes (remover 3 abas):**
- IA de Atendimento
- Dashboards
- Configuracoes (item que aponta para /configuracoes)

## Implementacao

1. **SQL Migration** — UPDATE em menu_items setando `visible = false` nos 8 itens listados acima
2. **Nenhuma alteracao de codigo** — o AppNavbar ja filtra por `visible = true` automaticamente, e categorias vazias nao renderizam dropdown

Nota: Os itens nao serao deletados, apenas ocultados. Um MASTER podera reativa-los futuramente editando o banco.

