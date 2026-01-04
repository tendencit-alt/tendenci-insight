import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, Package, X, Image, Video, Link, Upload, Play, Filter, Warehouse, MapPin } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

// Categorias predefinidas
const CATEGORIAS = [
  "Sofá",
  "Cadeira",
  "Banqueta",
  "Tapete",
  "Quadros",
  "Aparador",
  "Bistrô",
  "Mesa de Centro",
  "Mesa de Canto",
  "Rack",
  "Estante",
  "Poltrona",
] as const;

const CENTROS_CUSTO = [
  { value: 'moveis_planejados', label: 'Móveis Planejados' },
  { value: 'producao_tendenci', label: 'Produção Tendenci' },
  { value: 'revenda', label: 'Revenda' },
];

interface VideoItem {
  type: "upload" | "url";
  url: string;
  nome?: string;
}

interface StockLocation {
  id: string;
  name: string;
  active: boolean;
  is_default: boolean;
}

interface EstoquePorLocal {
  location_id: string;
  location_name: string;
  quantidade: number;
}

interface Produto {
  id: string;
  nome: string;
  descricao: string | null;
  preco_base: number;
  categoria: string | null;
  centro_custo: string | null;
  diferenciais: string[];
  quando_oferecer: string | null;
  ativo: boolean;
  imagem_url: string | null;
  galeria: string[];
  video_url: string | null;
  videos: VideoItem[];
  estoque: number;
  permite_venda_sem_estoque: boolean;
  prazo_entrega_dias: number | null;
  estoques: EstoquePorLocal[];
  estoqueTotal: number;
}

// Helper to safely parse videos from JSON
const parseVideos = (videos: unknown): VideoItem[] => {
  if (!Array.isArray(videos)) return [];
  return videos.filter((v): v is VideoItem => 
    typeof v === 'object' && v !== null && 
    typeof (v as VideoItem).url === 'string' &&
    ((v as VideoItem).type === 'upload' || (v as VideoItem).type === 'url')
  );
};

export default function IAConfigProdutos() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);
  const [videoUrlInput, setVideoUrlInput] = useState("");
  const [showVideoUrlInput, setShowVideoUrlInput] = useState(false);
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("todas");
  
  const [form, setForm] = useState({
    nome: "",
    descricao: "",
    preco_base: 0,
    categoria: "",
    centro_custo: "",
    diferenciais: "",
    quando_oferecer: "",
    ativo: true,
    imagem_url: "",
    galeria: [] as string[],
    video_url: "",
    videos: [] as VideoItem[],
    permite_venda_sem_estoque: false,
    prazo_entrega_dias: null as number | null,
    estoquesPorLocal: {} as Record<string, number>,
  });

  // Filtrar produtos por categoria
  const produtosFiltrados = useMemo(() => {
    if (categoriaFiltro === "todas") return produtos;
    return produtos.filter(p => p.categoria === categoriaFiltro);
  }, [produtos, categoriaFiltro]);

  // Contadores por categoria
  const contadorPorCategoria = useMemo(() => {
    const contador: Record<string, number> = {};
    produtos.forEach(p => {
      const cat = p.categoria || "Sem categoria";
      contador[cat] = (contador[cat] || 0) + 1;
    });
    return contador;
  }, [produtos]);

  // Calcular estoque total do form
  const estoqueTotal = useMemo(() => {
    return Object.values(form.estoquesPorLocal).reduce((sum, qty) => sum + (qty || 0), 0);
  }, [form.estoquesPorLocal]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Carregar locais e produtos em paralelo
      const [locationsRes, produtosRes] = await Promise.all([
        supabase.from("stock_locations").select("*").eq("active", true).order("name"),
        supabase.from("tendenci_ia_produtos").select("*").order("nome")
      ]);

      if (locationsRes.error) throw locationsRes.error;
      if (produtosRes.error) throw produtosRes.error;

      setLocations(locationsRes.data || []);

      // Carregar estoques por produto
      const produtosComEstoque: Produto[] = [];
      
      for (const p of (produtosRes.data || [])) {
        const { data: estoques } = await supabase
          .from("tendenci_ia_produtos_estoque")
          .select(`
            quantidade,
            location_id,
            location:stock_locations(id, name)
          `)
          .eq("produto_id", p.id);

        const estoquesFormatados: EstoquePorLocal[] = (estoques || []).map((e: any) => ({
          location_id: e.location_id,
          location_name: e.location?.name || "Desconhecido",
          quantidade: e.quantidade || 0
        }));

        const estoqueTotal = estoquesFormatados.reduce((sum, e) => sum + e.quantidade, 0);

        produtosComEstoque.push({
          ...p,
          videos: parseVideos(p.videos),
          estoque: p.estoque ?? 0,
          permite_venda_sem_estoque: p.permite_venda_sem_estoque ?? false,
          prazo_entrega_dias: p.prazo_entrega_dias ?? null,
          centro_custo: p.centro_custo ?? null,
          estoques: estoquesFormatados,
          estoqueTotal
        });
      }
      
      setProdutos(produtosComEstoque);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const openNewDialog = () => {
    setEditingProduto(null);
    
    // Inicializar estoques por local com 0
    const estoquesPorLocal: Record<string, number> = {};
    locations.forEach(loc => {
      estoquesPorLocal[loc.id] = 0;
    });
    
    setForm({
      nome: "",
      descricao: "",
      preco_base: 0,
      categoria: categoriaFiltro !== "todas" ? categoriaFiltro : "",
      centro_custo: "",
      diferenciais: "",
      quando_oferecer: "",
      ativo: true,
      imagem_url: "",
      galeria: [],
      video_url: "",
      videos: [],
      permite_venda_sem_estoque: false,
      prazo_entrega_dias: null,
      estoquesPorLocal,
    });
    setVideoUrlInput("");
    setShowVideoUrlInput(false);
    setDialogOpen(true);
  };

  const openEditDialog = (produto: Produto) => {
    setEditingProduto(produto);
    
    // Migrate legacy video_url to videos array if needed
    let videosArray: VideoItem[] = Array.isArray(produto.videos) ? [...produto.videos] : [];
    if (produto.video_url && !videosArray.find(v => v.url === produto.video_url)) {
      videosArray.push({
        type: "url",
        url: produto.video_url,
        nome: "Vídeo principal (legado)"
      });
    }

    // Carregar estoques por local
    const estoquesPorLocal: Record<string, number> = {};
    locations.forEach(loc => {
      const estoque = produto.estoques.find(e => e.location_id === loc.id);
      estoquesPorLocal[loc.id] = estoque?.quantidade || 0;
    });
    
    setForm({
      nome: produto.nome,
      descricao: produto.descricao || "",
      preco_base: produto.preco_base,
      categoria: produto.categoria || "",
      centro_custo: produto.centro_custo || "",
      diferenciais: produto.diferenciais?.join("\n") || "",
      quando_oferecer: produto.quando_oferecer || "",
      ativo: produto.ativo,
      imagem_url: produto.imagem_url || "",
      galeria: produto.galeria || [],
      video_url: produto.video_url || "",
      videos: videosArray,
      permite_venda_sem_estoque: produto.permite_venda_sem_estoque ?? false,
      prazo_entrega_dias: produto.prazo_entrega_dias ?? null,
      estoquesPorLocal,
    });
    setVideoUrlInput("");
    setShowVideoUrlInput(false);
    setDialogOpen(true);
  };

  const updateEstoqueLocal = (locationId: string, quantidade: number) => {
    setForm(prev => ({
      ...prev,
      estoquesPorLocal: {
        ...prev.estoquesPorLocal,
        [locationId]: Math.max(0, quantidade || 0)
      }
    }));
  };

  const uploadImage = async (file: File, isGallery = false) => {
    try {
      setUploading(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `produtos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("ia-assets")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("ia-assets").getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      if (isGallery) {
        setForm(prev => ({ ...prev, galeria: [...prev.galeria, publicUrl] }));
      } else {
        setForm(prev => ({ ...prev, imagem_url: publicUrl }));
      }

      toast.success("Imagem enviada!");
    } catch (error) {
      console.error("Erro no upload:", error);
      toast.error("Erro ao enviar imagem");
    } finally {
      setUploading(false);
    }
  };

  const uploadVideo = async (file: File) => {
    try {
      setUploadingVideo(true);
      
      // Validate size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        toast.error("Vídeo deve ter no máximo 50MB");
        return;
      }
      
      // Validate type
      if (!file.type.startsWith("video/")) {
        toast.error("Arquivo deve ser um vídeo");
        return;
      }
      
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `produtos/videos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("ia-assets")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("ia-assets").getPublicUrl(filePath);
      
      setForm(prev => ({
        ...prev,
        videos: [...prev.videos, {
          type: "upload" as const,
          url: data.publicUrl,
          nome: file.name
        }]
      }));

      toast.success("Vídeo enviado!");
    } catch (error) {
      console.error("Erro no upload de vídeo:", error);
      toast.error("Erro ao enviar vídeo");
    } finally {
      setUploadingVideo(false);
    }
  };

  const addVideoUrl = () => {
    if (!videoUrlInput.trim()) {
      toast.error("Informe a URL do vídeo");
      return;
    }
    
    // Basic URL validation
    try {
      new URL(videoUrlInput);
    } catch {
      toast.error("URL inválida");
      return;
    }
    
    setForm(prev => ({
      ...prev,
      videos: [...prev.videos, {
        type: "url" as const,
        url: videoUrlInput.trim(),
        nome: getVideoName(videoUrlInput)
      }]
    }));
    
    setVideoUrlInput("");
    setShowVideoUrlInput(false);
    toast.success("Vídeo adicionado!");
  };

  const getVideoName = (url: string): string => {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes("youtube")) return "YouTube";
      if (urlObj.hostname.includes("vimeo")) return "Vimeo";
      if (urlObj.hostname.includes("tiktok")) return "TikTok";
      if (urlObj.hostname.includes("instagram")) return "Instagram";
      return urlObj.hostname;
    } catch {
      return "Vídeo externo";
    }
  };

  const removeVideo = (index: number) => {
    setForm(prev => ({
      ...prev,
      videos: prev.videos.filter((_, i) => i !== index)
    }));
  };

  const removeGalleryImage = (index: number) => {
    setForm(prev => ({
      ...prev,
      galeria: prev.galeria.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const produtoData = {
        nome: form.nome,
        descricao: form.descricao || null,
        preco_base: form.preco_base,
        categoria: form.categoria || null,
        centro_custo: form.centro_custo || null,
        diferenciais: form.diferenciais.split("\n").filter(d => d.trim()),
        quando_oferecer: form.quando_oferecer || null,
        ativo: form.ativo,
        imagem_url: form.imagem_url || null,
        galeria: form.galeria,
        video_url: form.video_url || null,
        videos: JSON.parse(JSON.stringify(form.videos)) as Json,
        estoque: estoqueTotal, // Atualizar estoque total para compatibilidade
        permite_venda_sem_estoque: form.permite_venda_sem_estoque,
        prazo_entrega_dias: form.permite_venda_sem_estoque ? form.prazo_entrega_dias : null,
      };

      let produtoId: string;

      if (editingProduto) {
        const { error } = await supabase
          .from("tendenci_ia_produtos")
          .update(produtoData)
          .eq("id", editingProduto.id);

        if (error) throw error;
        produtoId = editingProduto.id;
      } else {
        const { data, error } = await supabase
          .from("tendenci_ia_produtos")
          .insert([produtoData])
          .select("id")
          .single();

        if (error) throw error;
        produtoId = data.id;
      }

      // Salvar estoques por local
      for (const [locationId, quantidade] of Object.entries(form.estoquesPorLocal)) {
        if (quantidade > 0) {
          const { error: estoqueError } = await supabase
            .from("tendenci_ia_produtos_estoque")
            .upsert({
              produto_id: produtoId,
              location_id: locationId,
              quantidade: quantidade
            }, {
              onConflict: 'produto_id,location_id'
            });

          if (estoqueError) {
            console.error("Erro ao salvar estoque:", estoqueError);
          }
        } else {
          // Remover estoque zerado
          await supabase
            .from("tendenci_ia_produtos_estoque")
            .delete()
            .eq("produto_id", produtoId)
            .eq("location_id", locationId);
        }
      }

      toast.success(editingProduto ? "Produto atualizado!" : "Produto criado!");
      setDialogOpen(false);
      loadData();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar produto");
    } finally {
      setSaving(false);
    }
  };

  const deleteProduto = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;

    try {
      const { error } = await supabase
        .from("tendenci_ia_produtos")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Produto excluído!");
      loadData();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast.error("Erro ao excluir produto");
    }
  };

  const toggleAtivo = async (produto: Produto) => {
    try {
      const { error } = await supabase
        .from("tendenci_ia_produtos")
        .update({ ativo: !produto.ativo })
        .eq("id", produto.id);

      if (error) throw error;
      loadData();
    } catch (error) {
      console.error("Erro ao atualizar:", error);
      toast.error("Erro ao atualizar status");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header com filtro */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">
                  Todas as categorias ({produtos.length})
                </SelectItem>
                {CATEGORIAS.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {cat} ({contadorPorCategoria[cat] || 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {categoriaFiltro !== "todas" && (
            <Badge variant="secondary" className="gap-1">
              {categoriaFiltro}
              <X 
                className="h-3 w-3 cursor-pointer hover:text-destructive" 
                onClick={() => setCategoriaFiltro("todas")}
              />
            </Badge>
          )}
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Produto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProduto ? "Editar Produto" : "Novo Produto"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome do Produto *</Label>
                  <Input
                    id="nome"
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="categoria">Categoria *</Label>
                  <Select 
                    value={form.categoria} 
                    onValueChange={(v) => setForm({ ...form, categoria: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS.map(cat => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preco_base">Preço Base (R$)</Label>
                  <Input
                    id="preco_base"
                    type="number"
                    step="0.01"
                    value={form.preco_base}
                    onChange={(e) => setForm({ ...form, preco_base: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Centro de Custo</Label>
                  <Select
                    value={form.centro_custo || "_none"}
                    onValueChange={(v) => setForm({ ...form, centro_custo: v === "_none" ? "" : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o centro de custo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Nenhum</SelectItem>
                      {CENTROS_CUSTO.map(cc => (
                        <SelectItem key={cc.value} value={cc.value}>
                          {cc.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={form.ativo}
                  onCheckedChange={(v) => setForm({ ...form, ativo: v })}
                />
                <Label>Produto ativo</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  placeholder="Descrição completa do produto..."
                  rows={3}
                />
              </div>

              {/* Controle de Estoque por Local */}
              <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium flex items-center gap-2">
                    <Warehouse className="h-4 w-4" />
                    Estoque por Local
                  </h4>
                  <Badge variant="outline" className="font-semibold">
                    Total: {estoqueTotal} un
                  </Badge>
                </div>
                
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {locations.map(loc => (
                    <div key={loc.id} className="flex items-center gap-2 p-2 rounded-lg bg-background border">
                      <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm font-medium flex-1 truncate" title={loc.name}>
                        {loc.name}
                      </span>
                      <Input
                        type="number"
                        min="0"
                        className="w-20 h-8 text-center"
                        value={form.estoquesPorLocal[loc.id] || 0}
                        onChange={(e) => updateEstoqueLocal(loc.id, parseInt(e.target.value))}
                      />
                    </div>
                  ))}
                </div>

                {/* Opção de venda sem estoque */}
                <div className="flex flex-col sm:flex-row gap-4 pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={form.permite_venda_sem_estoque}
                      onCheckedChange={(v) => setForm({ ...form, permite_venda_sem_estoque: v })}
                    />
                    <span className="text-sm">Permitir venda sem estoque (sob encomenda)</span>
                  </div>
                  
                  {form.permite_venda_sem_estoque && (
                    <div className="flex items-center gap-2">
                      <Label htmlFor="prazo_entrega" className="text-sm whitespace-nowrap">Prazo:</Label>
                      <Input
                        id="prazo_entrega"
                        type="number"
                        min="1"
                        className="w-20 h-8"
                        value={form.prazo_entrega_dias ?? ""}
                        onChange={(e) => setForm({ ...form, prazo_entrega_dias: parseInt(e.target.value) || null })}
                        placeholder="dias"
                      />
                      <span className="text-sm text-muted-foreground">dias</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Imagem Principal */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  Imagem Principal
                </Label>
                {form.imagem_url ? (
                  <div className="relative inline-block">
                    <img
                      src={form.imagem_url}
                      alt="Imagem do produto"
                      className="h-32 w-32 object-cover rounded-lg border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={() => setForm({ ...form, imagem_url: "" })}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      disabled={uploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadImage(file, false);
                      }}
                      className="max-w-xs"
                    />
                    {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                  </div>
                )}
              </div>

              {/* Galeria */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  Galeria de Imagens
                </Label>
                <div className="flex flex-wrap gap-2">
                  {form.galeria.map((url, index) => (
                    <div key={index} className="relative inline-block">
                      <img
                        src={url}
                        alt={`Galeria ${index + 1}`}
                        className="h-20 w-20 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-5 w-5"
                        onClick={() => removeGalleryImage(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <label className="flex items-center justify-center h-20 w-20 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadImage(file, true);
                      }}
                    />
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-6 w-6 text-muted-foreground" />
                    )}
                  </label>
                </div>
              </div>

              {/* Vídeos */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Video className="h-4 w-4" />
                  Vídeos do Produto
                </Label>
                
                {/* Lista de vídeos */}
                <div className="flex flex-wrap gap-2">
                  {form.videos.map((video, index) => (
                    <div key={index} className="relative group">
                      <div className="flex items-center gap-2 p-2 pr-8 border rounded-lg bg-muted/30 min-w-[150px]">
                        <div className="h-10 w-10 bg-primary/10 rounded flex items-center justify-center flex-shrink-0">
                          <Play className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{video.nome || `Vídeo ${index + 1}`}</p>
                          <Badge variant="secondary" className="text-xs">
                            {video.type === "upload" ? "Upload" : "URL"}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-5 w-5"
                        onClick={() => removeVideo(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                
                {/* Botões de adicionar vídeo */}
                <div className="flex flex-wrap gap-2">
                  {/* Upload de vídeo */}
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      disabled={uploadingVideo}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadVideo(file);
                      }}
                    />
                    <div className="flex items-center gap-2 px-3 py-2 border-2 border-dashed rounded-lg hover:bg-muted/50 transition-colors">
                      {uploadingVideo ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      <span className="text-sm">Enviar Vídeo</span>
                    </div>
                  </label>
                  
                  {/* Adicionar URL */}
                  {!showVideoUrlInput ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowVideoUrlInput(true)}
                    >
                      <Link className="h-4 w-4 mr-2" />
                      Adicionar URL
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2 flex-1 min-w-[250px]">
                      <Input
                        placeholder="https://youtube.com/watch?v=..."
                        value={videoUrlInput}
                        onChange={(e) => setVideoUrlInput(e.target.value)}
                        className="flex-1"
                      />
                      <Button type="button" size="sm" onClick={addVideoUrl}>
                        Adicionar
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setShowVideoUrlInput(false);
                          setVideoUrlInput("");
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                
                <p className="text-xs text-muted-foreground">
                  💡 Formatos aceitos: MP4, MOV, WebM (máx 50MB) ou URLs do YouTube, Vimeo, etc.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="diferenciais">Diferenciais (um por linha)</Label>
                <Textarea
                  id="diferenciais"
                  value={form.diferenciais}
                  onChange={(e) => setForm({ ...form, diferenciais: e.target.value })}
                  placeholder="Qualidade premium&#10;Garantia de 5 anos&#10;Instalação inclusa"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quando_oferecer">Quando Oferecer</Label>
                <Textarea
                  id="quando_oferecer"
                  value={form.quando_oferecer}
                  onChange={(e) => setForm({ ...form, quando_oferecer: e.target.value })}
                  placeholder="Em que situações a IA deve sugerir este produto?"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Salvar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {produtos.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nenhum produto cadastrado ainda</p>
          <Button onClick={openNewDialog} variant="outline" className="mt-4">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Primeiro Produto
          </Button>
        </div>
      ) : produtosFiltrados.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <Filter className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nenhum produto na categoria "{categoriaFiltro}"</p>
          <Button onClick={openNewDialog} variant="outline" className="mt-4">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Produto em {categoriaFiltro}
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Imagem</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Centro de Custo</TableHead>
              <TableHead>Preço Base</TableHead>
              <TableHead>Estoque</TableHead>
              <TableHead>Mídia</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {produtosFiltrados.map((produto) => (
              <TableRow key={produto.id}>
                <TableCell>
                  {produto.imagem_url ? (
                    <img
                      src={produto.imagem_url}
                      alt={produto.nome}
                      className="h-10 w-10 object-cover rounded"
                    />
                  ) : (
                    <div className="h-10 w-10 bg-muted rounded flex items-center justify-center">
                      <Image className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{produto.nome}</p>
                    {produto.descricao && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {produto.descricao}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {produto.categoria ? (
                    <Badge variant="outline">{produto.categoria}</Badge>
                  ) : "-"}
                </TableCell>
                <TableCell>
                  {produto.centro_custo ? (
                    <Badge variant="secondary">
                      {CENTROS_CUSTO.find(cc => cc.value === produto.centro_custo)?.label || produto.centro_custo}
                    </Badge>
                  ) : "-"}
                </TableCell>
                <TableCell>
                  {produto.preco_base > 0 
                    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(produto.preco_base)
                    : "-"
                  }
                </TableCell>
                <TableCell>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-left">
                        {produto.estoqueTotal > 0 ? (
                          <Badge className="bg-green-500 hover:bg-green-600 cursor-pointer">
                            {produto.estoqueTotal} un
                          </Badge>
                        ) : produto.permite_venda_sem_estoque ? (
                          <Badge variant="outline" className="text-amber-600 border-amber-400 cursor-pointer">
                            Sob encomenda {produto.prazo_entrega_dias ? `(${produto.prazo_entrega_dias}d)` : ""}
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="cursor-pointer">
                            Sem estoque
                          </Badge>
                        )}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64" align="start">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between border-b pb-2">
                          <span className="font-medium text-sm">Estoque por Local</span>
                          <Badge variant="secondary">{produto.estoqueTotal} total</Badge>
                        </div>
                        {produto.estoques.length > 0 ? (
                          <div className="space-y-1">
                            {produto.estoques.map((e, i) => (
                              <div key={i} className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-1.5 text-muted-foreground">
                                  <MapPin className="h-3 w-3" />
                                  {e.location_name}
                                </span>
                                <span className="font-medium">{e.quantidade}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-2">
                            Nenhum estoque registrado
                          </p>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {(produto.galeria?.length || 0) > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        <Image className="h-3 w-3 mr-1" />
                        {produto.galeria.length}
                      </Badge>
                    )}
                    {((produto.videos?.length || 0) > 0 || produto.video_url) && (
                      <Badge variant="secondary" className="text-xs">
                        <Video className="h-3 w-3 mr-1" />
                        {(produto.videos?.length || 0) + (produto.video_url && !(produto.videos || []).find(v => v.url === produto.video_url) ? 1 : 0)}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={produto.ativo}
                    onCheckedChange={() => toggleAtivo(produto)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(produto)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteProduto(produto.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
