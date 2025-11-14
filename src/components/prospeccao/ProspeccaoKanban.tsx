import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Building, MapPin, Phone, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const STAGES = [
  { id: "novo_arquiteto", label: "Novo Arquiteto", color: "bg-gray-500" },
  { id: "contato_iniciado", label: "Contato Iniciado", color: "bg-blue-500" },
  { id: "em_conversa", label: "Em Conversa", color: "bg-cyan-500" },
  { id: "interessado", label: "Interessado", color: "bg-orange-500" },
  { id: "reuniao_agendada", label: "Reunião Agendada", color: "bg-purple-500" },
  { id: "parceiro_ativo", label: "Parceiro Ativo", color: "bg-green-500" },
  { id: "sem_interesse", label: "Sem Interesse", color: "bg-red-500" },
];

interface ProspeccaoKanbanProps {
  filters?: any;
  showNaoContactados?: boolean;
}

export function ProspeccaoKanban({ filters = {}, showNaoContactados = false }: ProspeccaoKanbanProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar arquitetos com filtros aplicados
  const { data: architects, isLoading } = useQuery({
    queryKey: ["prospeccao-architects", filters, showNaoContactados],
    queryFn: async () => {
      let query = supabase
        .from("architects")
        .select(`
          *,
          vendedor:profiles!architects_vendedor_responsavel_fkey(full_name, email)
        `)
        .eq("active", true);

      // Aplicar filtro de não contactados
      if (showNaoContactados) {
        query = query.or("data_primeiro_contato.is.null,status_funil.eq.novo_arquiteto");
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

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  // Agrupar arquitetos por status
  const architectsByStatus = STAGES.reduce((acc, stage) => {
    acc[stage.id] = architects?.filter(a => (a.status_funil || "novo_arquiteto") === stage.id) || [];
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {STAGES.map((stage) => (
        <div
          key={stage.id}
          className="flex-shrink-0 w-80"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, stage.id)}
        >
          {/* Column Header */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm">{stage.label}</h3>
              <Badge variant="secondary" className="text-xs">
                {architectsByStatus[stage.id]?.length || 0}
              </Badge>
            </div>
            <div className={`h-1 rounded-full ${stage.color}`} />
          </div>

          {/* Cards */}
          <div className="space-y-3">
            {architectsByStatus[stage.id]?.map((architect) => (
              <Card
                key={architect.id}
                draggable
                onDragStart={(e) => handleDragStart(e, architect.id)}
                className="p-4 cursor-move hover:shadow-lg transition-shadow"
              >
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {architect.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-semibold text-sm">{architect.name}</h4>
                        <Badge variant="outline" className="text-xs mt-1">
                          {architect.tier || 'B'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="space-y-2 text-xs text-muted-foreground">
                    {architect.company && (
                      <div className="flex items-center gap-2">
                        <Building className="h-3 w-3" />
                        <span className="truncate">{architect.company}</span>
                      </div>
                    )}
                    {architect.city && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3" />
                        <span>{architect.city}</span>
                      </div>
                    )}
                    {architect.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        <span>{architect.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Package className="h-3 w-3" />
                      <span>0 projetos</span>
                    </div>
                    {architect.data_ultimo_contato && (
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(architect.data_ultimo_contato), "dd/MM")}
                      </span>
                    )}
                  </div>

                  {/* Vendedor */}
                  {architect.vendedor && (
                    <div className="text-xs text-muted-foreground">
                      📊 {architect.vendedor.full_name || architect.vendedor.email}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
