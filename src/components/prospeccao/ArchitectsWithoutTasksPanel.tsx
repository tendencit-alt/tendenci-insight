import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertTriangle, ChevronDown, ChevronUp, Eye, Clock, Building } from "lucide-react";
import { ArchitectProspeccaoSheet } from "./ArchitectProspeccaoSheet";

interface ArquitetoSemTarefa {
  id: string;
  name: string;
  status: string;
  company: string | null;
}

export function ArchitectsWithoutTasksPanel() {
  const [isOpen, setIsOpen] = useState(true);
  const [arquitetosSemTarefa, setArquitetosSemTarefa] = useState<ArquitetoSemTarefa[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArchitectId, setSelectedArchitectId] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const fetchArquitetosSemTarefa = async () => {
    try {
      const { data, error } = await supabase.rpc('check_campaign_dispatch_allowed');
      if (!error && data) {
        const result = data as unknown as { 
          can_dispatch: boolean; 
          total_sem_tarefa: number; 
          arquitetos_sem_tarefa: ArquitetoSemTarefa[] 
        };
        setArquitetosSemTarefa(result.arquitetos_sem_tarefa || []);
      }
    } catch (err) {
      console.error('Erro ao buscar profissionais parceiros sem tarefa:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArquitetosSemTarefa();

    // Realtime subscription para atualizar quando tarefas mudarem
    const channel = supabase
      .channel('architects-tasks-panel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tendenci_prospec_arq_agendamentos' },
        () => fetchArquitetosSemTarefa()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'architects' },
        () => fetchArquitetosSemTarefa()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Não mostrar se não há profissionais parceiros sem tarefa
  if (!loading && arquitetosSemTarefa.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="border-amber-500/50 bg-amber-500/5 shadow-sm">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-amber-500/10 transition-colors py-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Profissionais Parceiros Sem Tarefa Agendada</span>
                  <Badge variant="destructive" className="ml-2 text-xs">
                    {loading ? "..." : arquitetosSemTarefa.length}
                  </Badge>
                </CardTitle>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-amber-600" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-amber-600" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="pt-0 pb-3 px-4">
              <p className="text-xs text-muted-foreground mb-3">
                Profissionais Parceiros em <strong>Contato Iniciado</strong> ou <strong>Parceiro Ativo</strong> que precisam de tarefas futuras para desbloquear campanhas.
              </p>
              
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-10 bg-muted/30 rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                <ScrollArea className="h-[250px] pr-3">
                  <div className="space-y-2 pr-1">
                    {arquitetosSemTarefa.map(arq => (
                      <div 
                        key={arq.id} 
                        className="flex items-center justify-between p-2 rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 gap-2"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{arq.name}</p>
                          {arq.company && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Building className="h-3 w-3" />
                              {arq.company}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={`text-xs whitespace-nowrap ${
                              arq.status === 'contato_iniciado' 
                                ? 'bg-blue-50 dark:bg-blue-950 border-blue-300 text-blue-700 dark:text-blue-300'
                                : 'bg-green-50 dark:bg-green-950 border-green-300 text-green-700 dark:text-green-300'
                            }`}
                          >
                            <Clock className="h-3 w-3 mr-1" />
                            {arq.status === 'contato_iniciado' ? 'Contato Iniciado' : 'Ativado'}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 gap-1 text-xs hover:bg-primary hover:text-primary-foreground"
                            onClick={() => {
                              setSelectedArchitectId(arq.id);
                              setIsSheetOpen(true);
                            }}
                          >
                            <Eye className="h-3 w-3" />
                            Abrir
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {selectedArchitectId && (
        <ArchitectProspeccaoSheet
          architectId={selectedArchitectId}
          open={isSheetOpen}
          onOpenChange={(open) => {
            setIsSheetOpen(open);
            if (!open) {
              // Recarregar lista ao fechar sheet (pode ter criado tarefa)
              fetchArquitetosSemTarefa();
            }
          }}
        />
      )}
    </>
  );
}
