import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, Package, Upload, X, Image, Video } from "lucide-react";

interface Produto {
  id: string;
  nome: string;
  descricao: string | null;
  preco_base: number;
  categoria: string | null;
  diferenciais: string[];
  quando_oferecer: string | null;
  ativo: boolean;
  imagem_url: string | null;
  galeria: string[];
  video_url: string | null;
}

export default function IAConfigProdutos() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);
  const [form, setForm] = useState({
    nome: "",
    descricao: "",
    preco_base: 0,
    categoria: "",
    diferenciais: "",
    quando_oferecer: "",
    ativo: true,
    imagem_url: "",
    galeria: [] as string[],
    video_url: "",
  });

  useEffect(() => {
    loadProdutos();
  }, []);

  const loadProdutos = async () => {
    try {
      const { data, error } = await supabase
        .from("tendenci_ia_produtos")
        .select("*")
        .order("nome");

      if (error) throw error;
      setProdutos(data || []);
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
      toast.error("Erro ao carregar produtos");
    } finally {
      setLoading(false);
    }
  };

  const openNewDialog = () => {
    setEditingProduto(null);
    setForm({
      nome: "",
      descricao: "",
      preco_base: 0,
      categoria: "",
      diferenciais: "",
      quando_oferecer: "",
      ativo: true,
      imagem_url: "",
      galeria: [],
      video_url: "",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (produto: Produto) => {
    setEditingProduto(produto);
    setForm({
      nome: produto.nome,
      descricao: produto.descricao || "",
      preco_base: produto.preco_base,
      categoria: produto.categoria || "",
      diferenciais: produto.diferenciais?.join("\n") || "",
      quando_oferecer: produto.quando_oferecer || "",
      ativo: produto.ativo,
      imagem_url: produto.imagem_url || "",
      galeria: produto.galeria || [],
      video_url: produto.video_url || "",
    });
    setDialogOpen(true);
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
        diferenciais: form.diferenciais.split("\n").filter(d => d.trim()),
        quando_oferecer: form.quando_oferecer || null,
        ativo: form.ativo,
        imagem_url: form.imagem_url || null,
        galeria: form.galeria,
        video_url: form.video_url || null,
      };

      if (editingProduto) {
        const { error } = await supabase
          .from("tendenci_ia_produtos")
          .update(produtoData)
          .eq("id", editingProduto.id);

        if (error) throw error;
        toast.success("Produto atualizado!");
      } else {
        const { error } = await supabase
          .from("tendenci_ia_produtos")
          .insert([produtoData]);

        if (error) throw error;
        toast.success("Produto criado!");
      }

      setDialogOpen(false);
      loadProdutos();
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
      loadProdutos();
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
      loadProdutos();
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
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Cadastre os produtos/serviços que a IA pode oferecer aos clientes
        </p>
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
                  <Label htmlFor="categoria">Categoria</Label>
                  <Input
                    id="categoria"
                    value={form.categoria}
                    onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                    placeholder="Ex: Móveis Planejados"
                  />
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
                <div className="space-y-2 flex items-center gap-2 pt-6">
                  <Switch
                    checked={form.ativo}
                    onCheckedChange={(v) => setForm({ ...form, ativo: v })}
                  />
                  <Label>Produto ativo</Label>
                </div>
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

              {/* Vídeo */}
              <div className="space-y-2">
                <Label htmlFor="video_url" className="flex items-center gap-2">
                  <Video className="h-4 w-4" />
                  URL do Vídeo (YouTube, Vimeo, etc.)
                </Label>
                <Input
                  id="video_url"
                  value={form.video_url}
                  onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
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
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Imagem</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Preço Base</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {produtos.map((produto) => (
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
                <TableCell>{produto.categoria || "-"}</TableCell>
                <TableCell>
                  {produto.preco_base > 0 
                    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(produto.preco_base)
                    : "-"
                  }
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
