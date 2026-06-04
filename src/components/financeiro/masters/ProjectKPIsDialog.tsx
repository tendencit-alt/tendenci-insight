import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FolderKanban, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowUpCircle, 
  ArrowDownCircle 
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LedgerEntry {
  id: string;
  description: string;
  amount: number;
  type: string;
  competence_date: string;
  cash_date: string | null;
  status: string;
  reconciled: boolean;
  chart_account?: { name: string; code: string } | null;
}

interface ProjectData {
  total: number;
  receitas: number;
  despesas: number;
  entries: LedgerEntry[];
}

interface ProjectKPIsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: any;
  projectData: ProjectData;
}

export function ProjectKPIsDialog({ open, onOpenChange, project, projectData }: ProjectKPIsDialogProps) {
  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  if (!project) return null;

  const despesasPagas = projectData.entries.filter(e => e.type === "DESPESA" && e.status === "PAGO_RECEBIDO").reduce((s, e) => s + Math.abs(Number(e.amount)), 0);
  const totalDespesas = projectData.entries.filter(e => e.type === "DESPESA").reduce((s, e) => s + Math.abs(Number(e.amount)), 0);
  const receitasPagas = projectData.entries.filter(e => e.type === "RECEITA" && e.status === "PAGO_RECEBIDO").reduce((s, e) => s + Math.abs(Number(e.amount)), 0);
  
  const budget = Number(project.budget) || 0;
  const despesas = despesasPagas; 
  const receitas = receitasPagas;
  const saldo = receitasPagas - despesasPagas;
  const saldoOrcamento = budget - despesasPagas;
  const percentUsed = budget > 0 ? (despesasPagas / budget) * 100 : 0;
  const entryCount = projectData.entries.length;
  const reconciledCount = projectData.entries.filter((e) => e.status === "PAGO_RECEBIDO").length;
  const pendingCount = entryCount - reconciledCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5" />
            Lançamentos do Projeto: {project.name}
          </DialogTitle>
          <DialogDescription>
            {project.code && `Código: ${project.code} • `}
            Orçamento: {budget > 0 ? formatCurrency(budget) : "Não definido"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Individual Project KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Orçamento */}
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Orçamento</p>
                    <p className="text-xl font-bold">{budget > 0 ? formatCurrency(budget) : "N/D"}</p>
                  </div>
                  <Target className="h-6 w-6 text-blue-500 opacity-70" />
                </div>
              </CardContent>
            </Card>

            {/* Despesas Realizadas */}
            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Despesas</p>
                    <p className="text-xl font-bold text-orange-600">{formatCurrency(despesasPagas)}</p>
                    {totalDespesas > despesasPagas && (
                      <p className="text-[10px] text-muted-foreground">Total (inc. abertos): {formatCurrency(totalDespesas)}</p>
                    )}
                    {budget > 0 && (
                      <p className="text-xs text-muted-foreground">{percentUsed.toFixed(1)}% do orçamento</p>
                    )}
                  </div>
                  <TrendingDown className="h-6 w-6 text-orange-500 opacity-70" />
                </div>
              </CardContent>
            </Card>

            {/* Receitas */}
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Receitas</p>
                    <p className="text-xl font-bold text-green-600">{formatCurrency(receitas)}</p>
                  </div>
                  <TrendingUp className="h-6 w-6 text-green-500 opacity-70" />
                </div>
              </CardContent>
            </Card>

            {/* Saldo Orçamentário */}
            <Card className={`border-l-4 ${saldoOrcamento >= 0 ? 'border-l-green-500' : 'border-l-red-500'}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Saldo Orçamento</p>
                    <p className={`text-xl font-bold ${saldoOrcamento >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {budget > 0 ? formatCurrency(saldoOrcamento) : "N/D"}
                    </p>
                  </div>
                  {saldoOrcamento >= 0 ? (
                    <CheckCircle2 className="h-6 w-6 text-green-500 opacity-70" />
                  ) : (
                    <AlertTriangle className="h-6 w-6 text-red-500 opacity-70" />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Secondary KPIs Row */}
          <div className="grid grid-cols-3 gap-3">
            {/* Resultado Líquido */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Resultado Líquido</p>
                    <p className={`text-lg font-bold ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(saldo)}
                    </p>
                    <p className="text-xs text-muted-foreground">Receitas - Despesas</p>
                  </div>
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            {/* Total de Lançamentos */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-tight">Pagamentos Confirmados</p>
                    <p className="text-lg font-bold">{entryCount}</p>
                    <p className="text-xs text-muted-foreground">
                      {reconciledCount} recebidos
                    </p>
                  </div>
                  <FolderKanban className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            {/* A Receber / A Pagar */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-tight">Vendas Pendentes de Recebimento</p>
                    <p className={`text-lg font-bold ${pendingCount > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {pendingCount}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {entryCount > 0 ? ((reconciledCount / entryCount) * 100).toFixed(0) : 0}% realizado
                    </p>
                  </div>
                  {pendingCount > 0 ? (
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Progress Bar for Budget */}
          {budget > 0 && (
            <div className="p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Consumo do Orçamento</span>
                <span className={`text-sm font-bold ${percentUsed > 100 ? 'text-red-600' : percentUsed > 80 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {percentUsed.toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={Math.min(percentUsed, 100)} 
                className={`h-3 ${percentUsed > 100 ? '[&>div]:bg-red-600' : percentUsed > 80 ? '[&>div]:bg-yellow-600' : ''}`}
              />
              <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                <span>Gasto: {formatCurrency(despesas)}</span>
                <span>Disponível: {formatCurrency(Math.max(0, saldoOrcamento))}</span>
              </div>
            </div>
          )}

          {/* Breakdown by Category */}
          {(() => {
            const byCategory: Record<string, { name: string; code: string; receitas: number; despesas: number; count: number }> = {};
            projectData.entries.forEach((e) => {
              const key = e.chart_account ? `${e.chart_account.code}|${e.chart_account.name}` : "_sem_categoria";
              if (!byCategory[key]) {
                byCategory[key] = {
                  name: e.chart_account?.name || "Sem categoria",
                  code: e.chart_account?.code || "-",
                  receitas: 0, despesas: 0, count: 0,
                };
              }
              const amt = Math.abs(Number(e.amount));
              if (e.type === "RECEITA") byCategory[key].receitas += amt;
              else byCategory[key].despesas += amt;
              byCategory[key].count++;
            });
            const categories = Object.values(byCategory)
              .filter((c) => c.despesas > 0 || c.receitas > 0)
              .sort((a, b) => b.despesas - a.despesas);
            if (categories.length === 0) return null;
            // Distribute budget proportionally across expense categories used
            const totalDespesas = categories.reduce((s, c) => s + c.despesas, 0);
            return (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Detalhamento por Categoria de Despesa
                </h4>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Categoria</TableHead>
                        <TableHead className="text-center">Lançamentos</TableHead>
                        <TableHead className="text-right">Realizado</TableHead>
                        <TableHead className="text-right">% do Total</TableHead>
                        <TableHead className="text-center">Alerta</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories.map((c) => {
                        const pctTotal = totalDespesas > 0 ? (c.despesas / totalDespesas) * 100 : 0;
                        const overBudget = budget > 0 && c.despesas > budget;
                        return (
                          <TableRow key={`${c.code}-${c.name}`} className={overBudget ? "bg-red-50 dark:bg-red-950/20" : ""}>
                            <TableCell className="text-sm">
                              <span className="font-mono text-xs text-muted-foreground mr-2">{c.code}</span>
                              {c.name}
                            </TableCell>
                            <TableCell className="text-center text-sm">{c.count}</TableCell>
                            <TableCell className={`text-right font-medium ${overBudget ? "text-red-600" : ""}`}>
                              {formatCurrency(c.despesas)}
                            </TableCell>
                            <TableCell className="text-right text-sm">{pctTotal.toFixed(1)}%</TableCell>
                            <TableCell className="text-center">
                              {overBudget ? (
                                <Badge variant="destructive" className="gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  Acima do orçado
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">OK</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            );
          })()}

          {/* Entries List */}
          <div>

            <h4 className="text-sm font-medium mb-2">Lançamentos do Projeto</h4>
            <ScrollArea className="h-[280px] border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Plano de Conta</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectData.entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-sm">
                        {format(new Date(entry.competence_date), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {entry.type === "RECEITA" ? (
                            <ArrowUpCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                          ) : (
                            <ArrowDownCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                          )}
                          <span className="truncate max-w-[200px]">{entry.description}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {entry.chart_account ? `${entry.chart_account.code} - ${entry.chart_account.name}` : "-"}
                      </TableCell>
                      <TableCell>
                        {entry.status === "PAGO_RECEBIDO" ? (
                          <Badge variant="secondary" className="text-xs">Realizado</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">{entry.status}</Badge>
                        )}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${entry.type === "RECEITA" ? "text-green-600" : "text-red-600"}`}>
                        {entry.type === "RECEITA" ? "+" : "-"}
                        {formatCurrency(Math.abs(Number(entry.amount)))}
                      </TableCell>
                    </TableRow>
                  ))}
                  {projectData.entries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Nenhum lançamento vinculado a este projeto
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
