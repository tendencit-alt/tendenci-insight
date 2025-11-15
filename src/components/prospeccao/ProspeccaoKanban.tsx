import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Building, MapPin, Phone, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ArchitectProspeccaoSheet } from "./ArchitectProspeccaoSheet";

interface ProspeccaoKanbanProps {
  filters?: any;
  showNaoContactados?: boolean;
}

export function ProspeccaoKanban({ filters = {}, showNaoContactados = false }: ProspeccaoKanbanProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedArchitectId, setSelectedArchitectId] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

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
          vendedor:profiles!architects_vendedor_responsavel_fkey(full_name, email),
          projects:projects(id)
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
      const { error } = await supabase
        .from("architects")
        .update({ 
          status_funil: newStatus,
          data_ultimo_contato: new Date().toISOString(),
        })
        .eq("id", architectId);

      if (error) throw error;
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
              <Badge variant="outline" className="text-xs">
                {architectsByStatus[stage.slug]?.length || 0}
              </Badge>
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
                className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                draggable
                onDragStart={(e) => handleDragStart(e, architect.id)}
                onClick={() => {
                  setSelectedArchitectId(architect.id);
                  setIsSheetOpen(true);
                }}
              >
                <div className="space-y-3">
                  {/* Header com Avatar e Nome */}
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {architect.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm truncate">{architect.name}</h4>
                      {architect.vendedor?.full_name && (
                        <p className="text-xs text-muted-foreground truncate">
                          Vendedor: {architect.vendedor.full_name}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Informações */}
                  <div className="space-y-2 text-xs">
                    {architect.company && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Building className="h-3 w-3" />
                        <span className="truncate">{architect.company}</span>
                      </div>
                    )}
                    {architect.city && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>{architect.city}</span>
                      </div>
                    )}
                    {architect.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <span>{architect.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Badges */}
                  <div className="flex gap-2 flex-wrap">
                    {architect.tier && (
                      <Badge variant="outline" className="text-xs">
                        Tier {architect.tier}
                      </Badge>
                    )}
                    {architect.projects && architect.projects.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {architect.projects.length} projeto{architect.projects.length > 1 ? 's' : ''}
                      </Badge>
                    )}
                    {architect.data_ultimo_contato && (
                      <Badge variant="secondary" className="text-xs">
                        Último: {format(new Date(architect.data_ultimo_contato), "dd/MM")}
                      </Badge>
                    )}
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
    </div>
  );
}
