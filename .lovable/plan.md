# Prompt para Recriar: Cadastros Financeiros > Aba Projetos

Cole este prompt em outro projeto Lovable para recriar a funcionalidade completa da aba de Projetos Financeiros.

---

```text
Crie a funcionalidade completa de "Projetos Financeiros" dentro do módulo de Cadastros Financeiros. Use React + TypeScript, Tailwind CSS, shadcn/ui, @tanstack/react-query, date-fns (locale ptBR), Supabase como backend. Moeda BRL. Tudo em português brasileiro (pt-BR).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PARTE 1 — BANCO DE DADOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### Tabela: fin_projects
- id UUID PK DEFAULT gen_random_uuid()
- name TEXT NOT NULL
- code TEXT (ex: "PROJ-001")
- status TEXT DEFAULT 'ativo' (valores: 'ativo', 'pausado', 'concluido', 'cancelado')
- budget DECIMAL(15,2) (orçamento do projeto, nullable)
- start_date DATE (nullable)
- end_date DATE (nullable)
- owner_id UUID FK → profiles(id) (nullable)
- created_at TIMESTAMPTZ DEFAULT now()

RLS: habilitada, SELECT/INSERT/UPDATE para authenticated users.

### Tabela dependente: fin_ledger_entries (já existente)
O módulo de projetos lê lançamentos do livro razão vinculados via coluna project_id UUID FK → fin_projects(id).
Campos relevantes dos lançamentos usados:
- id, project_id, description, amount DECIMAL(15,2), type TEXT ('RECEITA' ou 'DESPESA'), competence_date DATE, cash_date DATE, status TEXT, reconciled BOOLEAN
- chart_account:fin_chart_accounts(name, code) — join com plano de contas
- cost_center:fin_cost_centers(name) — join com centro de custo

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PARTE 2 — UTILITÁRIO: numericCodeSort
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Arquivo: src/lib/numericCodeSort.ts

Função genérica que ordena arrays por campo de código numérico/hierárquico.
- Suporta códigos como "1", "2", "10" e hierárquicos como "1.1", "1.2", "1.10"
- Divide o código por "." e compara cada segmento numericamente
- Itens sem código vão para o final
- Assinatura: numericCodeSort<T>(items: T[], codeField: string = 'code'): T[]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PARTE 3 — COMPONENTE PRINCIPAL: FinProjectsManager
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Arquivo: src/components/financeiro/masters/FinProjectsManager.tsx

### 3.1 Estado
- dialogOpen, editing (projeto sendo editado ou null para novo)
- form: { name, code, status, budget (string), start_date, end_date }
- viewEntriesOpen, selectedProject (para o dialog de KPIs)

### 3.2 Queries (React Query)
1. queryKey: ["fin-projects-all"] — busca todos os projetos ordenados por nome
2. queryKey: ["fin-ledger-entries-by-project"] — busca TODOS os lançamentos que têm project_id não-nulo, com join em fin_chart_accounts(name, code), ordenados por competence_date DESC

### 3.3 Cálculos (useMemo)

**realizedByProject**: agrupa lançamentos por project_id, calcula para cada projeto:
- receitas: soma de |amount| dos lançamentos tipo RECEITA
- despesas: soma de |amount| dos lançamentos tipo DESPESA
- total: receitas - despesas (resultado líquido)
- entries: array de lançamentos do projeto

**kpis** (apenas projetos ativos):
- activeCount: quantidade de projetos com status "ativo"
- totalBudget: soma dos orçamentos dos projetos ativos
- totalRealized: soma das despesas realizadas dos projetos ativos
- percentUsed: (totalRealized / totalBudget) * 100
- projectsOverBudget: count de projetos onde despesas > orçamento
- projectsUnderBudget: count de projetos onde despesas <= orçamento (com orçamento > 0)

### 3.4 CRUD
- handleNew(): abre dialog com form limpo
- handleEdit(project): preenche form com dados do projeto, abre dialog
- handleSubmit(): valida nome obrigatório, faz insert ou update no Supabase
  - budget é parseado com: parseFloat(form.budget.replace(",", ".")) para aceitar formato BR
  - Campos opcionais (code, budget, start_date, end_date) são null quando vazios
  - Após sucesso: refetch() e fecha dialog
- handleViewEntries(project): abre ProjectKPIsDialog com dados do projeto

### 3.5 Funções auxiliares
- formatCurrency(value): value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
- getStatusBadge(status): retorna Badge com cor por status:
  - "ativo" → bg-green-600
  - "concluido" → variant="secondary"
  - "pausado" → variant="outline"
  - "cancelado" → variant="destructive"
- getBudgetStatus(budget, realized): retorna objeto { color, icon, label }:
  - percent > 100 → text-red-600, AlertTriangle, "Acima do orçamento"
  - percent > 80 → text-yellow-600, TrendingUp, "Próximo do limite"
  - else → text-green-600, CheckCircle2, "Dentro do orçamento"

### 3.6 Layout UI

**4 KPI Cards no topo** (grid 1/2/4 colunas responsivo):
1. Projetos Ativos — count, ícone FolderKanban
2. Orçamento Total — formatCurrency, ícone Target azul
3. Realizado (Despesas) — formatCurrency + "X% do orçamento" + Progress bar (h-2)
4. Status Orçamentário — dois indicadores lado a lado: CheckCircle2 verde (dentro) + AlertTriangle vermelho (acima), ícone TrendingUp verde

**Tabela "Projetos Ativos - Orçamento vs Realizado"** (Card com header + botão "Novo Projeto"):
- Skeleton loading (3 linhas)
- Colunas: Código, Nome (com count de lançamentos), Orçamento, Realizado (laranja), Saldo (verde/vermelho), Progresso (Progress bar h-2 + porcentagem + ícone status), Período (dd/MM/yy), Status (badge), Ações (Eye + Pencil)
- Progress bar muda cor: >100% → [&>div]:bg-red-600, >80% → [&>div]:bg-yellow-600
- Projetos ordenados por numericCodeSort no campo 'code'

**Tabela "Outros Projetos"** (aparece apenas se existem projetos não-ativos):
- Colunas: Código, Nome, Orçamento, Realizado, Status, Ações (Eye + Pencil)
- Mesma lógica de formatação

**Dialog de criação/edição** (DialogContent):
- Grid 2 colunas: Código (Input text) + Status (Select: ativo/pausado/concluido/cancelado)
- Nome* (Input obrigatório)
- Orçamento (Input text, placeholder "0,00")
- Grid 2 colunas: Data de Início (Input type="date") + Data de Término (Input type="date")
- Footer: Cancelar + Criar/Salvar (com Loader2 spinner)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PARTE 4 — COMPONENTE: ProjectKPIsDialog
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Arquivo: src/components/financeiro/masters/ProjectKPIsDialog.tsx

Dialog de detalhe/drill-down de um projeto específico (max-w-[900px], max-h-[90vh], overflow-y-auto).

### 4.1 Props
- open, onOpenChange, project (objeto do projeto), projectData ({ total, receitas, despesas, entries[] })

### 4.2 Cálculos internos
- budget = Number(project.budget) || 0
- despesas, receitas, saldo (total) do projectData
- saldoOrcamento = budget - despesas
- percentUsed = budget > 0 ? (despesas / budget) * 100 : 0
- entryCount, reconciledCount, pendingCount

### 4.3 Layout

**Header**: ícone FolderKanban + "Lançamentos do Projeto: {nome}"
- DialogDescription: código + orçamento formatado

**4 KPI Cards primários** (grid 2/4 colunas, com border-left-4 colorido):
1. Orçamento — border-l-blue-500, ícone Target azul
2. Despesas — border-l-orange-500, text-orange-600, percentual do orçamento
3. Receitas — border-l-green-500, text-green-600
4. Saldo Orçamento — border-l dinâmico (green se ≥0, red se <0), ícone CheckCircle2 ou AlertTriangle

**3 KPI Cards secundários** (grid 3 colunas):
1. Resultado Líquido — receitas - despesas, cor condicional verde/vermelho
2. Total Lançamentos — count + "X conciliados"
3. Pendentes — count não-conciliados, amarelo se >0, verde se 0, percentual conciliado

**Barra de progresso do orçamento** (aparece apenas se budget > 0):
- Container com bg-muted/30, border, rounded
- Label "Consumo do Orçamento" + porcentagem (cor: >100 red, >80 yellow, else green)
- Progress h-3 com cores dinâmicas no [&>div]
- Rodapé: "Gasto: R$ X" + "Disponível: R$ Y"

**Tabela de lançamentos** (ScrollArea h-[280px] com border):
- Colunas: Data (dd/MM/yyyy), Descrição (com ícone ArrowUpCircle verde para RECEITA / ArrowDownCircle vermelho para DESPESA), Plano de Conta (code - name), Status (Badge Conciliado/status), Valor (formatado com +/- e cor verde/vermelho)
- Estado vazio: "Nenhum lançamento vinculado a este projeto"

**Footer**: Botão "Fechar"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PARTE 5 — COMPONENTE BI: ProjectKPIs (Dashboard)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Arquivo: src/components/financeiro/ProjectKPIs.tsx

Versão analítica para o Dashboard BI principal. Difere do FinProjectsManager por:
- Mostra APENAS projetos ativos (status = 'ativo')
- Filtra lançamentos com status = 'PAGO_RECEBIDO' (somente executados de fato)
- Conta apenas DESPESA como "Executado"

### 5.1 Queries
1. queryKey: ["fin-projects-active-kpis"] — projetos ativos ordenados por nome
2. queryKey: ["fin-ledger-entries-projects-kpis"] — lançamentos com project_id não-nulo E status = 'PAGO_RECEBIDO'

### 5.2 Layout
Card com título "KPIs de Projetos Ativos" e ícone FolderKanban.

**Tabela interativa** (clique em qualquer célula de valor abre drill-down):
- Colunas: Projeto (nome + code), Orçamento (clicável), Executado (clicável, text-orange-600), Disponível (clicável, com ícones AlertTriangle/CheckCircle2), Progresso
- Barra de progresso customizada (div com height h-4, rounded-full):
  - Cor: isOverBudget → bg-red-500, isNearLimit (>80%) → bg-yellow-500, else → bg-green-500
  - Se acima do orçamento: overlay adicional bg-red-600/30
  - Escala: 0% | 50% | 100%
  - Badge com percentual (variant: destructive/outline/secondary conforme status)
- Texto abaixo da barra: "R$ X de R$ Y"

### 5.3 Drill-down: ProjectEntriesDialog (componente interno)
- Props: open, onOpenChange, projectId, projectName, filterType ('all'|'budget'|'executed'|'available')
- Query: busca lançamentos do projeto com joins em chart_account e cost_center
- Se filterType = 'executed': filtra por type = 'DESPESA'
- Título dinâmico: "Orçamento - {nome}", "Executado - {nome}", "Disponível - {nome}", "Lançamentos - {nome}"
- Tabela: Data (dd/MM/yyyy), Descrição, Categoria (code - name), Centro de Custo, Valor (cor verde/vermelho por tipo)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PARTE 6 — INTEGRAÇÃO NA PÁGINA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### Página de Cadastros Financeiros (/cadastros-financeiros)
O FinProjectsManager é uma aba dentro de um Tabs com outras abas de cadastro (Plano de Contas, Contas Bancárias, Centros de Custo, etc.).

TabsContent value="projects" className="mt-6" → <FinProjectsManager />
Ícone da aba: FolderKanban

### Dashboard BI (/financeiro)
O ProjectKPIs é renderizado no DashboardBI como seção analítica: <ProjectKPIs />

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PARTE 7 — DEPENDÊNCIAS DE COMPONENTES UI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Componentes shadcn/ui utilizados:
- Card, CardContent, CardHeader, CardTitle
- Button, Input, Label
- Badge (variants: default, secondary, outline, destructive)
- Table, TableBody, TableCell, TableHead, TableHeader, TableRow
- Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
- Select, SelectContent, SelectItem, SelectTrigger, SelectValue
- Skeleton
- Progress
- ScrollArea

Ícones lucide-react:
- Plus, Pencil, FolderKanban, Loader2, TrendingUp, TrendingDown, Eye, Target, DollarSign, AlertTriangle, CheckCircle2, ArrowUpCircle, ArrowDownCircle, X

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PARTE 8 — COMPORTAMENTOS ESPECIAIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Formatação de moeda: sempre pt-BR BRL com toLocaleString
2. Datas formatadas com date-fns locale ptBR, formato "dd/MM/yy" nas tabelas e "dd/MM/yyyy" nos dialogs
3. Budget é inserido como texto ("1234,50") e parseado com replace(",", ".") + parseFloat
4. Projetos são ordenados por código numérico usando numericCodeSort
5. A tabela de ativos é separada da tabela de outros (pausado/concluido/cancelado)
6. O dialog de KPIs (ProjectKPIsDialog) recebe os dados já calculados via props (não faz query própria)
7. O componente de BI (ProjectKPIs) faz query separada filtrando APENAS lançamentos PAGO_RECEBIDO
8. Progress bars usam classe CSS customizada [&>div]:bg-{cor} para mudar a cor do indicador
9. Drill-down no BI é por célula clicável (orçamento, executado, disponível, progresso)
10. Toast de feedback usa sonner: toast.success() e toast.error()
```
