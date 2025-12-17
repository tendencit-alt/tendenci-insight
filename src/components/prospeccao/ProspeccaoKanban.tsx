import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Building, MapPin, Phone, Package, Plus, User, Target, PhoneOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays } from "date-fns";
import { ArchitectProspeccaoSheet } from "./ArchitectProspeccaoSheet";
import { CreateProjectDialog } from "@/components/projects/CreateProjectDialog";
import { CreateArchitectDialog } from "@/components/architects/CreateArchitectDialog";

interface ProspeccaoKanbanProps {
  filters?: any;
  showNaoContactados?: boolean;
}

export function ProspeccaoKanban({ filters = {}, showNaoContactados = false }: ProspeccaoKanbanProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedArchitectId, setSelectedArchitectId] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [projectArchitectId, setProjectArchitectId] = useState<string | null>(null);
  const [isCreateArchitectOpen, setIsCreateArchitectOpen] = useState(false);

  // Buscar stages dinâmicos
  const { data: stages } = useQuery({
    queryKey: ["prospec-stages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tendenci_prospec_arq_stages")
        .select("*")
        .eq("ativa", true)
        .order("position");

      if (error) throw error;
      return data || [];
    },
  });

  // Buscar arquitetos usando RPC otimizado
  const { data: architects, isLoading } = useQuery({
    queryKey: ["prospeccao-architects", filters, showNaoContactados],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_prospeccao_architects_optimized', {
        p_show_nao_contactados: showNaoContactados,
        p_vendedor_id: filters.vendedor && filters.vendedor !== "todos" ? filters.vendedor : null,
        p_status_funil: filters.status && filters.status !== "todos" ? filters.status : null,
        p_cidade: filters.cidade && filters.cidade !== "todas" ? filters.cidade : null,
        p_tier: filters.tier && filters.tier !== "todos" ? filters.tier : null,
        p_search: filters.search || null,
      });

      if (error) throw error;
      
      // Mapear dados do RPC para estrutura esperada
      return data?.map((architect: any) => ({
        ...architect,
        vendedor: {
          full_name: architect.vendedor_full_name,
          email: architect.vendedor_email,
          username: architect.vendedor_username,
        },
        ultimo_vendedor: architect.ultimo_vendedor_username ? {
          username: architect.ultimo_vendedor_username,
          full_name: architect.ultimo_vendedor_full_name,
        } : null,
        whatsapp_valido: architect.whatsapp_valido,
      }));
    },
  });

  // Atualizar status do arquiteto
  const updateStatusMutation = useMutation({
    mutationFn: async ({ architectId, newStatus }: { architectId: string; newStatus: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("architects")
        .update({ 
          status_funil: newStatus,
          data_ultimo_contato: new Date().toISOString(),
          vendedor_responsavel: user?.id, // Atribui automaticamente o vendedor que moveu o card
        })
        .eq("id", architectId);

      if (error) throw error;

      // Registrar no histórico
      await supabase.from("architect_history").insert({
        architect_id: architectId,
        event_type: "sistema",
        description: `Status alterado para: ${newStatus}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospeccao-architects"] });
      toast({
        title: "Sucesso",
        description: "Status do arquiteto atualizado!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar status do arquiteto.",
        variant: "destructive",
      });
    },
  });

  const handleDragStart = (e: React.DragEvent, architectId: string) => {
    e.dataTransfer.setData("architectId", architectId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const architectId = e.dataTransfer.getData("architectId");
    updateStatusMutation.mutate({ architectId, newStatus });
  };

  if (isLoading || !stages) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex-shrink-0 w-80 space-y-3">
            <div className="h-20 bg-muted/50 rounded-lg animate-pulse" />
            <div className="h-32 bg-muted/30 rounded-lg animate-pulse" />
            <div className="h-32 bg-muted/30 rounded-lg animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  // Agrupar arquitetos por status
  const architectsByStatus = stages.reduce((acc, stage) => {
    acc[stage.slug] = architects?.filter(a => (a.status_funil || "novo_arquiteto") === stage.slug) || [];
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {stages.map((stage) => (
        <div
          key={stage.slug}
          className="flex-shrink-0 w-80"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, stage.slug)}
        >
          {/* Column Header */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm">{stage.nome}</h3>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={() => setIsCreateArchitectOpen(true)}
                  title="Adicionar novo arquiteto"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Badge variant="outline" className="text-xs">
                  {architectsByStatus[stage.slug]?.length || 0}
                </Badge>
              </div>
            </div>
            <Badge className={`${stage.cor} w-full justify-center`}>
              {stage.nome}
            </Badge>
          </div>

          {/* Cards */}
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {architectsByStatus[stage.slug]?.map((architect) => (
              <Card
                key={architect.id}
                className="p-4 hover:shadow-md transition-shadow"
                draggable
                onDragStart={(e) => handleDragStart(e, architect.id)}
              >
                  <div className="space-y-3">
                  {/* Header com Avatar, Nome e Botão */}
                  <div className="flex items-start gap-3">
                    <Avatar 
                      className="h-10 w-10 cursor-pointer flex-shrink-0" 
                      onClick={() => {
                        setSelectedArchitectId(architect.id);
                        setIsSheetOpen(true);
                      }}
                    >
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {architect.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div 
                        className="cursor-pointer"
                        onClick={() => {
                          setSelectedArchitectId(architect.id);
                          setIsSheetOpen(true);
                        }}
                      >
                        <h4 className="font-semibold text-sm truncate">{architect.name}</h4>
                        {architect.data_ultimo_contato && (
                          <p className="text-xs text-muted-foreground">
                            Último contato: {format(new Date(architect.data_ultimo_contato), "dd/MM/yyyy")}
                          </p>
                        )}
                        {architect.ultimo_projeto_data && (
                          <p className="text-xs text-purple-600">
                            Último projeto: {format(new Date(architect.ultimo_projeto_data), "dd/MM/yyyy")}
                          </p>
                        )}
                        {!architect.data_ultimo_contato && (
                          <p className="text-xs text-red-500 italic">
                            Sem contato registrado
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 mt-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          setProjectArchitectId(architect.id);
                          setIsCreateProjectOpen(true);
                        }}
                        title="Criar novo projeto"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Informações de Contato */}
                  <div className="space-y-1.5 text-xs">
                    {architect.company && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Building className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{architect.company}</span>
                      </div>
                    )}
                    {architect.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-3 w-3 flex-shrink-0" />
                        <span>{architect.phone}</span>
                      </div>
                    )}
                    {architect.city && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span>{architect.city}</span>
                      </div>
                    )}
                    {architect.vendedor?.full_name && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{architect.vendedor.full_name}</span>
                      </div>
                    )}
                  </div>

                  {/* Badges - Indicações, Produtos e Projetos */}
                  <div className="flex gap-1.5 flex-wrap">
                    {/* Badge 0: Erro de Disparo */}
                    {architect.tag_prospeccao === 'erro_disparo' && (
                      <Badge variant="destructive" className="text-xs">
                        ⚠️ Erro Disparo
                      </Badge>
                    )}

                    {/* Badge 0.5: WhatsApp Inválido */}
                    {architect.whatsapp_valido === false && (
                      <Badge variant="destructive" className="text-xs flex items-center gap-1">
                        <PhoneOff className="h-3 w-3" />
                        Sem WhatsApp
                      </Badge>
                    )}

                    {/* Badge 1: Status de Contato */}
                    {architect.status_funil === 'adicionar_epata' ? (
                      <Badge variant="outline" className="text-xs bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300">
                        🤖 Contato feito por I.A
                      </Badge>
                    ) : !architect.data_primeiro_contato && !architect.data_ultimo_contato ? (
                      <Badge variant="outline" className="text-xs bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">
                        ⚠️ Nunca Contactado
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                        ✅ Contactado
                      </Badge>
                    )}

                    {/* Badge 2: Vendedor Responsável */}
                    {(() => {
                      const vendedorUsername = 
                        architect.ultimo_vendedor?.username || 
                        architect.vendedor?.username;
                      
                      return vendedorUsername ? (
                        <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                          @{vendedorUsername}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-muted-foreground">
                          Sem vendedor
                        </Badge>
                      );
                    })()}

                    {/* Badge 3: Total de Projetos */}
                    {(() => {
                      const totalProjects = architect.total_projects || 0;
                      
                      return totalProjects > 0 ? (
                        <Badge className="text-xs bg-green-600 hover:bg-green-700">
                          📦 {totalProjects} projeto{totalProjects > 1 ? 's' : ''}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300">
                          0 projetos
                        </Badge>
                      );
                    })()}

                    {/* Badge 4: Indicação */}
                    {(() => {
                      const totalIndicacoes = architect.total_indicacoes || 0;
                      
                      return totalIndicacoes > 0 ? (
                        <Badge className="text-xs bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          Indicação
                        </Badge>
                      ) : null;
                    })()}

                    {/* Badge 5: Produtos Indicados */}
                    {(() => {
                      const produtos = architect.produtos_indicados || [];
                      
                      return Array.isArray(produtos) && produtos.length > 0 ? (
                        produtos.slice(0, 3).map((produto: string, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-xs bg-amber-50 dark:bg-amber-950 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300">
                            {produto}
                          </Badge>
                        ))
                      ) : null;
                    })()}
                  </div>
                </div>
              </Card>
            ))}

            {architectsByStatus[stage.slug]?.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Nenhum arquiteto nesta etapa
              </div>
            )}
          </div>
        </div>
      ))}

      {selectedArchitectId && (
        <ArchitectProspeccaoSheet
          architectId={selectedArchitectId}
          open={isSheetOpen}
          onOpenChange={setIsSheetOpen}
        />
      )}

      <CreateProjectDialog
        open={isCreateProjectOpen}
        onOpenChange={setIsCreateProjectOpen}
        preSelectedArchitectId={projectArchitectId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["prospeccao-architects"] });
          toast({
            title: "Sucesso",
            description: "Projeto criado e arquiteto movido para Parceiro Ativo!",
          });
        }}
      />

      <CreateArchitectDialog
        open={isCreateArchitectOpen}
        onOpenChange={setIsCreateArchitectOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["prospeccao-architects"] });
          toast({
            title: "Sucesso",
            description: "Arquiteto adicionado com sucesso!",
          });
        }}
      />
    </div>
  );
}
