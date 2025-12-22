import { AutomacaoCard } from "./AutomacaoCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";

interface Automacao {
  id: string;
  nome: string;
  descricao: string;
  ativo: boolean;
  ultimaExecucao?: string | null;
  sucessos?: number;
  falhas?: number;
  endpoint?: string;
  triggerType?: 'scheduled' | 'webhook' | 'event' | 'manual';
}

interface ModuloAutomacoesProps {
  titulo: string;
  descricao: string;
  automacoes: Automacao[];
  loading?: boolean;
  onViewLogs?: (id: string) => void;
  onTest?: (id: string) => void;
}

export function ModuloAutomacoes({
  titulo,
  descricao,
  automacoes,
  loading = false,
  onViewLogs,
  onTest
}: ModuloAutomacoesProps) {
  const ativas = automacoes.filter(a => a.ativo).length;
  const totalFalhas = automacoes.reduce((acc, a) => acc + (a.falhas || 0), 0);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-5 w-20" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  if (automacoes.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhuma automação configurada neste módulo</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{titulo}</h3>
          <p className="text-sm text-muted-foreground">{descricao}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {ativas}/{automacoes.length} ativas
          </Badge>
          {totalFalhas > 0 && (
            <Badge variant="destructive">
              {totalFalhas} falha(s)
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {automacoes.map((automacao) => (
          <AutomacaoCard
            key={automacao.id}
            nome={automacao.nome}
            descricao={automacao.descricao}
            ativo={automacao.ativo}
            ultimaExecucao={automacao.ultimaExecucao}
            sucessos={automacao.sucessos}
            falhas={automacao.falhas}
            endpoint={automacao.endpoint}
            triggerType={automacao.triggerType}
            onViewLogs={onViewLogs ? () => onViewLogs(automacao.id) : undefined}
            onTest={onTest ? () => onTest(automacao.id) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
