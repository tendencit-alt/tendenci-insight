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
import { Loader2, Plus, Pencil, Trash2, Package, X, Image, Video, Link, Upload, Play, Filter, Warehouse, MapPin, Ruler, Search, LinkIcon, ExternalLink, FileSpreadsheet, Check, Eye, Users, Copy } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import type { Json } from "@/integrations/supabase/types";
import { FichaTecnicaSheet } from "./FichaTecnicaSheet";
import { TemplateFichaSelector } from "@/components/shared/TemplateFichaSelector";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { usePermissions } from "@/hooks/usePermissions";

interface Categoria {
  id: string;
  name: string;
}

interface Subcategoria {
  id: string;
  name: string;
}

const CENTROS_CUSTO = [
  { value: 'moveis_planejados', label: 'Móveis Planejados' },
  { value: 'producao_tendenci', label: 'Produção Tendenci' },
  { value: 'revenda', label: 'Revenda' },
];

const UNIDADES_MEDIDA = [
  { value: 'cm', label: 'cm' },
  { value: 'm', label: 'm' },
  { value: 'mm', label: 'mm' },
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

interface InventoryProduct {
  id: string;
  name: string;
  code: string | null;
  current_stock: number;
  location_id: string | null;
  location_name?: string;
}

interface FichaTecnica {
  id: string;
  status: string;
}

interface TemplateFichaInfo {
  id: string;
  name: string;
}

interface Produto {
  id: string;
  nome: string;
  descricao: string | null;
  preco_base: number;
  categoria: string | null;
  sub_categoria: string | null;
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
  largura: number | null;
  comprimento: number | null;
  altura: number | null;
  unidade_medida: string | null;
  inventory_product_id: string | null;
  inventory_location_id: string | null;
  local_estoque_id: string | null;
  fichaTecnica: FichaTecnica | null;
  template_ficha_id: string | null;
  templateFicha: TemplateFichaInfo | null;
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

// Helper para validar formato de medida (apenas números e ponto)
const isValidMeasure = (value: string): boolean => {
  if (!value) return true;
  return /^\d*\.?\d*$/.test(value);
};

// Helper para formatar medida (remove caracteres inválidos)
const formatMeasure = (value: string): string => {
  // Remove tudo exceto números e ponto
  let formatted = value.replace(/[^\d.]/g, '');
  // Permite apenas um ponto
  const parts = formatted.split('.');
  if (parts.length > 2) {
    formatted = parts[0] + '.' + parts.slice(1).join('');
  }
  return formatted;
};

export default function IAConfigProdutos() {
  const { hasModuleAccess, isMaster } = usePermissions();
  const canDelete = isMaster || hasModuleAccess('ia_configuracao', 'delete');
  const canCreate = isMaster || hasModuleAccess('ia_configuracao', 'create');
  const canEdit = isMaster || hasModuleAccess('ia_configuracao', 'edit');
  
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [subcategorias, setSubcategorias] = useState<Subcategoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);
  const [videoUrlInput, setVideoUrlInput] = useState("");
  const [showVideoUrlInput, setShowVideoUrlInput] = useState(false);
  const [existingFicha, setExistingFicha] = useState<{ id: string } | null>(null);
  const [gerarFichaTecnica, setGerarFichaTecnica] = useState(false);
  const [fichaTecnicaMode, setFichaTecnicaMode] = useState<"criar" | "vincular">("criar");
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("todas");
  const [subcategoriaFiltro, setSubcategoriaFiltro] = useState<string>("todas");
  const [showNewCategoriaDialog, setShowNewCategoriaDialog] = useState(false);
  const [showNewSubcategoriaDialog, setShowNewSubcategoriaDialog] = useState(false);
  const [novaCategoria, setNovaCategoria] = useState("");
  const [novaSubcategoria, setNovaSubcategoria] = useState("");
  const [savingCategoria, setSavingCategoria] = useState(false);
  const [savingSubcategoria, setSavingSubcategoria] = useState(false);
  
  // Ficha Técnica Sheet
  const [fichaTecnicaSheetOpen, setFichaTecnicaSheetOpen] = useState(false);
  const [selectedFichaTecnicaId, setSelectedFichaTecnicaId] = useState<string | null>(null);
  const [selectedFichaTecnicaProductName, setSelectedFichaTecnicaProductName] = useState('');
  const [selectedFichaTecnicaStatus, setSelectedFichaTecnicaStatus] = useState('rascunho');
  
  // Inventário
  const [inventoryProducts, setInventoryProducts] = useState<InventoryProduct[]>([]);
  const [selectedInventoryProduct, setSelectedInventoryProduct] = useState<InventoryProduct | null>(null);
  const [inventorySearchOpen, setInventorySearchOpen] = useState(false);
  
  const [form, setForm] = useState({
    nome: "",
    codigo_interno: "",
    descricao: "",
    preco_base: 0,
    preco_original: null as number | null,
    categoria: "",
    sub_categoria: "",
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
    estoque: 0,
    inventory_product_id: null as string | null,
    inventory_location_id: null as string | null,
    local_estoque_id: null as string | null,
    // Medidas como string para validação de formato
    comprimento: "",
    largura: "",
    altura: "",
    unidade_medida: "cm",
    template_ficha_id: null as string | null,
  });

  // Filtrar produtos por categoria e subcategoria
  const produtosFiltrados = useMemo(() => {
    let filtered = produtos;
    if (categoriaFiltro !== "todas") {
      filtered = filtered.filter(p => p.categoria === categoriaFiltro);
    }
    if (subcategoriaFiltro !== "todas") {
      filtered = filtered.filter(p => p.sub_categoria === subcategoriaFiltro);
    }
    return filtered;
  }, [produtos, categoriaFiltro, subcategoriaFiltro]);

  // Contadores por categoria
  const contadorPorCategoria = useMemo(() => {
    const contador: Record<string, number> = {};
    produtos.forEach(p => {
      const cat = p.categoria || "Sem categoria";
      contador[cat] = (contador[cat] || 0) + 1;
    });
    return contador;
  }, [produtos]);

  // Contadores por subcategoria
  const contadorPorSubcategoria = useMemo(() => {
    const contador: Record<string, number> = {};
    produtos.forEach(p => {
      const subcat = p.sub_categoria || "Sem subcategoria";
      contador[subcat] = (contador[subcat] || 0) + 1;
    });
    return contador;
  }, [produtos]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Carregar locais, produtos, categorias, subcategorias, produtos do inventário e fichas técnicas em paralelo
      const [locationsRes, produtosRes, categoriasRes, subcategoriasRes, inventoryRes, fichasRes] = await Promise.all([
        supabase.from("stock_locations").select("*").eq("active", true).order("name"),
        supabase.from("tendenci_ia_produtos").select("*").order("nome"),
        supabase.from("product_categories").select("id, name").eq("active", true).order("name"),
        supabase.from("product_subcategories").select("id, name").eq("active", true).order("name"),
        supabase.from("products").select("id, name, code, current_stock, location_id").eq("active", true).order("name"),
        supabase.from("production_products").select("id, ia_produto_id, status").not("ia_produto_id", "is", null)
      ]);

      if (locationsRes.error) throw locationsRes.error;
      if (produtosRes.error) throw produtosRes.error;

      setLocations(locationsRes.data || []);
      setCategorias(categoriasRes.data || []);
      setSubcategorias(subcategoriasRes.data || []);
      
      // Mapear fichas técnicas por produto
      const fichasMap = new Map<string, FichaTecnica>();
      (fichasRes.data || []).forEach((f: any) => {
        fichasMap.set(f.ia_produto_id, { id: f.id, status: f.status });
      });
      
      // Mapear produtos do inventário com nome do local
      const invProducts: InventoryProduct[] = (inventoryRes.data || []).map(p => ({
        ...p,
        location_name: locationsRes.data?.find(l => l.id === p.location_id)?.name
      }));
      setInventoryProducts(invProducts);

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
          sub_categoria: p.sub_categoria ?? null,
          estoques: estoquesFormatados,
          estoqueTotal,
          largura: p.largura ?? null,
          comprimento: p.comprimento ?? null,
          altura: p.altura ?? null,
          unidade_medida: p.unidade_medida ?? 'cm',
          inventory_product_id: p.inventory_product_id ?? null,
          inventory_location_id: p.inventory_location_id ?? null,
          local_estoque_id: p.local_estoque_id ?? null,
          fichaTecnica: fichasMap.get(p.id) || null,
          template_ficha_id: p.template_ficha_id ?? null,
          templateFicha: null, // Será carregado se necessário
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
    setSelectedInventoryProduct(null);
    setExistingFicha(null);
    setGerarFichaTecnica(false);
    
    setForm({
      nome: "",
      codigo_interno: "",
      descricao: "",
      preco_base: 0,
      preco_original: null,
      categoria: categoriaFiltro !== "todas" ? categoriaFiltro : "",
      sub_categoria: subcategoriaFiltro !== "todas" ? subcategoriaFiltro : "",
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
      estoque: 0,
      inventory_product_id: null,
      inventory_location_id: null,
      local_estoque_id: null,
      comprimento: "",
      largura: "",
      altura: "",
      unidade_medida: "cm",
      template_ficha_id: null,
    });
    setVideoUrlInput("");
    setShowVideoUrlInput(false);
    setDialogOpen(true);
  };

  const openEditDialog = async (produto: Produto) => {
    setEditingProduto(produto);
    setGerarFichaTecnica(false);
    
    // Verificar se já existe ficha técnica para este produto
    const { data: ficha } = await supabase
      .from("production_products")
      .select("id")
      .eq("ia_produto_id", produto.id)
      .maybeSingle();
    
    setExistingFicha(ficha);
    
    // Migrate legacy video_url to videos array if needed
    let videosArray: VideoItem[] = Array.isArray(produto.videos) ? [...produto.videos] : [];
    if (produto.video_url && !videosArray.find(v => v.url === produto.video_url)) {
      videosArray.push({
        type: "url",
        url: produto.video_url,
        nome: "Vídeo principal (legado)"
      });
    }

    // Selecionar produto do inventário vinculado
    const invProduct = inventoryProducts.find(p => p.id === produto.inventory_product_id);
    setSelectedInventoryProduct(invProduct || null);
    
    setForm({
      nome: produto.nome,
      codigo_interno: (produto as any).codigo_interno || "",
      descricao: produto.descricao || "",
      preco_base: produto.preco_base,
      preco_original: (produto as any).preco_original ?? null,
      categoria: produto.categoria || "",
      sub_categoria: produto.sub_categoria || "",
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
      estoque: produto.estoque || 0,
      inventory_product_id: produto.inventory_product_id,
      inventory_location_id: produto.inventory_location_id,
      local_estoque_id: produto.local_estoque_id,
      // Converter números para string para o input
      comprimento: produto.comprimento?.toString() || "",
      largura: produto.largura?.toString() || "",
      altura: produto.altura?.toString() || "",
      unidade_medida: produto.unidade_medida || "cm",
      template_ficha_id: produto.template_ficha_id,
    });
    setVideoUrlInput("");
    setShowVideoUrlInput(false);
    setDialogOpen(true);
  };

  const selectInventoryProduct = (invProduct: InventoryProduct) => {
    setSelectedInventoryProduct(invProduct);
    setForm(prev => ({
      ...prev,
      inventory_product_id: invProduct.id,
      inventory_location_id: invProduct.location_id,
    }));
    setInventorySearchOpen(false);
  };

  const clearInventoryProduct = () => {
    setSelectedInventoryProduct(null);
    setForm(prev => ({
      ...prev,
      inventory_product_id: null,
      inventory_location_id: null,
    }));
  };

  const createCategoria = async () => {
    if (!novaCategoria.trim()) {
      toast.error("Informe o nome da categoria");
      return;
    }
    
    setSavingCategoria(true);
    try {
      const { data, error } = await supabase
        .from("product_categories")
        .insert({ name: novaCategoria.trim(), active: true })
        .select()
        .single();
      
      if (error) throw error;
      
      setCategorias(prev => [...prev, { id: data.id, name: data.name }]);
      setForm(prev => ({ ...prev, categoria: data.name }));
      setNovaCategoria("");
      setShowNewCategoriaDialog(false);
      toast.success("Categoria criada!");
    } catch (error) {
      console.error("Erro ao criar categoria:", error);
      toast.error("Erro ao criar categoria");
    } finally {
      setSavingCategoria(false);
    }
  };

  const createSubcategoria = async () => {
    if (!novaSubcategoria.trim()) {
      toast.error("Informe o nome da subcategoria");
      return;
    }
    
    setSavingSubcategoria(true);
    try {
      const { data, error } = await supabase
        .from("product_subcategories")
        .insert({ name: novaSubcategoria.trim(), active: true })
        .select()
        .single();
      
      if (error) throw error;
      
      setSubcategorias(prev => [...prev, { id: data.id, name: data.name }]);
      setForm(prev => ({ ...prev, sub_categoria: data.name }));
      setNovaSubcategoria("");
      setShowNewSubcategoriaDialog(false);
      toast.success("Subcategoria criada!");
    } catch (error) {
      console.error("Erro ao criar subcategoria:", error);
      toast.error("Erro ao criar subcategoria");
    } finally {
      setSavingSubcategoria(false);
    }
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

  // Handler para inputs de medida (bloqueia vírgula e caracteres inválidos)
  const handleMeasureChange = (field: 'comprimento' | 'largura' | 'altura', value: string) => {
    const formatted = formatMeasure(value);
    setForm(prev => ({ ...prev, [field]: formatted }));
  };

  const handleMeasureKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Bloquear vírgula
    if (e.key === ',') {
      e.preventDefault();
      toast.error("Use ponto (.) para decimais, não vírgula");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    console.log("=== Salvando produto ===");
    console.log("Editando:", editingProduto?.id);
    console.log("Form data:", form);

    try {
      // Converter medidas de string para número
      const comprimentoNum = form.comprimento ? parseFloat(form.comprimento) : null;
      const larguraNum = form.largura ? parseFloat(form.largura) : null;
      const alturaNum = form.altura ? parseFloat(form.altura) : null;

      const produtoData = {
        nome: form.nome,
        codigo_interno: form.codigo_interno || null,
        descricao: form.descricao || null,
        preco_base: form.preco_base,
        preco_original: form.preco_original || null,
        categoria: form.categoria || null,
        sub_categoria: form.sub_categoria || null,
        centro_custo: form.centro_custo || null,
        diferenciais: form.diferenciais.split("\n").filter(d => d.trim()),
        quando_oferecer: form.quando_oferecer || null,
        ativo: form.ativo,
        imagem_url: form.imagem_url || null,
        galeria: form.galeria,
        video_url: form.video_url || null,
        videos: JSON.parse(JSON.stringify(form.videos)) as Json,
        estoque: form.estoque,
        permite_venda_sem_estoque: form.permite_venda_sem_estoque,
        prazo_entrega_dias: form.permite_venda_sem_estoque ? form.prazo_entrega_dias : null,
        comprimento: comprimentoNum,
        largura: larguraNum,
        altura: alturaNum,
        unidade_medida: form.unidade_medida || 'cm',
        inventory_product_id: form.inventory_product_id || null,
        inventory_location_id: form.inventory_location_id || null,
        local_estoque_id: form.local_estoque_id || null,
        template_ficha_id: form.template_ficha_id || null,
      };

      console.log("Dados para salvar:", produtoData);

      if (editingProduto) {
        console.log("Atualizando produto ID:", editingProduto.id);
        const { data, error } = await supabase
          .from("tendenci_ia_produtos")
          .update(produtoData)
          .eq("id", editingProduto.id)
          .select();

        console.log("Resposta update:", { data, error });

        if (error) throw error;
        toast.success("Produto atualizado!");
      } else {
        console.log("Criando novo produto");
        const { data, error } = await supabase
          .from("tendenci_ia_produtos")
          .insert([produtoData])
          .select();

        console.log("Resposta insert:", { data, error });

        if (error) throw error;
        
        // Criar ficha técnica se solicitado (apenas para novo produto)
        if (gerarFichaTecnica && data && data[0]) {
          const { error: fichaError } = await supabase
            .from("production_products")
            .insert({
              name: form.nome,
              description: form.descricao || null,
              ia_produto_id: data[0].id,
              production_order_id: null,
              product_id: null,
              status: 'rascunho',
              cmv_total: form.preco_base
            });
          
          if (fichaError) {
            console.error("Erro ao criar ficha técnica:", fichaError);
            toast.error("Produto criado, mas erro ao criar ficha técnica");
          } else {
            toast.success("Produto e ficha técnica criados!");
          }
        } else {
          toast.success("Produto criado!");
        }
      }

      // Criar ficha técnica se solicitado (para produto existente)
      if (editingProduto && gerarFichaTecnica && !existingFicha) {
        const { error: fichaError } = await supabase
          .from("production_products")
          .insert({
            name: form.nome,
            description: form.descricao || null,
            ia_produto_id: editingProduto.id,
            production_order_id: null,
            product_id: null,
            status: 'rascunho',
            cmv_total: form.preco_base
          });
        
        if (fichaError) {
          console.error("Erro ao criar ficha técnica:", fichaError);
          toast.error("Erro ao criar ficha técnica");
        } else {
          toast.success("Ficha técnica criada!");
        }
      }

      setDialogOpen(false);
      await loadData();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar produto");
    } finally {
      setSaving(false);
    }
  };

  const deleteProduto = async (id: string) => {
    if (!canDelete) {
      toast.error("Você não tem permissão para excluir produtos");
      return;
    }
    
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;

    try {
      const { error } = await supabase
        .from("tendenci_ia_produtos")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Erro ao excluir:", error);
        if (error.code === '42501' || error.message?.includes('policy')) {
          toast.error("Sem permissão para excluir. Verifique suas permissões com o administrador.");
        } else {
          toast.error("Erro ao excluir produto: " + (error.message || "Erro desconhecido"));
        }
        return;
      }
      toast.success("Produto excluído!");
      loadData();
    } catch (error: any) {
      console.error("Erro ao excluir:", error);
      toast.error("Erro ao excluir produto: " + (error?.message || "Erro desconhecido"));
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

  // Helper para obter nome do local
  const getLocationName = (localId: string | null) => {
    if (!localId) return null;
    return locations.find(l => l.id === localId)?.name || null;
  };

  // Criar ficha técnica diretamente da tabela e abrir o Sheet
  const criarFichaTecnicaDireto = async (produto: Produto) => {
    try {
      const { data, error } = await supabase
        .from("production_products")
        .insert({
          name: produto.nome,
          description: produto.descricao || null,
          ia_produto_id: produto.id,
          production_order_id: null,
          product_id: null,
          status: 'rascunho',
          cmv_total: produto.preco_base
        })
        .select()
        .single();
      
      if (error) throw error;
      
      toast.success("Ficha técnica criada!");
      
      // Abrir o Sheet automaticamente após criar
      setSelectedFichaTecnicaId(data.id);
      setSelectedFichaTecnicaProductName(produto.nome);
      setSelectedFichaTecnicaStatus('rascunho');
      setFichaTecnicaSheetOpen(true);
      
      loadData();
    } catch (error) {
      console.error("Erro ao criar ficha técnica:", error);
      toast.error("Erro ao criar ficha técnica");
    }
  };

  // Abrir ficha técnica existente no Sheet
  const abrirFichaTecnica = (produto: Produto) => {
    if (produto.fichaTecnica) {
      setSelectedFichaTecnicaId(produto.fichaTecnica.id);
      setSelectedFichaTecnicaProductName(produto.nome);
      setSelectedFichaTecnicaStatus(produto.fichaTecnica.status);
      setFichaTecnicaSheetOpen(true);
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
            <Select value={categoriaFiltro} onValueChange={(v) => { setCategoriaFiltro(v); setSubcategoriaFiltro("todas"); }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">
                  Todas as categorias ({produtos.length})
                </SelectItem>
                {categorias.map(cat => (
                  <SelectItem key={cat.id} value={cat.name}>
                    {cat.name} ({contadorPorCategoria[cat.name] || 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Select value={subcategoriaFiltro} onValueChange={setSubcategoriaFiltro}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Subcategoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">
                  Todas subcategorias
                </SelectItem>
                {subcategorias.map(subcat => (
                  <SelectItem key={subcat.id} value={subcat.name}>
                    {subcat.name} ({contadorPorSubcategoria[subcat.name] || 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(categoriaFiltro !== "todas" || subcategoriaFiltro !== "todas") && (
            <div className="flex items-center gap-1">
              {categoriaFiltro !== "todas" && (
                <Badge variant="secondary" className="gap-1">
                  {categoriaFiltro}
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-destructive" 
                    onClick={() => setCategoriaFiltro("todas")}
                  />
                </Badge>
              )}
              {subcategoriaFiltro !== "todas" && (
                <Badge variant="outline" className="gap-1">
                  {subcategoriaFiltro}
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-destructive" 
                    onClick={() => setSubcategoriaFiltro("todas")}
                  />
                </Badge>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => window.open('/catalogo', '_blank')}
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Ver Catálogo
          </Button>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            {canCreate && (
              <DialogTrigger asChild>
                <Button onClick={openNewDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Produto
                </Button>
              </DialogTrigger>
            )}
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
                  <Label htmlFor="codigo_interno" className="flex items-center gap-2">
                    ID Interno
                    <span className="text-xs text-muted-foreground">(código do produto)</span>
                  </Label>
                  <Input
                    id="codigo_interno"
                    value={form.codigo_interno}
                    onChange={(e) => setForm({ ...form, codigo_interno: e.target.value })}
                    placeholder="Ex: MESA-001, SOF-123"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="categoria">Categoria *</Label>
                  <div className="flex gap-2">
                    <Select 
                      value={form.categoria} 
                      onValueChange={(v) => setForm({ ...form, categoria: v })}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Selecione a categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {categorias.map(cat => (
                          <SelectItem key={cat.id} value={cat.name}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon"
                      onClick={() => setShowNewCategoriaDialog(true)}
                      title="Criar nova categoria"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sub_categoria">Subcategoria</Label>
                  <div className="flex gap-2">
                    <Select 
                      value={form.sub_categoria || "_none"} 
                      onValueChange={(v) => setForm({ ...form, sub_categoria: v === "_none" ? "" : v })}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Selecione a subcategoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Nenhuma</SelectItem>
                        {subcategorias.map(subcat => (
                          <SelectItem key={subcat.id} value={subcat.name}>
                            {subcat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon"
                      onClick={() => setShowNewSubcategoriaDialog(true)}
                      title="Criar nova subcategoria"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preco_original" className="flex items-center gap-2">
                    <span className="line-through text-muted-foreground">DE:</span> Preço Original (R$)
                    <span className="text-xs text-muted-foreground">(opcional)</span>
                  </Label>
                  <Input
                    id="preco_original"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.preco_original || ""}
                    onChange={(e) => setForm({ ...form, preco_original: e.target.value ? parseFloat(e.target.value) : null })}
                    placeholder="Ex: 5000.00"
                    className="bg-muted/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preco_base" className="flex items-center gap-2">
                    <span className="text-primary font-bold">POR:</span> Preço Atual (R$)
                  </Label>
                  <Input
                    id="preco_base"
                    type="number"
                    step="0.01"
                    value={form.preco_base}
                    onChange={(e) => setForm({ ...form, preco_base: parseFloat(e.target.value) || 0 })}
                    className="border-primary"
                  />
                  {form.preco_original && form.preco_original > form.preco_base && (
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="destructive" className="bg-red-500">
                        {Math.round(((form.preco_original - form.preco_base) / form.preco_original) * 100)}% OFF
                      </Badge>
                      <span className="text-muted-foreground">
                        Economia de R$ {(form.preco_original - form.preco_base).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
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

              {/* Estoque - Campos Simples */}
              <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Estoque
                  </h4>
                  {form.estoque > 0 && (
                    <Badge variant="secondary">
                      {form.estoque} un
                    </Badge>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="estoque-qty">Quantidade em Estoque</Label>
                    <Input
                      id="estoque-qty"
                      type="number"
                      min="0"
                      step="1"
                      value={form.estoque}
                      onChange={(e) => setForm({ ...form, estoque: parseInt(e.target.value) || 0 })}
                      placeholder="Ex: 5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="estoque-local">Local de Armazenamento</Label>
                    <Select
                      value={form.local_estoque_id || "_none"}
                      onValueChange={(v) => setForm({ ...form, local_estoque_id: v === "_none" ? null : v })}
                    >
                      <SelectTrigger id="estoque-local">
                        <SelectValue placeholder="Selecione o local" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Nenhum</SelectItem>
                        {locations.map(loc => (
                          <SelectItem key={loc.id} value={loc.id}>
                            <span className="flex items-center gap-2">
                              <MapPin className="h-3 w-3" />
                              {loc.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Opção de venda sem estoque */}
                <div className="border-t pt-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={form.permite_venda_sem_estoque}
                      onCheckedChange={(v) => setForm({ ...form, permite_venda_sem_estoque: v })}
                    />
                    <Label>Permitir venda sob encomenda</Label>
                  </div>
                  
                  {form.permite_venda_sem_estoque && (
                    <div className="space-y-2">
                      <Label>Prazo de entrega (dias)</Label>
                      <Input
                        type="number"
                        min="1"
                        value={form.prazo_entrega_dias ?? ""}
                        onChange={(e) => setForm({ ...form, prazo_entrega_dias: e.target.value ? parseInt(e.target.value) : null })}
                        placeholder="Ex: 15"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Dimensões do Produto - Ordem: C x L x A */}
              <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                <h4 className="font-medium flex items-center gap-2">
                  <Ruler className="h-4 w-4" />
                  Dimensões (C × L × A)
                </h4>
                <div className="grid gap-4 sm:grid-cols-4">
                  <div className="space-y-2">
                    <Label>Comprimento (C)</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="Ex: 3.00"
                      value={form.comprimento}
                      onChange={(e) => handleMeasureChange('comprimento', e.target.value)}
                      onKeyDown={handleMeasureKeyDown}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Largura (L)</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="Ex: 2.00"
                      value={form.largura}
                      onChange={(e) => handleMeasureChange('largura', e.target.value)}
                      onKeyDown={handleMeasureKeyDown}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Altura (A)</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="Ex: 0.75"
                      value={form.altura}
                      onChange={(e) => handleMeasureChange('altura', e.target.value)}
                      onKeyDown={handleMeasureKeyDown}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unidade</Label>
                    <Select
                      value={form.unidade_medida || "cm"}
                      onValueChange={(v) => setForm({ ...form, unidade_medida: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNIDADES_MEDIDA.map(u => (
                          <SelectItem key={u.value} value={u.value}>
                            {u.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  💡 Use ponto (.) para decimais. Ex: 3.00 × 2.00 × 0.75
                </p>
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

              {/* Vinculação ao Inventário (Opcional) */}
              <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                <h4 className="font-medium flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" />
                  Vinculação ao Inventário (Opcional)
                </h4>
                <p className="text-xs text-muted-foreground">
                  Vincule a um produto do módulo de inventário para controle integrado
                </p>
                
                {selectedInventoryProduct ? (
                  <div className="p-3 rounded-lg border bg-background">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{selectedInventoryProduct.name}</p>
                        {selectedInventoryProduct.code && (
                          <p className="text-sm text-muted-foreground">
                            Código: {selectedInventoryProduct.code}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="flex items-center gap-1">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            Estoque inv.: <strong>{selectedInventoryProduct.current_stock}</strong> un
                          </span>
                          {selectedInventoryProduct.location_name && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              {selectedInventoryProduct.location_name}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={clearInventoryProduct}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Popover open={inventorySearchOpen} onOpenChange={setInventorySearchOpen}>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" className="w-full justify-start">
                        <Search className="h-4 w-4 mr-2" />
                        Vincular produto do inventário...
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar produto..." />
                        <CommandList>
                          <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                          <CommandGroup heading="Produtos do Inventário">
                            {inventoryProducts.map(p => (
                              <CommandItem
                                key={p.id}
                                value={p.name}
                                onSelect={() => selectInventoryProduct(p)}
                              >
                                <div className="flex-1">
                                  <p className="font-medium">{p.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {p.code && `${p.code} • `}
                                    Estoque: {p.current_stock}
                                    {p.location_name && ` • ${p.location_name}`}
                                  </p>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
              </div>


              {/* Imagem Principal */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  Imagem Principal
                </Label>
                <div className="flex gap-4 items-start">
                  {form.imagem_url && (
                    <div className="relative">
                      <img
                        src={form.imagem_url}
                        alt="Preview"
                        className="h-24 w-24 object-cover rounded-lg border"
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
                  )}
                  <label className="flex flex-col items-center justify-center h-24 px-6 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadImage(file);
                      }}
                    />
                    {uploading ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <>
                        <Upload className="h-6 w-6 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground mt-1">Enviar</span>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* Galeria */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  Galeria de Imagens
                </Label>
                <div className="flex flex-wrap gap-2">
                  {form.galeria.map((url, index) => (
                    <div key={index} className="relative">
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

              {/* Ficha Técnica */}
              <div className="p-4 border-2 border-primary/30 rounded-lg bg-primary/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <FileSpreadsheet className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <Label className="font-semibold text-base">Ficha Técnica</Label>
                      <p className="text-sm text-muted-foreground">
                        {existingFicha 
                          ? "Gerencie insumos e mão de obra" 
                          : form.template_ficha_id 
                            ? "Vinculada a ficha técnica padrão"
                            : "Criar ou vincular ficha técnica"}
                      </p>
                    </div>
                  </div>
                  {existingFicha ? (
                    <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
                      <Check className="h-4 w-4 mr-1" />
                      Criada
                    </Badge>
                  ) : form.template_ficha_id ? (
                    <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
                      <LinkIcon className="h-4 w-4 mr-1" />
                      Vinculada
                    </Badge>
                  ) : (
                    <Switch
                      checked={gerarFichaTecnica}
                      onCheckedChange={(checked) => {
                        setGerarFichaTecnica(checked);
                        if (!checked) {
                          setForm({ ...form, template_ficha_id: null });
                        }
                      }}
                    />
                  )}
                </div>

                {/* Opções de ficha técnica */}
                {existingFicha ? (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDialogOpen(false);
                        setSelectedFichaTecnicaId(existingFicha.id);
                        setSelectedFichaTecnicaProductName(form.nome);
                        setSelectedFichaTecnicaStatus(editingProduto?.fichaTecnica?.status || 'rascunho');
                        setFichaTecnicaSheetOpen(true);
                      }}
                    >
                      <Package className="h-4 w-4 mr-2" />
                      Gerenciar Insumos
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDialogOpen(false);
                        setSelectedFichaTecnicaId(existingFicha.id);
                        setSelectedFichaTecnicaProductName(form.nome);
                        setSelectedFichaTecnicaStatus(editingProduto?.fichaTecnica?.status || 'rascunho');
                        setFichaTecnicaSheetOpen(true);
                      }}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      + Mão de Obra
                    </Button>
                  </div>
                ) : gerarFichaTecnica ? (
                  <div className="space-y-3">
                    <RadioGroup 
                      value={fichaTecnicaMode} 
                      onValueChange={(v) => {
                        setFichaTecnicaMode(v as "criar" | "vincular");
                        if (v === "criar") {
                          setForm({ ...form, template_ficha_id: null });
                        }
                      }}
                      className="flex flex-col gap-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="criar" id="criar" />
                        <Label htmlFor="criar" className="text-sm font-normal cursor-pointer">
                          Criar nova ficha técnica
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="vincular" id="vincular" />
                        <Label htmlFor="vincular" className="text-sm font-normal cursor-pointer">
                          Vincular ficha técnica existente
                        </Label>
                      </div>
                    </RadioGroup>

                    {fichaTecnicaMode === "criar" && editingProduto && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            const { data, error } = await supabase
                              .from("production_products")
                              .insert({
                                name: form.nome,
                                description: form.descricao || null,
                                ia_produto_id: editingProduto.id,
                                production_order_id: null,
                                product_id: null,
                                status: 'rascunho',
                                cmv_total: form.preco_base
                              })
                              .select()
                              .single();
                            
                            if (error) throw error;
                            
                            toast.success("Ficha técnica criada!");
                            setExistingFicha({ id: data.id });
                            
                            setDialogOpen(false);
                            setSelectedFichaTecnicaId(data.id);
                            setSelectedFichaTecnicaProductName(form.nome);
                            setSelectedFichaTecnicaStatus('rascunho');
                            setFichaTecnicaSheetOpen(true);
                            
                            loadData();
                          } catch (error) {
                            console.error("Erro ao criar ficha técnica:", error);
                            toast.error("Erro ao criar ficha técnica");
                          }
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Criar Ficha Técnica Agora
                      </Button>
                    )}

                    {fichaTecnicaMode === "vincular" && (
                      <TemplateFichaSelector
                        value={form.template_ficha_id}
                        onChange={(id) => setForm({ ...form, template_ficha_id: id })}
                        placeholder="Selecionar ficha técnica padrão..."
                      />
                    )}
                  </div>
                ) : null}
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
              <TableHead className="w-[100px]">ID</TableHead>
              <TableHead>Imagem</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Dimensões</TableHead>
              <TableHead>Preço Base</TableHead>
              <TableHead>Estoque</TableHead>
              <TableHead>Ficha Técnica</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {produtosFiltrados.map((produto) => (
              <TableRow key={produto.id}>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <code 
                      className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded truncate max-w-[70px]" 
                      title={produto.id}
                    >
                      {produto.id.substring(0, 8)}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        navigator.clipboard.writeText(produto.id);
                        toast.success("ID copiado!");
                      }}
                      title="Copiar ID completo"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
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
                  <div className="space-y-1">
                    {produto.categoria ? (
                      <Badge variant="outline">{produto.categoria}</Badge>
                    ) : <span className="text-muted-foreground text-sm">-</span>}
                    {produto.sub_categoria && (
                      <Badge variant="secondary" className="text-xs">
                        {produto.sub_categoria}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                {/* Dimensões na ordem C × L × A */}
                <TableCell>
                  {produto.comprimento || produto.largura || produto.altura ? (
                    <div className="text-sm text-muted-foreground">
                      {[
                        produto.comprimento,
                        produto.largura,
                        produto.altura
                      ].filter(v => v !== null && v !== undefined).join(' × ')} {produto.unidade_medida || 'cm'}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {produto.preco_base > 0 
                    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(produto.preco_base)
                    : "-"
                  }
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    {produto.estoque > 0 ? (
                      <Badge className="bg-green-500 hover:bg-green-600">
                        {produto.estoque} un
                      </Badge>
                    ) : produto.permite_venda_sem_estoque ? (
                      <Badge variant="outline" className="text-amber-600 border-amber-400">
                        Sob encomenda {produto.prazo_entrega_dias ? `(${produto.prazo_entrega_dias}d)` : ""}
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        Sem estoque
                      </Badge>
                    )}
                    {produto.inventory_product_id && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <LinkIcon className="h-3 w-3" />
                        Vinculado
                      </p>
                    )}
                  </div>
                </TableCell>
                {/* Coluna Ficha Técnica */}
                <TableCell>
                  {produto.fichaTecnica ? (
                    <div className="flex items-center gap-1">
                      <Badge 
                        variant="outline" 
                        className={
                          produto.fichaTecnica.status === 'aprovado' 
                            ? "bg-green-50 text-green-600 border-green-200" 
                            : "bg-amber-50 text-amber-600 border-amber-200"
                        }
                      >
                        <FileSpreadsheet className="h-3 w-3 mr-1" />
                        {produto.fichaTecnica.status === 'aprovado' ? 'Aprovada' : 'Rascunho'}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => abrirFichaTecnica(produto)}
                        title="Ver ficha técnica"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-primary gap-1 h-7 px-2"
                      onClick={() => criarFichaTecnicaDireto(produto)}
                    >
                      <Plus className="h-3 w-3" />
                      Criar
                    </Button>
                  )}
                </TableCell>
                <TableCell>
                  <Switch
                    checked={produto.ativo}
                    onCheckedChange={() => toggleAtivo(produto)}
                    disabled={!canEdit}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {canEdit && (
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(produto)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button variant="ghost" size="icon" onClick={() => deleteProduto(produto.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Dialog para criar nova categoria */}
      <Dialog open={showNewCategoriaDialog} onOpenChange={setShowNewCategoriaDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova Categoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nova-categoria">Nome da categoria</Label>
              <Input
                id="nova-categoria"
                placeholder="Ex: Puff, Mesa Lateral..."
                value={novaCategoria}
                onChange={(e) => setNovaCategoria(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    createCategoria();
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowNewCategoriaDialog(false);
                  setNovaCategoria("");
                }}
              >
                Cancelar
              </Button>
              <Button onClick={createCategoria} disabled={savingCategoria}>
                {savingCategoria && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Criar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para criar nova subcategoria */}
      <Dialog open={showNewSubcategoriaDialog} onOpenChange={setShowNewSubcategoriaDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova Subcategoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nova-subcategoria">Nome da subcategoria</Label>
              <Input
                id="nova-subcategoria"
                placeholder="Ex: Mesa, Cadeiras, Tapete..."
                value={novaSubcategoria}
                onChange={(e) => setNovaSubcategoria(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    createSubcategoria();
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowNewSubcategoriaDialog(false);
                  setNovaSubcategoria("");
                }}
              >
                Cancelar
              </Button>
              <Button onClick={createSubcategoria} disabled={savingSubcategoria}>
                {savingSubcategoria && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Criar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sheet da Ficha Técnica */}
      <FichaTecnicaSheet
        open={fichaTecnicaSheetOpen}
        onOpenChange={setFichaTecnicaSheetOpen}
        productionProductId={selectedFichaTecnicaId}
        productName={selectedFichaTecnicaProductName}
        initialStatus={selectedFichaTecnicaStatus}
        onClose={() => loadData()}
      />
    </div>
  );
}
