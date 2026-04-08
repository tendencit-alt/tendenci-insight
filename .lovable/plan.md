

## Plano: Tornar o Sistema Universal e Comercializável

### Visão Geral
O sistema hoje tem referências hardcoded à "Tendenci" em logos, textos, labels e lógica. Para comercializar para outras empresas, precisamos criar uma **camada de configuração da empresa** que permita personalização sem alterar código.

---

### 1. Tabela de Configuração da Empresa (Migration)

Criar tabela `company_settings` com campos editáveis:

| Campo | Tipo | Exemplo | Descrição |
|---|---|---|---|
| `company_name` | text | "Tendenci" | Nome da empresa |
| `trade_name` | text | "Tendenci Insight" | Nome fantasia |
| `cnpj` | text | "00.000.000/0001-00" | CNPJ |
| `razao_social` | text | "Tendenci LTDA" | Razão social |
| `inscricao_estadual` | text | "" | IE |
| `logo_url` | text | null | Logo (upload) |
| `primary_color` | text | "#D41E1E" | Cor primária do tema |
| `accent_color` | text | "#E85D3A" | Cor de destaque |
| `phone` | text | "" | Telefone |
| `email` | text | "" | Email de contato |
| `address` | text | "" | Endereço |
| `website` | text | "" | Site |

---

### 2. Hook `useCompanySettings`

Hook global que carrega as configurações uma vez e disponibiliza em todo o sistema com cache via React Query.

---

### 3. Substituições no Código (Principais Pontos)

**Onde "Tendenci" aparece hardcoded e será substituído por `company_settings`:**

- **Logo** (4 arquivos): `AppNavbar.tsx`, `AppSidebar.tsx`, `Auth.tsx`, `ResetPassword.tsx` — usar `logo_url` ou fallback para nome
- **"Valor Líquido Tendenci"** (2 arquivos): `CreateOrderDialog.tsx`, `EditOrderDialog.tsx` — trocar por `"Valor Líquido " + companyName`
- **"Entrega Tendenci"** (3 arquivos): `CreateOrderDialog.tsx`, `EditOrderDialog.tsx`, `BulkEditOrdersDialog.tsx` — trocar por `"Entrega " + companyName`
- **Dados do emitente NF** (`OrderExportDialog.tsx`): puxar CNPJ, razão social, etc. da tabela
- **Triggers SQL** com textos "Tendenci": manter como estão (são internos), o `display_name` já resolve no front

---

### 4. Tela de Configurações da Empresa

Nova aba **"Empresa"** na página de Configurações (`/configuracoes`) — acessível apenas para Master:

- Upload de logo
- Nome da empresa / Nome fantasia
- CNPJ, Razão Social, IE
- Telefone, Email, Endereço, Site
- Cores primária e destaque (color picker)
- Preview em tempo real

---

### 5. Campos que já são editáveis (não precisam mudar)

- **Menu items** — já dinâmicos via banco
- **Compromissos sobre venda** — já configuráveis
- **Plano de Contas** — já editável
- **Centros de Custo** — já editáveis
- **Tipos de produção** — já editáveis
- **Perfis/Roles** — já configuráveis
- **Taxas de cartão/boleto/link** — já editáveis

---

### 6. Resumo dos Arquivos Afetados

- **1 migration SQL** — criar `company_settings`
- **1 novo hook** — `useCompanySettings.ts`
- **1 nova aba de config** — `CompanySettingsTab.tsx`
- **~10 arquivos editados** — substituir referências hardcoded por dados dinâmicos
- **`ProjectSettings.tsx`** — adicionar aba "Empresa"

### Resultado Final

Qualquer empresa que usar o sistema poderá, nas Configurações:
1. Colocar seu logo
2. Definir nome, CNPJ e dados fiscais
3. Escolher cores do tema
4. Todo o sistema refletirá automaticamente a identidade da empresa

