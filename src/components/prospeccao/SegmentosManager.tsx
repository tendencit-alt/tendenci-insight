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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Users, Filter, UserCheck } from "lucide-react";
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
    nao_contactados?: boolean;
  };
  architect_ids?: string[];
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
      nao_contactados: false,
    },
  });
  const [selectedCidades, setSelectedCidades] = useState<string[]>([]);
  const [selectedArchitects, setSelectedArchitects] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState<"filtros" | "manual">("filtros");
  const queryClient = useQueryClient();

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

  const { data: vendedores } = useQuery({
    queryKey: ["vendedores-filter"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("role", ["admin", "vendedor"])
        .order("full_name");

      if (error) throw error;
      return data;
    },
  });

  const { data: stages } = useQuery({
    queryKey: ["prospec-stages-filter"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tendenci_prospec_arq_stages")
        .select("id, nome, slug")
        .eq("ativa", true)
        .order("position");

      if (error) throw error;
      return data;
    },
  });

  const { data: architects, isLoading: isLoadingArchitects } = useQuery({
    queryKey: ["architects-for-selection", formData.filtros],
    queryFn: async () => {
      let query = supabase
        .from("architects")
        .select("id, name, company, city, tier, phone, status_funil, data_primeiro_contato, vendedor:profiles!architects_vendedor_responsavel_fkey(full_name)")
        .eq("active", true);

      if (formData.filtros.cidade.length > 0) {
        query = query.in("city", formData.filtros.cidade);
      }
      if (formData.filtros.tier.length > 0) {
        query = query.in("tier", formData.filtros.tier);
      }
      if (formData.filtros.categoria.length > 0) {
        query = query.in("categoria", formData.filtros.categoria);
      }
      if (formData.filtros.vendedor) {
        query = query.eq("vendedor_responsavel", formData.filtros.vendedor);
      }
      if (formData.filtros.status_funil.length > 0) {
        query = query.in("status_funil", formData.filtros.status_funil);
      }
      if (formData.filtros.nao_contactados) {
        query = query.is("data_primeiro_contato", null);
      }

      const { data, error } = await query.order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: selectionMode === "manual",
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        nome: formData.nome,
        descricao: formData.descricao,
        filtros: {
          ...formData.filtros,
          cidade: selectedCidades,
        },
        architect_ids: selectionMode === "manual" ? selectedArchitects : null,
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
        nao_contactados: false,
      },
    });
    setSelectedCidades([]);
    setSelectedArchitects([]);
    setSelectionMode("filtros");
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
        nao_contactados: segment.filtros?.nao_contactados || false,
      },
    });
    setSelectedCidades(segment.filtros?.cidade || []);
    setSelectedArchitects(segment.architect_ids || []);
    setSelectionMode(segment.architect_ids && segment.architect_ids.length > 0 ? "manual" : "filtros");
    setDialogOpen(true);
  };

  const handleDelete = (id: string, nome: string) => {
    if (confirm(`Tem certeza que deseja remover o segmento "${nome}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const toggleArchitectSelection = (architectId: string) => {
    setSelectedArchitects(prev =>
      prev.includes(architectId)
        ? prev.filter(id => id !== architectId)
        : [...prev, architectId]
    );
  };

  const selectAllArchitects = () => {
    if (architects) {
      setSelectedArchitects(architects.map(a => a.id));
    }
  };

  const clearAllArchitects = () => {
    setSelectedArchitects([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Segmentos de Prospecção</h2>
          <p className="text-muted-foreground">Crie segmentos para organizar seus profissionais parceiros</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Segmento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
                  placeholder="Ex: Profissionais Parceiros Tier A de São Paulo"
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

              <Tabs value={selectionMode} onValueChange={(v) => setSelectionMode(v as "filtros" | "manual")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="filtros" className="gap-2">
                    <Filter className="h-4 w-4" />
                    Por Filtros
                  </TabsTrigger>
                  <TabsTrigger value="manual" className="gap-2">
                    <UserCheck className="h-4 w-4" />
                    Seleção Manual
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="filtros" className="space-y-4 mt-4">
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-4">Filtros do Segmento</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Tier</Label>
                        <Select
                          value={formData.filtros.tier?.[0] || "todos"}
                          onValueChange={(value) => 
                            setFormData({
                              ...formData,
                              filtros: { ...formData.filtros, tier: value === "todos" ? [] : [value] },
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Todos os tiers" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todos">Todos os tiers</SelectItem>
                            <SelectItem value="A">Tier A</SelectItem>
                            <SelectItem value="B">Tier B</SelectItem>
                            <SelectItem value="C">Tier C</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Categoria</Label>
                        <Select
                          value={formData.filtros.categoria?.[0] || "todas"}
                          onValueChange={(value) =>
                            setFormData({
                              ...formData,
                              filtros: { ...formData.filtros, categoria: value === "todas" ? [] : [value] },
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Todas as categorias" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todas">Todas as categorias</SelectItem>
                            <SelectItem value="metropolitano">Metropolitano</SelectItem>
                            <SelectItem value="regional">Regional</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Vendedor Responsável</Label>
                        <Select
                          value={formData.filtros.vendedor || "todos"}
                          onValueChange={(value) =>
                            setFormData({
                              ...formData,
                              filtros: { ...formData.filtros, vendedor: value === "todos" ? "" : value },
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Todos os vendedores" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todos">Todos os vendedores</SelectItem>
                            {vendedores?.map((v) => (
                              <SelectItem key={v.id} value={v.id}>
                                {v.full_name || v.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Status no Funil</Label>
                        <Select
                          value={formData.filtros.status_funil?.[0] || "todos"}
                          onValueChange={(value) =>
                            setFormData({
                              ...formData,
                              filtros: { ...formData.filtros, status_funil: value === "todos" ? [] : [value] },
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Todos os status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todos">Todos os status</SelectItem>
                            {stages?.map((stage) => (
                              <SelectItem key={stage.id} value={stage.slug}>
                                {stage.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2 mt-4">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="nao_contactados"
                          checked={formData.filtros.nao_contactados}
                          onCheckedChange={(checked) =>
                            setFormData({
                              ...formData,
                              filtros: { ...formData.filtros, nao_contactados: checked === true },
                            })
                          }
                        />
                        <Label htmlFor="nao_contactados" className="cursor-pointer">
                          Apenas arquitetos que nunca foram contactados
                        </Label>
                      </div>
                    </div>

                    <div className="space-y-2 mt-4">
                      <Label>Cidades</Label>
                      <div className="border rounded-md p-3 max-h-40 overflow-y-auto">
                        {cidades && cidades.length > 0 ? (
                          <div className="space-y-2">
                            {cidades.map((cidade) => (
                              <label key={cidade} className="flex items-center gap-2 cursor-pointer">
                                <Checkbox
                                  checked={selectedCidades.includes(cidade)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedCidades([...selectedCidades, cidade]);
                                    } else {
                                      setSelectedCidades(selectedCidades.filter(c => c !== cidade));
                                    }
                                  }}
                                />
                                <span className="text-sm">{cidade}</span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Nenhuma cidade disponível</p>
                        )}
                      </div>
                      {selectedCidades.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {selectedCidades.length} cidade(s) selecionada(s)
                        </p>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="manual" className="space-y-4 mt-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Selecione arquitetos individuais para este segmento
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={selectAllArchitects}
                          disabled={!architects || architects.length === 0}
                        >
                          Selecionar Todos
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={clearAllArchitects}
                          disabled={selectedArchitects.length === 0}
                        >
                          Limpar
                        </Button>
                      </div>
                    </div>

                    {selectedArchitects.length > 0 && (
                      <div className="p-3 bg-muted rounded-md">
                        <p className="text-sm font-medium">
                          {selectedArchitects.length} arquiteto(s) selecionado(s)
                        </p>
                      </div>
                    )}

                    <div className="border rounded-md max-h-96 overflow-y-auto">
                      {isLoadingArchitects ? (
                        <div className="p-8 text-center text-muted-foreground">
                          Carregando arquitetos...
                        </div>
                      ) : architects && architects.length > 0 ? (
                        <div className="divide-y">
                          {architects.map((architect) => (
                            <label
                              key={architect.id}
                              className="flex items-start gap-3 p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                            >
                              <Checkbox
                                checked={selectedArchitects.includes(architect.id)}
                                onCheckedChange={() => toggleArchitectSelection(architect.id)}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium">{architect.name}</span>
                                  {architect.tier && (
                                    <Badge variant="outline" className="text-xs">
                                      {architect.tier}
                                    </Badge>
                                  )}
                                  {!architect.data_primeiro_contato && (
                                    <Badge variant="secondary" className="text-xs">
                                      Não contactado
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                  {architect.company && <span>{architect.company}</span>}
                                  {architect.city && (
                                    <>
                                      <span>•</span>
                                      <span>{architect.city}</span>
                                    </>
                                  )}
                                  {architect.phone && (
                                    <>
                                      <span>•</span>
                                      <span>{architect.phone}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <div className="p-8 text-center text-muted-foreground">
                          <p>Nenhum profissional parceiro encontrado com os filtros aplicados.</p>
                          <p className="text-sm mt-1">Ajuste os filtros na aba "Por Filtros"</p>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                  Cancelar
                </Button>
                <Button 
                  onClick={() => saveMutation.mutate()}
                  disabled={
                    !formData.nome.trim() || 
                    saveMutation.isPending ||
                    (selectionMode === "manual" && selectedArchitects.length === 0)
                  }
                >
                  {editingSegment ? "Atualizar" : "Criar"} Segmento
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

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
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {segment.descricao && (
                  <p className="text-sm text-muted-foreground">{segment.descricao}</p>
                )}

                <div className="space-y-2">
                  {segment.architect_ids && segment.architect_ids.length > 0 ? (
                    <Badge variant="secondary">
                      {segment.architect_ids.length} arquiteto(s) selecionado(s)
                    </Badge>
                  ) : (
                    <>
                      {segment.filtros?.cidade && segment.filtros.cidade.length > 0 && (
                        <div className="text-sm">
                          <span className="font-medium">Cidades:</span>{" "}
                          {segment.filtros.cidade.slice(0, 2).join(", ")}
                          {segment.filtros.cidade.length > 2 && ` +${segment.filtros.cidade.length - 2}`}
                        </div>
                      )}
                      {segment.filtros?.tier && segment.filtros.tier.length > 0 && (
                        <div className="text-sm">
                          <span className="font-medium">Tier:</span> {segment.filtros.tier.join(", ")}
                        </div>
                      )}
                      {segment.filtros?.categoria && segment.filtros.categoria.length > 0 && (
                        <div className="text-sm">
                          <span className="font-medium">Categoria:</span> {segment.filtros.categoria.join(", ")}
                        </div>
                      )}
                      {segment.filtros?.status_funil && segment.filtros.status_funil.length > 0 && (
                        <div className="text-sm">
                          <span className="font-medium">Status:</span> {segment.filtros.status_funil.length} selecionado(s)
                        </div>
                      )}
                      {segment.filtros?.nao_contactados && (
                        <Badge variant="outline" className="text-xs">Não contactados</Badge>
                      )}
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
