## Contexto

Hoje o enforcement (menu + rotas + botões via `Can`, `usePermissions`, `useFirstAllowedRoute`) é feito por **módulo agregado** (16 módulos: `comercial`, `financeiro`, `operacional`, `configuracoes`, etc.), persistido em `profile_type_permissions` (colunas `can_view/create/edit/delete/approve/conciliate/export/admin`). O `ProfileTypePermissionsDialog` (1311 linhas) lista esses 9 módulos planos — sem qualquer relação visual com o menu real que tem ~12 raízes e ~60 folhas/abas.

**Decisão arquitetural-chave:** Não vou trocar a granularidade do enforcement (seria refatoração de risco em toda a base). Vou criar uma **UI em árvore espelhada do menu** onde várias folhas mapeiam para o mesmo módulo lógico — exatamente como o `aliasMap` em `usePermissions.ts` já faz hoje (`pedidos→operacional`, `crm→comercial`, etc.). A persistência continua em `profile_type_permissions`. Para folhas que precisam de granularidade real (raras), adiciono uma tabela `profile_type_feature_overrides` opcional, consultada por um helper SECURITY DEFINER novo, e o enforcement passa a chamar esse helper (que cai no módulo se não houver override).

## Auditoria do Menu (entregue como artefato)

Vou produzir um JSON `src/config/menuPermissionMap.ts` listando as raízes e folhas observadas em `AppSidebar.tsx` + `AppNavbar.tsx`. Estrutura aproximada:

```text
Home Launcher → home (module: dashboard)
Comercial
  ├ Pedidos (operacional)
  ├ CRM (comercial)
  ├ Contatos: Clientes/Fornecedores/Ambos (comercial)
  ├ Catálogo (comercial)
  └ Comissões (comercial)
Operação
  ├ Produção (Kanban + OPs) (producao)
  ├ Entregas & Montagem (operacional)
  ├ Compras (operacional)
  └ Estoque (estoque)
Financeiro
  ├ DRE (financeiro)
  ├ Fluxo de Caixa (financeiro)
  ├ Contas a Pagar (financeiro)
  ├ Contas a Receber (financeiro)
  ├ RH/PJ (financeiro)
  ├ Compromissos sobre Venda (financeiro)
  ├ Plano de Contas (cadastros_financeiros)
  ├ Centros de Custo (cadastros_financeiros)
  ├ Projetos (cadastros_financeiros)
  └ Taxas (cadastros_financeiros)
KPI's & BI
  ├ Dashboard Executivo (dashboard_executivo)
  ├ Dashboards Personalizados (relatorios_bi)
  └ Benchmarking (relatorios_bi)
Controladoria / Planejamento / Governança (...)
Configurações
  ├ Usuários & Permissões (configuracoes)
  ├ Marca & Catálogo (configuracoes)
  └ Financeiro / Empresa (configuracoes)
```

Após coletar a lista completa via leitura dos arquivos de sidebar/navbar, anexo a tabela de gaps (folha sem módulo / módulo sem folha).

## Mudanças

### 1. Componente novo `PermissionTree`

`src/components/settings/permissions/PermissionTree.tsx`:
- Lê `MENU_PERMISSION_MAP` (config estática).
- Para cada folha derivada do módulo, mostra 4 checkboxes: **Ver / Criar / Editar / Excluir** (mesmas 4 colunas que o dialog atual já usa, mapeando aos 8 flags reais).
- Raiz com tri-state: `all` / `partial` / `none`, com cascata.
- Input de busca que filtra a árvore (mantendo o caminho da raiz visível).
- Quando 2+ folhas mapeiam ao mesmo módulo, ligar/desligar uma reflete nas outras (sinal visual de "compartilhado com X").
- Botões "Aplicar template" — chamando os baselines já existentes (`getRoleBaseline`).

### 2. Integração no `ProfileTypePermissionsDialog`

Substituir a aba **"Módulos"** atual por **"Permissões (árvore)"** usando o novo componente. Manter as abas existentes "Críticas", "Escopo", "Valores", "Status".

### 3. Backend (opcional/leve)

Migration nova (idempotente, SECURITY DEFINER, `search_path = public`):
- Tabela `profile_type_feature_overrides (profile_type_id, feature_key, can_view, can_create, can_edit, can_delete)` — usada só quando admin precisa derrubar uma folha sem afetar o resto do módulo. Não usada na v1 da UI; fica pronta para o caso "Vendedor Limitado" precisar de granularidade.
- Função `has_feature_access(_user_id, _feature_key, _action)` — consulta override; se null, cai em `profile_type_permissions` do módulo pai. Multi-tenant via RLS + `tenant_id` no override.
- RLS em `profile_type_feature_overrides`: leitura/escrita só admin/owner do tenant; owner vê tudo.

Para a UI atual a v1 só precisa do mapping estático — a tabela fica disponível para o futuro sem custo.

### 4. Backfill

Sem schema mudando a chave dos dados existentes, não há perda. O contador de "registros migrados" será o nº de linhas `profile_type_permissions` lidas e re-exibidas (relatório informativo).

### 5. Enforcement

**Não muda nada**. `Can`, `usePermissions.hasModuleAccess`, `useFirstAllowedRoute` continuam batendo no módulo. O `aliasMap` já cobre `pedidos→operacional`, `crm→comercial`, etc.

### 6. Teste "Vendedor Limitado"

Crio papel template com:
- `comercial: can_view=true`
- Todos os outros módulos: nada

Resultado: vê só Pedidos, CRM, Contatos, Catálogo, Comissões (todos mapeados a `comercial`). **Limitação honesta:** sem usar a tabela de overrides, ele vê **todas** as folhas de Comercial, não só "Pedidos + Contatos". Para limitar de verdade a 2 folhas dentro do mesmo módulo, precisamos ligar `profile_type_feature_overrides` no enforcement — o que toca em código sensível (gates).

## Pergunta de escopo — preciso da sua decisão

A granularidade real "Vendedor Limitado vê só Pedidos+Contatos dentro de Comercial" exige mexer no enforcement (gates de rota + menu) para consultar `has_feature_access(feature_key)` antes do fallback de módulo. Você disse explicitamente **"NÃO toque nos gates de permissão"**. Há duas leituras possíveis:

- **(A) Estrito:** não tocar enforcement → UI nova fica linda e espelhada ao menu, mas a granularidade efetiva continua por módulo. "Vendedor Limitado" vê tudo de Comercial. Entrega 100% segura, baixo risco.
- **(B) Liberar gates só para fallback de feature_key:** estendo `Can` e o guard de rota para consultar `has_feature_access(feature_key)` antes do módulo, mantendo 100% retrocompat (se não há override, mesmo comportamento). Aí o teste do "Vendedor Limitado" passa de verdade.

**Qual eu sigo, A ou B?** Sem isso eu não consigo fechar o item (6) do seu pedido com integridade.
