import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Segment {
  id: string;
  nome: string;
  descricao: string;
  filtros: {
    cidade?: string[];
    tier?: string[];
    categoria?: string[];
    vendedor?: string;
    status_funil?: string[];
  };
  created_at: string;
}

export function SegmentosManager() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSegment, setEditingSegment] = useState<Segment | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    filtros: {
      cidade: [] as string[],
      tier: [] as string[],
      categoria: [] as string[],
      vendedor: "",
      status_funil: [] as string[],
    },
  });
  const queryClient = useQueryClient();

  // Buscar segmentos
  const { data: segments, isLoading } = useQuery({
    queryKey: ["prospec-segments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tendenci_prospec_arq_segments")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Segment[];
    },
  });

  // Buscar cidades para filtro
  const { data: cidades } = useQuery({
    queryKey: ["cidades-filter"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("architects")
        .select("city")
        .not("city", "is", null);

      if (error) throw error;
      return [...new Set(data.map(a => a.city))].filter(Boolean).sort();
    },
  });

  // Criar/atualizar segmento
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        nome: formData.nome,
        descricao: formData.descricao,
        filtros: formData.filtros,
      };

      if (editingSegment) {
        const { error } = await supabase
          .from("tendenci_prospec_arq_segments")
          .update(payload)
          .eq("id", editingSegment.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("tendenci_prospec_arq_segments")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospec-segments"] });
      setDialogOpen(false);
      resetForm();
      toast.success(editingSegment ? "Segmento atualizado!" : "Segmento criado!");
    },
    onError: () => {
      toast.error("Erro ao salvar segmento");
    },
  });

  // Deletar segmento
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tendenci_prospec_arq_segments")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospec-segments"] });
      toast.success("Segmento removido!");
    },
    onError: () => {
      toast.error("Erro ao remover segmento");
    },
  });

  const resetForm = () => {
    setFormData({
      nome: "",
      descricao: "",
      filtros: {
        cidade: [],
        tier: [],
        categoria: [],
        vendedor: "",
        status_funil: [],
      },
    });
    setEditingSegment(null);
  };

  const handleEdit = (segment: Segment) => {
    setEditingSegment(segment);
    setFormData({
      nome: segment.nome,
      descricao: segment.descricao || "",
      filtros: {
        cidade: segment.filtros?.cidade || [],
        tier: segment.filtros?.tier || [],
        categoria: segment.filtros?.categoria || [],
        vendedor: segment.filtros?.vendedor || "",
        status_funil: segment.filtros?.status_funil || [],
      },
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: string, nome: string) => {
    if (confirm(`Tem certeza que deseja remover o segmento "${nome}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Segmentos de Prospecção</h2>
          <p className="text-muted-foreground">Crie segmentos para organizar seus arquitetos</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Segmento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingSegment ? "Editar Segmento" : "Novo Segmento"}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Segmento *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Arquitetos Tier A de São Paulo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descreva o segmento..."
                  rows={3}
                />
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-4">Filtros do Segmento</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tier</Label>
                    <Select
                      value={formData.filtros.tier?.[0] || ""}
                      onValueChange={(value) => 
                        setFormData({
                          ...formData,
                          filtros: { ...formData.filtros, tier: value ? [value] : [] },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todos</SelectItem>
                        <SelectItem value="A">Tier A</SelectItem>
                        <SelectItem value="B">Tier B</SelectItem>
                        <SelectItem value="C">Tier C</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select
                      value={formData.filtros.categoria?.[0] || ""}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          filtros: { ...formData.filtros, categoria: value ? [value] : [] },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todas</SelectItem>
                        <SelectItem value="metropolitano">Metropolitano</SelectItem>
                        <SelectItem value="regional">Regional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground mt-4">
                  * Filtros adicionais podem ser configurados via API
                </p>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                  Cancelar
                </Button>
                <Button 
                  onClick={() => saveMutation.mutate()}
                  disabled={!formData.nome.trim() || saveMutation.isPending}
                >
                  {editingSegment ? "Atualizar" : "Criar"} Segmento
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de Segmentos */}
      {isLoading ? (
        <div className="text-center py-8">Carregando segmentos...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {segments?.map((segment) => (
            <Card key={segment.id} className="p-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">{segment.nome}</h3>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(segment)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDelete(segment.id, segment.nome)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                {segment.descricao && (
                  <p className="text-sm text-muted-foreground">{segment.descricao}</p>
                )}

                <div className="flex flex-wrap gap-2">
                  {segment.filtros.tier && segment.filtros.tier.length > 0 && (
                    <Badge variant="outline">Tier {segment.filtros.tier.join(", ")}</Badge>
                  )}
                  {segment.filtros.categoria && segment.filtros.categoria.length > 0 && (
                    <Badge variant="outline">{segment.filtros.categoria.join(", ")}</Badge>
                  )}
                  {segment.filtros.cidade && segment.filtros.cidade.length > 0 && (
                    <Badge variant="outline">{segment.filtros.cidade.length} cidades</Badge>
                  )}
                </div>
              </div>
            </Card>
          ))}

          {segments?.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              Nenhum segmento criado ainda. Crie seu primeiro segmento!
            </div>
          )}
        </div>
      )}
    </div>
  );
}
