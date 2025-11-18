import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Building, MapPin, Phone, Package, Plus, User } from "lucide-react";
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

  // Buscar arquitetos com filtros aplicados
  const { data: architects, isLoading } = useQuery({
    queryKey: ["prospeccao-architects", filters, showNaoContactados],
    queryFn: async () => {
      let query = supabase
        .from("architects")
        .select(`
          *,
          vendedor:profiles!architects_vendedor_responsavel_fkey(full_name, email, username),
          created_by_profile:profiles!architects_created_by_fkey(username, full_name),
          projects:projects(id),
          architect_projects:architect_projects(id, data_projeto)
        `)
        .eq("active", true);

      // Aplicar filtro de não contactados
      if (showNaoContactados) {
        query = query.is("data_primeiro_contato", null);
      }

      // Aplicar filtros
      if (filters.vendedor && filters.vendedor !== "todos") {
        query = query.eq("vendedor_responsavel", filters.vendedor);
      }
      if (filters.status && filters.status !== "todos") {
        query = query.eq("status_funil", filters.status);
      }
      if (filters.cidade && filters.cidade !== "todas") {
        query = query.eq("city", filters.cidade);
      }
      if (filters.tier && filters.tier !== "todos") {
        query = query.eq("tier", filters.tier);
      }
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,company.ilike.%${filters.search}%,city.ilike.%${filters.search}%`);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      return data;
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
        event_type: "status_change",
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
    return <div className="text-center py-8">Carregando...</div>;
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

                  {/* Badges */}
                  <div className="flex gap-1.5 flex-wrap">
                    {/* STATUS: Primeiro Contato */}
                    {!architect.data_primeiro_contato && !architect.data_ultimo_contato ? (
                      <Badge variant="outline" className="text-xs bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">
                        ⚠️ Nunca Contactado
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
                        📞 Contactado
                      </Badge>
                    )}

                    {/* VENDEDOR RESPONSÁVEL - Último contato */}
                    {(() => {
                      // Prioridade: vendedor_responsavel > created_by
                      const vendedorUsername = 
                        architect.vendedor?.username || 
                        architect.created_by_profile?.username;
                      
                      return vendedorUsername ? (
                        <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                          👤 @{vendedorUsername}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-muted-foreground">
                          👤 Sem vendedor
                        </Badge>
                      );
                    })()}

                    {/* DIAS SEM ENVIAR PROJETO */}
                    {(() => {
                      const referenceDate = architect.ultimo_projeto_data 
                        ? new Date(architect.ultimo_projeto_data)
                        : architect.data_primeiro_contato 
                          ? new Date(architect.data_primeiro_contato)
                          : new Date(architect.created_at);
                      const days = differenceInDays(new Date(), referenceDate);
                      
                      return (
                        <Badge variant="outline" className="text-xs bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800">
                          ⏱️ {days} {days === 1 ? 'dia' : 'dias'} sem projeto
                        </Badge>
                      );
                    })()}

                    {/* PROJETOS ENVIADOS */}
                    {(() => {
                      // Combinar projetos de ambas as tabelas
                      const allProjects = [
                        ...(architect.projects || []),
                        ...(architect.architect_projects || [])
                      ];
                      const totalProjects = allProjects.length;
                      
                      return totalProjects > 0 ? (
                        <Badge className="text-xs bg-green-600 hover:bg-green-700">
                          📦 {totalProjects} {totalProjects === 1 ? 'projeto' : 'projetos'}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300">
                          0 projetos
                        </Badge>
                      );
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
