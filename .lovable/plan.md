# Plano: Correção de 5 bugs E2E (Pedidos, Catálogo, Produtos, Clientes, DOM)

## Ordem de execução (priorizada)

### BUG #17 — Select dentro de Modal não renderiza (CRÍTICO)
- Auditar `src/components/orders/CreateOrderDialog.tsx` e wizards relacionados
- Garantir que TODO `<SelectContent>` use `position="popper"` + classe `z-[100]` (acima do Dialog `z-50`)
- Mesmo fix em Selects de: item picker, categoria, status, vendedor, centro de custo
- Aplicar também em Clientes/Produtos/Leads modals
- Atalho: ajustar globalmente `src/components/ui/select.tsx` adicionando `z-[100]` ao SelectContent (resolve em todo o sistema)

### BUG #13 — Google Translate quebra DOM
- Adicionar `<meta name="google" content="notranslate">` em `index.html`
- Adicionar `<meta name="robots" content="notranslate">` por segurança
- Adicionar `translate="no"` no `<html>` raiz

### BUG #16 — Modais não fecham após salvar
- Auditar `CreateClientDialog`, `CreateProductDialog`, `CreateLeadDialog`
- Garantir `onOpenChange(false)` no `onSuccess` da mutation, após `invalidateQueries`

### BUG #15 — Falta editar/excluir em /produtos e /clientes
- Adicionar coluna "Ações" com DropdownMenu (Editar | Duplicar | Excluir)
- Reutilizar Create dialog em modo edição (passar `initialData`)
- AlertDialog de confirmação para exclusão (soft-delete `active=false` ou `ativo=false`)

### BUG #14 — White-label do /catalogo
- Migration: tabela `tenant_catalogo_settings` (tenant_id PK, logo_url, hero_title, hero_subtitle, footer_company_name, footer_copyright, whatsapp_url, instagram_url, primary_color)
- RLS: tenant_rls_check; SELECT público para uso no storefront
- Bucket Storage `tenant-assets` (público) com policies
- Refatorar `src/pages/Catalogo.tsx` para ler settings via `useQuery` (com fallback ao nome do tenant)
- Nova página `/configuracoes/catalogo` com formulário de edição + upload de logo
- Adicionar entrada na navegação de configurações

## Detalhes técnicos

**Z-index Dialog Radix**: `DialogOverlay` é `z-50`, `DialogContent` é `z-50`. Subindo `SelectContent` para `z-[100]` resolve sem mexer em portal.

**Tabela `tenant_catalogo_settings`**:
```sql
CREATE TABLE public.tenant_catalogo_settings (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  logo_url text,
  hero_title text,
  hero_subtitle text,
  footer_company_name text,
  footer_copyright text,
  whatsapp_url text,
  instagram_url text,
  primary_color text DEFAULT '#C41E3A',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```
RLS: SELECT permitido a `anon`+`authenticated` (storefront público); INSERT/UPDATE/DELETE só admin/owner do tenant.

**Bucket `tenant-assets`**: público, upload restrito a usuários autenticados do tenant (path prefix = tenant_id).

**Validação E2E final**: rodar manualmente após deploy seguindo os 4 passos do usuário.

## Riscos
- Mudar `select.tsx` global pode afetar muitos componentes — apenas elevar z-index é seguro.
- Catálogo público precisa SELECT anon — confirmar que isso é desejado (é, é storefront público).
- Soft-delete em produtos/clientes: confirmar nome da coluna (`active` em products, `ativo` em outros).
