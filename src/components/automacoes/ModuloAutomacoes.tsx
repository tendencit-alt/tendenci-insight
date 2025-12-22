import { useState } from "react";
import { AutomacaoCard } from "./AutomacaoCard";
import { AutomacaoDetailDialog, AutomacaoDetail, AUTOMACOES_DETAILS } from "./AutomacaoDetailDialog";
import { Card, CardContent } from "@/components/ui/card";
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
  const [selectedAutomacao, setSelectedAutomacao] = useState<AutomacaoDetail | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const ativas = automacoes.filter(a => a.ativo).length;
  const totalFalhas = automacoes.reduce((acc, a) => acc + (a.falhas || 0), 0);

  const handleShowDetails = (automacao: Automacao) => {
    const detalhes = AUTOMACOES_DETAILS[automacao.id];
    
    if (detalhes) {
      setSelectedAutomacao({
        id: automacao.id,
        titulo: detalhes.titulo,
        descricao: detalhes.descricao,
        ativo: automacao.ativo,
        oQueFaz: detalhes.oQueFaz,
        comoFunciona: detalhes.comoFunciona,
        quandoExecuta: detalhes.quandoExecuta,
        triggerType: detalhes.triggerType,
        endpoint: detalhes.endpoint,
        dependencias: detalhes.dependencias,
        dicas: detalhes.dicas,
        sucessos: automacao.sucessos,
        falhas: automacao.falhas,
        ultimaExecucao: automacao.ultimaExecucao
      });
    } else {
      // Fallback para automações sem detalhes pré-definidos
      setSelectedAutomacao({
        id: automacao.id,
        titulo: automacao.nome,
        descricao: automacao.descricao,
        ativo: automacao.ativo,
        oQueFaz: automacao.descricao,
        comoFunciona: ['Automação configurada dinamicamente no sistema'],
        quandoExecuta: automacao.triggerType === 'scheduled' ? 'Agendado' : 
                       automacao.triggerType === 'webhook' ? 'Via webhook' :
                       automacao.triggerType === 'event' ? 'Por evento' : 'Manual',
        triggerType: automacao.triggerType || 'manual',
        endpoint: automacao.endpoint,
        dependencias: ['Configuração específica da automação'],
        dicas: ['Verifique os logs para mais detalhes'],
        sucessos: automacao.sucessos,
        falhas: automacao.falhas,
        ultimaExecucao: automacao.ultimaExecucao
      });
    }
    setDialogOpen(true);
  };

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
    <>
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
              onShowDetails={() => handleShowDetails(automacao)}
            />
          ))}
        </div>
      </div>

      <AutomacaoDetailDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        automacao={selectedAutomacao}
      />
    </>
  );
}
