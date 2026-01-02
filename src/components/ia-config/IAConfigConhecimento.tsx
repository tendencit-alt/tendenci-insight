import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, BookOpen, Search, FileText, Download, X, Upload } from "lucide-react";

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
}

const TIPOS_CONHECIMENTO = [
  { value: "faq", label: "FAQ" },
  { value: "politica", label: "Política" },
  { value: "guia", label: "Guia" },
  { value: "documento", label: "Documento" },
  { value: "catalogo", label: "Catálogo" },
  { value: "manual", label: "Manual" },
  { value: "outro", label: "Outro" },
];

export default function IAConfigConhecimento() {
  const [conhecimentos, setConhecimentos] = useState<Conhecimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Conhecimento | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [form, setForm] = useState({
    titulo: "",
    conteudo: "",
    categoria: "",
    palavras_chave: "",
    prioridade: 0,
    ativo: true,
    tipo: "faq",
    arquivo_url: "",
    tipo_arquivo: "",
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
      setConhecimentos(data || []);
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
      prioridade: 0,
      ativo: true,
      tipo: "faq",
      arquivo_url: "",
      tipo_arquivo: "",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (item: Conhecimento) => {
    setEditingItem(item);
    setForm({
      titulo: item.titulo,
      conteudo: item.conteudo,
      categoria: item.categoria || "",
      palavras_chave: item.palavras_chave?.join(", ") || "",
      prioridade: item.prioridade,
      ativo: item.ativo,
      tipo: item.tipo || "faq",
      arquivo_url: item.arquivo_url || "",
      tipo_arquivo: item.tipo_arquivo || "",
    });
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
      
      setForm(prev => ({ 
        ...prev, 
        arquivo_url: data.publicUrl,
        tipo_arquivo: file.type || fileExt || "unknown"
      }));

      toast.success("Arquivo enviado!");
    } catch (error) {
      console.error("Erro no upload:", error);
      toast.error("Erro ao enviar arquivo");
    } finally {
      setUploading(false);
    }
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
        arquivo_url: form.arquivo_url || null,
        tipo_arquivo: form.tipo_arquivo || null,
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

  const filteredItems = conhecimentos.filter(item =>
    item.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.conteudo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.categoria?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.tipo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.palavras_chave?.some(k => k.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getFileIcon = (tipoArquivo: string | null) => {
    if (!tipoArquivo) return <FileText className="h-4 w-4" />;
    if (tipoArquivo.includes("pdf")) return <FileText className="h-4 w-4 text-red-500" />;
    if (tipoArquivo.includes("image")) return <FileText className="h-4 w-4 text-blue-500" />;
    return <FileText className="h-4 w-4" />;
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
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar na base de conhecimento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Conhecimento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "Editar Conhecimento" : "Novo Conhecimento"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                      {TIPOS_CONHECIMENTO.map((tipo) => (
                        <SelectItem key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoria">Categoria</Label>
                <Input
                  id="categoria"
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  placeholder="Ex: Entrega, Pagamento, Garantia"
                />
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

              {/* Upload de Arquivo */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Arquivo Anexo (PDF, Documento, Imagem)
                </Label>
                {form.arquivo_url ? (
                  <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
                    {getFileIcon(form.tipo_arquivo)}
                    <span className="flex-1 text-sm truncate">{form.arquivo_url.split("/").pop()}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(form.arquivo_url, "_blank")}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setForm({ ...form, arquivo_url: "", tipo_arquivo: "" })}
                    >
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                      disabled={uploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadFile(file);
                      }}
                    />
                    {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                  </div>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="palavras_chave">Palavras-chave (separadas por vírgula)</Label>
                  <Input
                    id="palavras_chave"
                    value={form.palavras_chave}
                    onChange={(e) => setForm({ ...form, palavras_chave: e.target.value })}
                    placeholder="prazo, entrega, tempo, demora"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prioridade">Prioridade (maior = mais importante)</Label>
                  <Input
                    id="prioridade"
                    type="number"
                    value={form.prioridade}
                    onChange={(e) => setForm({ ...form, prioridade: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={form.ativo}
                  onCheckedChange={(v) => setForm({ ...form, ativo: v })}
                />
                <Label>Conhecimento ativo</Label>
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

      {conhecimentos.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nenhum conhecimento cadastrado ainda</p>
          <Button onClick={openNewDialog} variant="outline" className="mt-4">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Primeiro Conhecimento
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredItems.map((item) => (
            <div key={item.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{item.titulo}</h4>
                    {item.tipo && (
                      <Badge variant="outline" className="text-xs">
                        {TIPOS_CONHECIMENTO.find(t => t.value === item.tipo)?.label || item.tipo}
                      </Badge>
                    )}
                    {item.categoria && (
                      <Badge variant="secondary" className="text-xs">{item.categoria}</Badge>
                    )}
                    {item.arquivo_url && (
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                        <FileText className="h-3 w-3 mr-1" />
                        Arquivo
                      </Badge>
                    )}
                    {!item.ativo && (
                      <Badge variant="secondary">Inativo</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{item.conteudo}</p>
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
                <div className="flex gap-1">
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
          {filteredItems.length === 0 && searchTerm && (
            <p className="text-center text-muted-foreground py-8">
              Nenhum resultado encontrado para "{searchTerm}"
            </p>
          )}
        </div>
      )}
    </div>
  );
}
