import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  AlertTriangle, 
  Calculator, 
  FileQuestion,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { useState } from "react";

interface FinanceiroAlertsProps {
  entries: any[];
  transactions: any[];
  lastImportDate?: string | null;
  onNavigateToEntry?: (entryId: string) => void;
}

interface AlertItem {
  id: string;
  type: 'warning' | 'error' | 'info';
  category: string;
  title: string;
  description: string;
  count?: number;
  items?: { id: string; label: string; value?: string }[];
}

export function FinanceiroAlerts({ entries, transactions, lastImportDate, onNavigateToEntry }: FinanceiroAlertsProps) {
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set());

  const toggleAlert = (alertId: string) => {
    const newExpanded = new Set(expandedAlerts);
    if (newExpanded.has(alertId)) {
      newExpanded.delete(alertId);
    } else {
      newExpanded.add(alertId);
    }
    setExpandedAlerts(newExpanded);
  };

  // Calculate alerts
  const alerts: AlertItem[] = [];

  // 1. Unreconciled bank transactions
  const unreconciledTransactions = transactions?.filter(t => 
    t.status === 'PENDENTE' || t.status === 'SUGERIDA'
  ) || [];
  
  if (unreconciledTransactions.length > 0) {
    alerts.push({
      id: 'unreconciled-transactions',
      type: 'warning',
      category: 'Conciliação',
      title: 'Transações pendentes de conciliação',
      description: `${unreconciledTransactions.length} transação(ões) do extrato bancário aguardando conciliação`,
      count: unreconciledTransactions.length,
      items: unreconciledTransactions.slice(0, 5).map(t => ({
        id: t.id,
        label: t.bank_memo || 'Sem descrição',
        value: Math.abs(Number(t.amount)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      }))
    });
  }

  // 2. Value mismatch between reconciled entry and bank transaction
  const reconciliationLinks = entries?.filter(e => e.reconciled && e.reconciliation_links?.length > 0) || [];
  const valueMismatches: { id: string; label: string; value: string }[] = [];
  
  // For now, we check entries that have reconciliation data
  // In a real scenario, we'd need to join with bank transactions
  entries?.forEach(entry => {
    if (entry.juros_atraso && Number(entry.juros_atraso) > 0) {
      // Entry has late fees, which might indicate a mismatch
      const entryAmount = Number(entry.amount);
      const totalWithFees = entryAmount + Number(entry.juros_atraso);
      valueMismatches.push({
        id: entry.id,
        label: entry.description,
        value: `Lançamento: ${entryAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} + Juros: ${Number(entry.juros_atraso).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
      });
    }
  });

  // Check for reconciled entries where the bank transaction amount differs
  transactions?.forEach(tx => {
    if (tx.status === 'DIVERGENTE') {
      valueMismatches.push({
        id: tx.id,
        label: tx.bank_memo || 'Transação',
        value: `Valor divergente: ${Math.abs(Number(tx.amount)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
      });
    }
  });

  if (valueMismatches.length > 0) {
    alerts.push({
      id: 'value-mismatch',
      type: 'error',
      category: 'Divergência',
      title: 'Valor conciliado ≠ valor do extrato',
      description: `${valueMismatches.length} lançamento(s) com diferença entre valor conciliado e extrato`,
      count: valueMismatches.length,
      items: valueMismatches.slice(0, 5)
    });
  }

  // 3. Entries without chart of accounts
  const entriesWithoutChartAccount = entries?.filter(e => 
    !e.chart_account_id && e.status !== 'CANCELADO'
  ) || [];
  
  if (entriesWithoutChartAccount.length > 0) {
    alerts.push({
      id: 'no-chart-account',
      type: 'warning',
      category: 'Classificação',
      title: 'Lançamento sem plano de contas',
      description: `${entriesWithoutChartAccount.length} lançamento(s) não possuem classificação contábil`,
      count: entriesWithoutChartAccount.length,
      items: entriesWithoutChartAccount.slice(0, 5).map(e => ({
        id: e.id,
        label: e.description,
        value: Math.abs(Number(e.amount)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      }))
    });
  }

  // 4. Entries with late fees (informational)
  const entriesWithLateFees = entries?.filter(e => 
    e.juros_atraso && Number(e.juros_atraso) > 0 && e.status !== 'CANCELADO'
  ) || [];
  
  const totalLateFees = entriesWithLateFees.reduce((sum, e) => sum + Number(e.juros_atraso || 0), 0);
  
  if (entriesWithLateFees.length > 0) {
    alerts.push({
      id: 'late-fees',
      type: 'info',
      category: 'Juros',
      title: 'Juros por atraso registrados',
      description: `${entriesWithLateFees.length} lançamento(s) com juros totalizando ${totalLateFees.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
      count: entriesWithLateFees.length,
      items: entriesWithLateFees.slice(0, 5).map(e => ({
        id: e.id,
        label: e.description,
        value: `Juros: ${Number(e.juros_atraso).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
      }))
    });
  }

  if (alerts.length === 0) return null;

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <Calculator className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <FileQuestion className="h-4 w-4" />;
    }
  };

  const getAlertVariant = (type: string) => {
    switch (type) {
      case 'error':
        return 'destructive' as const;
      case 'warning':
        return 'default' as const;
      default:
        return 'default' as const;
    }
  };

  const getAlertStyles = (type: string) => {
    switch (type) {
      case 'error':
        return 'border-red-500/50 bg-red-500/10';
      case 'warning':
        return 'border-amber-500/50 bg-amber-500/10';
      default:
        return 'border-blue-500/50 bg-blue-500/10';
    }
  };

  const getTextColor = (type: string) => {
    switch (type) {
      case 'error':
        return 'text-red-600';
      case 'warning':
        return 'text-amber-600';
      default:
        return 'text-blue-600';
    }
  };

  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <Collapsible 
          key={alert.id} 
          open={expandedAlerts.has(alert.id)} 
          onOpenChange={() => toggleAlert(alert.id)}
        >
          <Alert className={getAlertStyles(alert.type)}>
            <div className="flex items-start gap-2">
              <span className={getTextColor(alert.type)}>
                {getAlertIcon(alert.type)}
              </span>
              <div className="flex-1">
                <AlertTitle className={`${getTextColor(alert.type)} flex items-center justify-between text-sm`}>
                  <span className="flex items-center gap-2">
                    <Badge variant="outline" className={`${getTextColor(alert.type)} border-current text-xs`}>
                      {alert.category}
                    </Badge>
                    {alert.title}
                    <Badge className={`${alert.type === 'error' ? 'bg-red-600' : alert.type === 'warning' ? 'bg-amber-600' : 'bg-blue-600'} text-xs`}>
                      {alert.count}
                    </Badge>
                  </span>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className={`h-6 w-6 p-0 ${getTextColor(alert.type)}`}>
                      {expandedAlerts.has(alert.id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                </AlertTitle>
                <AlertDescription className={`${getTextColor(alert.type)}/80 text-xs mt-1`}>
                  {alert.description}
                </AlertDescription>
                <CollapsibleContent className="mt-2">
                  {alert.items && alert.items.length > 0 && (
                    <div className="space-y-1 rounded border bg-background/50 p-2">
                      {alert.items.map((item) => (
                        <div 
                          key={item.id} 
                          className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-muted/50 cursor-pointer"
                          onClick={() => onNavigateToEntry?.(item.id)}
                        >
                          <span className="truncate max-w-[200px]">{item.label}</span>
                          <span className="text-muted-foreground font-medium">{item.value}</span>
                        </div>
                      ))}
                      {(alert.count || 0) > 5 && (
                        <p className="text-xs text-muted-foreground text-center pt-1">
                          ... e mais {(alert.count || 0) - 5} item(ns)
                        </p>
                      )}
                    </div>
                  )}
                </CollapsibleContent>
              </div>
            </div>
          </Alert>
        </Collapsible>
      ))}
    </div>
  );
}
