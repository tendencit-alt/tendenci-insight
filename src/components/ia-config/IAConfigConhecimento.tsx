import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { DateBrInput } from "@/components/ui/date-br-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Loader2, Plus, Pencil, Trash2, BookOpen, Search, FileText, Download, X, Upload,
  HelpCircle, Shield, Map, Book, Library, Play, MessageSquare, Briefcase, GitBranch, Wrench,
  Video, Link, Calendar, User, AlertTriangle, CheckCircle
} from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

interface ArquivoItem {
  url: string;
  nome: string;
  tipo: string;
  tamanho?: number;
}

interface VideoItem {
  type: "upload" | "url";
  url: string;
  nome?: string;
}

interface Conhecimento {
  id: string;
  titulo: string;
  conteudo: string;
  categoria: string | null;
  palavras_chave: string[];
  prioridade: number;
  ativo: boolean;
  tipo: string | null;
  arquivo_url: string | null;
  tipo_arquivo: string | null;
  arquivos: ArquivoItem[];
  videos: VideoItem[];
  fonte: string | null;
  autor: string | null;
  validade: string | null;
  contexto_uso: string | null;
  aplicacao: string[];
  nivel_autoridade: string | null;
  grau_certeza: string | null;
}

const NIVEIS_AUTORIDADE = [
  { value: "definitivo", label: "⚡ Definitivo", desc: "Informação oficial e inquestionável" },
  { value: "orientacao", label: "📋 Orientação", desc: "Diretriz a ser seguida normalmente" },
  { value: "sugestao", label: "💡 Sugestão", desc: "Recomendação flexível" },
];

const GRAUS_CERTEZA = [
  { value: "absoluto", label: "🎯 Absoluto", desc: "100% certo, não há exceções" },
  { value: "alto", label: "✅ Alto", desc: "Muito confiável, raras exceções" },
  { value: "medio", label: "⚠️ Médio", desc: "Confiável, mas pode variar" },
  { value: "baixo", label: "❓ Baixo", desc: "Pode estar desatualizado ou variar" },
];

const TIPOS_CONHECIMENTO = [
  { value: "faq", label: "FAQ", icon: HelpCircle, color: "text-blue-500" },
  { value: "politica", label: "Política", icon: Shield, color: "text-orange-500" },
  { value: "guia", label: "Guia", icon: Map, color: "text-green-500" },
  { value: "documento", label: "Documento", icon: FileText, color: "text-gray-500" },
  { value: "catalogo", label: "Catálogo", icon: BookOpen, color: "text-purple-500" },
  { value: "manual", label: "Manual", icon: Book, color: "text-amber-500" },
  { value: "livro", label: "Livro", icon: Library, color: "text-indigo-500" },
  { value: "video_aula", label: "Vídeo-Aula", icon: Play, color: "text-red-500" },
  { value: "script", label: "Script", icon: MessageSquare, color: "text-cyan-500" },
  { value: "case", label: "Case", icon: Briefcase, color: "text-emerald-500" },
  { value: "processo", label: "Processo", icon: GitBranch, color: "text-pink-500" },
  { value: "tecnico", label: "Técnico", icon: Wrench, color: "text-slate-500" },
];

const APLICACOES = [
  { id: "vendas", label: "Vendas", desc: "Usar em conversas de vendas" },
  { id: "suporte", label: "Suporte", desc: "Usar em atendimento de suporte" },
  { id: "onboarding", label: "Onboarding", desc: "Usar para novos clientes" },
  { id: "objecoes", label: "Objeções", desc: "Usar para contornar objeções" },
  { id: "fechamento", label: "Fechamento", desc: "Usar para fechar vendas" },
  { id: "pos_venda", label: "Pós-Venda", desc: "Usar após a venda" },
  { id: "qualificacao", label: "Qualificação", desc: "Usar para qualificar leads" },
  { id: "geral", label: "Geral", desc: "Usar em qualquer contexto" },
];

const parseArquivos = (arquivos: Json | null): ArquivoItem[] => {
  if (!arquivos || !Array.isArray(arquivos)) return [];
  return arquivos
    .filter(a => typeof a === 'object' && a !== null && 'url' in a && typeof (a as Record<string, unknown>).url === 'string')
    .map(a => a as unknown as ArquivoItem);
};

const parseVideos = (videos: Json | null): VideoItem[] => {
  if (!videos || !Array.isArray(videos)) return [];
  return videos
    .filter(v => typeof v === 'object' && v !== null && 'url' in v && typeof (v as Record<string, unknown>).url === 'string')
    .map(v => v as unknown as VideoItem);
};

export default function IAConfigConhecimento() {
  const [conhecimentos, setConhecimentos] = useState<Conhecimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Conhecimento | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTipo, setFilterTipo] = useState<string>("todos");
  const [filterAplicacao, setFilterAplicacao] = useState<string>("todos");
  const [videoUrlInput, setVideoUrlInput] = useState("");
  const [form, setForm] = useState({
    titulo: "",
    conteudo: "",
    categoria: "",
    palavras_chave: "",
    prioridade: 3,
    ativo: true,
    tipo: "faq",
    arquivos: [] as ArquivoItem[],
    videos: [] as VideoItem[],
    fonte: "",
    autor: "",
    validade: "",
    contexto_uso: "",
    aplicacao: ["geral"] as string[],
    nivel_autoridade: "orientacao",
    grau_certeza: "alto",
  });

  useEffect(() => {
    loadConhecimentos();
  }, []);

  const loadConhecimentos = async () => {
    try {
      const { data, error } = await supabase
        .from("tendenci_ia_conhecimento")
        .select("*")
        .order("prioridade", { ascending: false });

      if (error) throw error;
      
      // Transform data to handle legacy arquivo_url and new arrays
      const transformed = (data || []).map(item => {
        let arquivos = parseArquivos(item.arquivos);
        let videos = parseVideos(item.videos);
        
        // Migrate legacy arquivo_url if needed
        if (item.arquivo_url && arquivos.length === 0) {
          arquivos = [{
            url: item.arquivo_url,
            nome: item.arquivo_url.split('/').pop() || 'arquivo',
            tipo: item.tipo_arquivo || 'unknown'
          }];
        }
        
        return {
          ...item,
          arquivos,
          videos,
          aplicacao: Array.isArray(item.aplicacao) ? item.aplicacao : [],
        } as Conhecimento;
      });
      
      setConhecimentos(transformed);
    } catch (error) {
      console.error("Erro ao carregar:", error);
      toast.error("Erro ao carregar base de conhecimento");
    } finally {
      setLoading(false);
    }
  };

  const openNewDialog = () => {
    setEditingItem(null);
    setForm({
      titulo: "",
      conteudo: "",
      categoria: "",
      palavras_chave: "",
      prioridade: 3,
      ativo: true,
      tipo: "faq",
      arquivos: [],
      videos: [],
      fonte: "",
      autor: "",
      validade: "",
      contexto_uso: "",
      aplicacao: ["geral"],
      nivel_autoridade: "orientacao",
      grau_certeza: "alto",
    });
    setVideoUrlInput("");
    setDialogOpen(true);
  };

  const openEditDialog = (item: Conhecimento) => {
    setEditingItem(item);
    setForm({
      titulo: item.titulo,
      conteudo: item.conteudo,
      categoria: item.categoria || "",
      palavras_chave: item.palavras_chave?.join(", ") || "",
      prioridade: item.prioridade || 3,
      ativo: item.ativo,
      tipo: item.tipo || "faq",
      arquivos: item.arquivos || [],
      videos: item.videos || [],
      fonte: item.fonte || "",
      autor: item.autor || "",
      validade: item.validade || "",
      contexto_uso: item.contexto_uso || "",
      aplicacao: item.aplicacao || ["geral"],
      nivel_autoridade: item.nivel_autoridade || "orientacao",
      grau_certeza: item.grau_certeza || "alto",
    });
    setVideoUrlInput("");
    setDialogOpen(true);
  };

  const uploadFile = async (file: File) => {
    try {
      setUploading(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `conhecimento/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("ia-assets")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("ia-assets").getPublicUrl(filePath);
      
      const newArquivo: ArquivoItem = {
        url: data.publicUrl,
        nome: file.name,
        tipo: file.type || fileExt || "unknown",
        tamanho: file.size,
      };
      
      setForm(prev => ({ 
        ...prev, 
        arquivos: [...prev.arquivos, newArquivo]
      }));

      toast.success("Arquivo enviado!");
    } catch (error) {
      console.error("Erro no upload:", error);
      toast.error("Erro ao enviar arquivo");
    } finally {
      setUploading(false);
    }
  };

  const uploadVideo = async (file: File) => {
    try {
      setUploadingVideo(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `conhecimento/videos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("ia-assets")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("ia-assets").getPublicUrl(filePath);
      
      const newVideo: VideoItem = {
        type: "upload",
        url: data.publicUrl,
        nome: file.name.replace(/\.[^/.]+$/, ""),
      };
      
      setForm(prev => ({ 
        ...prev, 
        videos: [...prev.videos, newVideo]
      }));

      toast.success("Vídeo enviado!");
    } catch (error) {
      console.error("Erro no upload:", error);
      toast.error("Erro ao enviar vídeo");
    } finally {
      setUploadingVideo(false);
    }
  };

  const addVideoUrl = () => {
    if (!videoUrlInput.trim()) return;
    
    const newVideo: VideoItem = {
      type: "url",
      url: videoUrlInput.trim(),
      nome: "Vídeo externo",
    };
    
    setForm(prev => ({
      ...prev,
      videos: [...prev.videos, newVideo]
    }));
    setVideoUrlInput("");
    toast.success("URL de vídeo adicionada!");
  };

  const removeArquivo = (index: number) => {
    setForm(prev => ({
      ...prev,
      arquivos: prev.arquivos.filter((_, i) => i !== index)
    }));
  };

  const removeVideo = (index: number) => {
    setForm(prev => ({
      ...prev,
      videos: prev.videos.filter((_, i) => i !== index)
    }));
  };

  const toggleAplicacao = (aplicacaoId: string) => {
    setForm(prev => {
      const current = prev.aplicacao || [];
      if (current.includes(aplicacaoId)) {
        return { ...prev, aplicacao: current.filter(a => a !== aplicacaoId) };
      }
      return { ...prev, aplicacao: [...current, aplicacaoId] };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const itemData = {
        titulo: form.titulo,
        conteudo: form.conteudo,
        categoria: form.categoria || null,
        palavras_chave: form.palavras_chave.split(",").map(k => k.trim()).filter(k => k),
        prioridade: form.prioridade,
        ativo: form.ativo,
        tipo: form.tipo || null,
        arquivos: form.arquivos as unknown as Json,
        videos: form.videos as unknown as Json,
        fonte: form.fonte || null,
        autor: form.autor || null,
        validade: form.validade || null,
        contexto_uso: form.contexto_uso || null,
        aplicacao: form.aplicacao,
        nivel_autoridade: form.nivel_autoridade || null,
        grau_certeza: form.grau_certeza || null,
      };

      if (editingItem) {
        const { error } = await supabase
          .from("tendenci_ia_conhecimento")
          .update(itemData)
          .eq("id", editingItem.id);

        if (error) throw error;
        toast.success("Conhecimento atualizado!");
      } else {
        const { error } = await supabase
          .from("tendenci_ia_conhecimento")
          .insert([itemData]);

        if (error) throw error;
        toast.success("Conhecimento criado!");
      }

      setDialogOpen(false);
      loadConhecimentos();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir?")) return;

    try {
      const { error } = await supabase
        .from("tendenci_ia_conhecimento")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Conhecimento excluído!");
      loadConhecimentos();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast.error("Erro ao excluir");
    }
  };

  const toggleAtivo = async (item: Conhecimento) => {
    try {
      const { error } = await supabase
        .from("tendenci_ia_conhecimento")
        .update({ ativo: !item.ativo })
        .eq("id", item.id);

      if (error) throw error;
      loadConhecimentos();
    } catch (error) {
      console.error("Erro ao atualizar:", error);
      toast.error("Erro ao atualizar status");
    }
  };

  const filteredItems = conhecimentos.filter(item => {
    const matchesSearch = 
      item.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.conteudo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.categoria?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tipo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.palavras_chave?.some(k => k.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesTipo = filterTipo === "todos" || item.tipo === filterTipo;
    const matchesAplicacao = filterAplicacao === "todos" || item.aplicacao?.includes(filterAplicacao);
    
    return matchesSearch && matchesTipo && matchesAplicacao;
  });

  const getTipoIcon = (tipo: string | null) => {
    const tipoInfo = TIPOS_CONHECIMENTO.find(t => t.value === tipo);
    if (!tipoInfo) return <FileText className="h-4 w-4" />;
    const Icon = tipoInfo.icon;
    return <Icon className={`h-4 w-4 ${tipoInfo.color}`} />;
  };

  const getFileIcon = (tipoArquivo: string) => {
    if (tipoArquivo.includes("pdf")) return <FileText className="h-4 w-4 text-red-500" />;
    if (tipoArquivo.includes("image")) return <FileText className="h-4 w-4 text-blue-500" />;
    if (tipoArquivo.includes("video")) return <Video className="h-4 w-4 text-purple-500" />;
    if (tipoArquivo.includes("word") || tipoArquivo.includes("doc")) return <FileText className="h-4 w-4 text-blue-600" />;
    if (tipoArquivo.includes("excel") || tipoArquivo.includes("xls")) return <FileText className="h-4 w-4 text-green-600" />;
    return <FileText className="h-4 w-4" />;
  };

  // Calculate KPIs
  const totalAtivos = conhecimentos.filter(c => c.ativo).length;
  const totalInativos = conhecimentos.filter(c => !c.ativo).length;
  const comArquivos = conhecimentos.filter(c => c.arquivos.length > 0).length;
  const comVideos = conhecimentos.filter(c => c.videos.length > 0).length;
  const expirados = conhecimentos.filter(c => c.validade && new Date(c.validade) < new Date()).length;
  
  const tiposCounts = TIPOS_CONHECIMENTO.map(t => ({
    ...t,
    count: conhecimentos.filter(c => c.tipo === t.value).length
  })).filter(t => t.count > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalAtivos}</p>
                <p className="text-xs text-muted-foreground">Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <FileText className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{comArquivos}</p>
                <p className="text-xs text-muted-foreground">Com Arquivos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Video className="h-4 w-4 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{comVideos}</p>
                <p className="text-xs text-muted-foreground">Com Vídeos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-500/10">
                <BookOpen className="h-4 w-4 text-gray-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalInativos}</p>
                <p className="text-xs text-muted-foreground">Inativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        {expirados > 0 && (
          <Card className="border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{expirados}</p>
                  <p className="text-xs text-muted-foreground">Expirados</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Types summary */}
      {tiposCounts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tiposCounts.map(t => {
            const Icon = t.icon;
            return (
              <Badge 
                key={t.value} 
                variant="outline" 
                className="cursor-pointer hover:bg-muted"
                onClick={() => setFilterTipo(filterTipo === t.value ? "todos" : t.value)}
              >
                <Icon className={`h-3 w-3 mr-1 ${t.color}`} />
                {t.label}: {t.count}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex flex-1 gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar na base de conhecimento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {TIPOS_CONHECIMENTO.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterAplicacao} onValueChange={setFilterAplicacao}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Aplicação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas aplicações</SelectItem>
              {APLICACOES.map(a => (
                <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Conhecimento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "Editar Conhecimento" : "Novo Conhecimento"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  📌 INFORMAÇÕES BÁSICAS
                </h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="titulo">Título / Pergunta *</Label>
                    <Input
                      id="titulo"
                      value={form.titulo}
                      onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                      placeholder="Ex: Qual o prazo de entrega?"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tipo">Tipo</Label>
                    <Select
                      value={form.tipo}
                      onValueChange={(v) => setForm({ ...form, tipo: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPOS_CONHECIMENTO.map((tipo) => {
                          const Icon = tipo.icon;
                          return (
                            <SelectItem key={tipo.value} value={tipo.value}>
                              <div className="flex items-center gap-2">
                                <Icon className={`h-4 w-4 ${tipo.color}`} />
                                {tipo.label}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="conteudo">Conteúdo / Resposta *</Label>
                  <Textarea
                    id="conteudo"
                    value={form.conteudo}
                    onChange={(e) => setForm({ ...form, conteudo: e.target.value })}
                    placeholder="Resposta completa que a IA deve usar..."
                    rows={6}
                    required
                  />
                </div>

                {/* Authority levels */}
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Nível de Autoridade</Label>
                    <Select
                      value={form.nivel_autoridade}
                      onValueChange={(v) => setForm({ ...form, nivel_autoridade: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {NIVEIS_AUTORIDADE.map((n) => (
                          <SelectItem key={n.value} value={n.value}>
                            <div className="flex flex-col">
                              <span>{n.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {NIVEIS_AUTORIDADE.find(n => n.value === form.nivel_autoridade)?.desc}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Grau de Certeza</Label>
                    <Select
                      value={form.grau_certeza}
                      onValueChange={(v) => setForm({ ...form, grau_certeza: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {GRAUS_CERTEZA.map((g) => (
                          <SelectItem key={g.value} value={g.value}>
                            <div className="flex flex-col">
                              <span>{g.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {GRAUS_CERTEZA.find(g => g.value === form.grau_certeza)?.desc}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Prioridade de Uso (1-5)</Label>
                    <Select
                      value={String(form.prioridade)}
                      onValueChange={(v) => setForm({ ...form, prioridade: Number(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 - Mais alta (usar primeiro)</SelectItem>
                        <SelectItem value="2">2 - Alta</SelectItem>
                        <SelectItem value="3">3 - Normal</SelectItem>
                        <SelectItem value="4">4 - Baixa</SelectItem>
                        <SelectItem value="5">5 - Mais baixa (usar por último)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Materials */}
              <div className="space-y-4 border-t pt-4">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  📂 MATERIAIS DE APOIO
                </h4>
                
                {/* Documents */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Documentos e Arquivos
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {form.arquivos.map((arq, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 border rounded-lg bg-muted/50">
                        {getFileIcon(arq.tipo)}
                        <span className="text-sm truncate max-w-[150px]">{arq.nome}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => window.open(arq.url, "_blank")}
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => removeArquivo(i)}
                        >
                          <X className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.ppt,.pptx"
                        disabled={uploading}
                        className="max-w-[200px]"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadFile(file);
                        }}
                      />
                      {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">PDFs, Word, Excel, imagens, PowerPoint (máx 20MB cada)</p>
                </div>

                {/* Videos */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    Vídeos
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {form.videos.map((vid, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 border rounded-lg bg-muted/50">
                        {vid.type === "upload" ? (
                          <Upload className="h-4 w-4 text-purple-500" />
                        ) : (
                          <Link className="h-4 w-4 text-blue-500" />
                        )}
                        <span className="text-sm truncate max-w-[150px]">{vid.nome || "Vídeo"}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => window.open(vid.url, "_blank")}
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => removeVideo(i)}
                        >
                          <X className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="video/*"
                        disabled={uploadingVideo}
                        className="max-w-[200px]"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadVideo(file);
                        }}
                      />
                      {uploadingVideo && <Loader2 className="h-4 w-4 animate-spin" />}
                    </div>
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        placeholder="URL do vídeo (YouTube, Vimeo...)"
                        value={videoUrlInput}
                        onChange={(e) => setVideoUrlInput(e.target.value)}
                        className="flex-1"
                      />
                      <Button type="button" variant="outline" size="sm" onClick={addVideoUrl}>
                        <Link className="h-4 w-4 mr-1" />
                        Adicionar
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">MP4, MOV, WebM (máx 50MB) ou URLs do YouTube/Vimeo</p>
                </div>
              </div>

              {/* Application */}
              <div className="space-y-4 border-t pt-4">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  🎯 APLICAÇÃO
                </h4>
                <div className="space-y-2">
                  <Label>Quando usar este conhecimento?</Label>
                  <div className="flex flex-wrap gap-2">
                    {APLICACOES.map(aplicacao => (
                      <Button
                        key={aplicacao.id}
                        type="button"
                        variant={form.aplicacao.includes(aplicacao.id) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleAplicacao(aplicacao.id)}
                      >
                        {aplicacao.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contexto_uso">Contexto de Uso (opcional)</Label>
                  <Textarea
                    id="contexto_uso"
                    value={form.contexto_uso}
                    onChange={(e) => setForm({ ...form, contexto_uso: e.target.value })}
                    placeholder="Ex: Usar quando cliente perguntar sobre prazos ou reclamar de demora..."
                    rows={2}
                  />
                </div>
              </div>

              {/* Metadata */}
              <div className="space-y-4 border-t pt-4">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  📋 METADADOS
                </h4>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="categoria">Categoria</Label>
                    <Input
                      id="categoria"
                      value={form.categoria}
                      onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                      placeholder="Ex: Entrega, Pagamento"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fonte">Fonte</Label>
                    <Input
                      id="fonte"
                      value={form.fonte}
                      onChange={(e) => setForm({ ...form, fonte: e.target.value })}
                      placeholder="Ex: Manual interno"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="autor">Autor</Label>
                    <Input
                      id="autor"
                      value={form.autor}
                      onChange={(e) => setForm({ ...form, autor: e.target.value })}
                      placeholder="Ex: João Silva"
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="prioridade">Prioridade (maior = mais importante)</Label>
                    <Input
                      id="prioridade"
                      type="number"
                      value={form.prioridade}
                      onChange={(e) => setForm({ ...form, prioridade: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="validade">Válido até</Label>
                    <DateBrInput
                      id="validade"
                      value={form.validade}
                      onChange={(iso) => setForm({ ...form, validade: iso })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="palavras_chave">Palavras-chave (separadas por vírgula)</Label>
                  <Input
                    id="palavras_chave"
                    value={form.palavras_chave}
                    onChange={(e) => setForm({ ...form, palavras_chave: e.target.value })}
                    placeholder="prazo, entrega, tempo, demora"
                  />
                  <p className="text-xs text-muted-foreground">Ajudam a IA encontrar este conhecimento</p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.ativo}
                    onCheckedChange={(v) => setForm({ ...form, ativo: v })}
                  />
                  <Label>Conhecimento ativo</Label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Salvar Conhecimento
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {conhecimentos.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nenhum conhecimento cadastrado ainda</p>
          <p className="text-sm text-muted-foreground mt-1">Quanto mais informação de qualidade, mais inteligente seu agente.</p>
          <Button onClick={openNewDialog} variant="outline" className="mt-4">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Primeiro Conhecimento
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredItems.map((item) => (
            <div 
              key={item.id} 
              className={`p-4 border rounded-lg hover:bg-muted/50 transition-colors ${!item.ativo ? 'opacity-60' : ''} ${item.validade && new Date(item.validade) < new Date() ? 'border-red-200' : ''}`}
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {getTipoIcon(item.tipo)}
                    <h4 className="font-medium">{item.titulo}</h4>
                    {item.tipo && (
                      <Badge variant="outline" className="text-xs">
                        {TIPOS_CONHECIMENTO.find(t => t.value === item.tipo)?.label || item.tipo}
                      </Badge>
                    )}
                    {item.categoria && (
                      <Badge variant="secondary" className="text-xs">{item.categoria}</Badge>
                    )}
                    {item.aplicacao && item.aplicacao.length > 0 && (
                      <div className="flex gap-1">
                        {item.aplicacao.slice(0, 2).map(a => (
                          <Badge key={a} variant="outline" className="text-xs bg-primary/5">
                            {APLICACOES.find(ap => ap.id === a)?.label || a}
                          </Badge>
                        ))}
                        {item.aplicacao.length > 2 && (
                          <Badge variant="outline" className="text-xs">+{item.aplicacao.length - 2}</Badge>
                        )}
                      </div>
                    )}
                    {!item.ativo && (
                      <Badge variant="secondary">Inativo</Badge>
                    )}
                    {item.validade && new Date(item.validade) < new Date() && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Expirado
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{item.conteudo}</p>
                  
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                    {item.arquivos.length > 0 && (
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {item.arquivos.length} arquivo{item.arquivos.length > 1 ? 's' : ''}
                      </span>
                    )}
                    {item.videos.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Video className="h-3 w-3" />
                        {item.videos.length} vídeo{item.videos.length > 1 ? 's' : ''}
                      </span>
                    )}
                    {item.autor && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {item.autor}
                      </span>
                    )}
                    {item.validade && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Válido até {new Date(item.validade).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                  
                  {item.palavras_chave && item.palavras_chave.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {item.palavras_chave.map((k, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 bg-primary/10 rounded-full">
                          {k}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-1 items-center">
                  <Switch
                    checked={item.ativo}
                    onCheckedChange={() => toggleAtivo(item)}
                  />
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteItem(item.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {filteredItems.length === 0 && (searchTerm || filterTipo !== "todos" || filterAplicacao !== "todos") && (
            <p className="text-center text-muted-foreground py-8">
              Nenhum resultado encontrado com os filtros aplicados
            </p>
          )}
        </div>
      )}
    </div>
  );
}
