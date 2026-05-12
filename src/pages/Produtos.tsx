import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleShell } from "@/components/layout/ModuleShell";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Package,
  Plus,
  Upload,
  Download,
  Search,
  Eye,
  EyeOff,
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ProductRow {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  descricao_curta: string | null;
  category_id: string | null;
  cost_price: number | null;
  sale_price: number | null;
  current_stock: number | null;
  unit: string | null;
  active: boolean | null;
  ativo_no_catalogo: boolean | null;
  prazo_producao_dias: number | null;
  item_type: string | null;
  imagens: string[] | null;
  created_at: string;
}

const fmtBRL = (n: number | null | undefined) =>
  n == null
    ? "—"
    : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

export default function Produtos() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    tipo: "all",
    status: "all",
    catalogo: "all",
    categoria: "all",
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["produtos-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, code, name, description, descricao_curta, category_id, cost_price, sale_price, current_stock, unit, active, ativo_no_catalogo, prazo_producao_dias, item_type, imagens, created_at"
        )
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data || []) as ProductRow[];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["product-categories-options"],
    queryFn: async () => {
      const { data } = await supabase
        .from("product_categories")
        .select("id, name")
        .order("name");
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    let rows = products || [];
    if (filters.tipo !== "all") rows = rows.filter((r) => r.item_type === filters.tipo);
    if (filters.status !== "all") {
      const want = filters.status === "ativo";
      rows = rows.filter((r) => !!r.active === want);
    }
    if (filters.catalogo !== "all") {
      const want = filters.catalogo === "sim";
      rows = rows.filter((r) => !!r.ativo_no_catalogo === want);
    }
    if (filters.categoria !== "all") {
      rows = rows.filter((r) => r.category_id === filters.categoria);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.name?.toLowerCase().includes(q) ||
          r.code?.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q)
      );
    }
    return rows;
  }, [products, filters, search]);

  const kpis = useMemo(() => {
    const total = products?.length || 0;
    const ativos = products?.filter((p) => p.active).length || 0;
    const noCatalogo = products?.filter((p) => p.ativo_no_catalogo).length || 0;
    const semEstoque = products?.filter((p) => (p.current_stock || 0) <= 0).length || 0;
    return { total, ativos, noCatalogo, semEstoque };
  }, [products]);

  const toggleCatalogo = async (p: ProductRow) => {
    const { error } = await supabase
      .from("products")
      .update({ ativo_no_catalogo: !p.ativo_no_catalogo })
      .eq("id", p.id);
    if (error) {
      toast.error("Erro: " + error.message);
      return;
    }
    toast.success(
      !p.ativo_no_catalogo ? "Publicado no catálogo" : "Removido do catálogo"
    );
    queryClient.invalidateQueries({ queryKey: ["produtos-list"] });
  };

  const handleExport = () => {
    if (!filtered.length) return toast.error("Nada para exportar");
    const headers = [
      "SKU",
      "Nome",
      "Tipo",
      "Categoria",
      "Custo",
      "Venda",
      "Estoque",
      "Catálogo",
      "Ativo",
    ];
    const rows = filtered.map((p) => [
      p.code || "",
      p.name,
      p.item_type || "",
      categories?.find((c) => c.id === p.category_id)?.name || "",
      p.cost_price ?? "",
      p.sale_price ?? "",
      p.current_stock ?? "",
      p.ativo_no_catalogo ? "Sim" : "Não",
      p.active ? "Sim" : "Não",
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `produtos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exportados ${filtered.length} produtos`);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      const [, ...rows] = lines;
      const parsed = rows
        .map((line) => {
          const cols = line
            .match(/("([^"]|"")*"|[^,]+)/g)
            ?.map((c) => c.replace(/^"|"$/g, "").replace(/""/g, '"').trim());
          if (!cols || !cols[1]) return null;
          return {
            code: cols[0] || null,
            name: cols[1],
            item_type: cols[2] || "produto_acabado",
            cost_price: Number(cols[4]) || 0,
            sale_price: Number(cols[5]) || 0,
          };
        })
        .filter(Boolean) as any[];
      if (!parsed.length) return toast.error("Nenhuma linha válida");
      const { error } = await supabase.from("products").insert(parsed);
      if (error) return toast.error("Erro: " + error.message);
      toast.success(`${parsed.length} produtos importados`);
      queryClient.invalidateQueries({ queryKey: ["produtos-list"] });
    };
    input.click();
  };

  const overview = (
    <div className="grid gap-4 md:grid-cols-4">
      <Card className="p-4">
        <p className="text-xs text-muted-foreground">Total</p>
        <p className="text-2xl font-bold">{kpis.total}</p>
      </Card>
      <Card className="p-4">
        <p className="text-xs text-muted-foreground">Ativos</p>
        <p className="text-2xl font-bold">{kpis.ativos}</p>
      </Card>
      <Card className="p-4">
        <p className="text-xs text-muted-foreground">No catálogo</p>
        <p className="text-2xl font-bold">{kpis.noCatalogo}</p>
      </Card>
      <Card className="p-4">
        <p className="text-xs text-muted-foreground">Sem estoque</p>
        <p className="text-2xl font-bold text-destructive">{kpis.semEstoque}</p>
      </Card>
    </div>
  );

  const records = (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-5">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por SKU, nome, descrição..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={filters.tipo} onValueChange={(v) => setFilters({ ...filters, tipo: v })}>
            <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="produto_acabado">Produto acabado</SelectItem>
              <SelectItem value="materia_prima">Matéria-prima</SelectItem>
              <SelectItem value="servico">Serviço</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="inativo">Inativo</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.catalogo} onValueChange={(v) => setFilters({ ...filters, catalogo: v })}>
            <SelectTrigger><SelectValue placeholder="Catálogo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="sim">Publicados</SelectItem>
              <SelectItem value="nao">Não publicados</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Custo</TableHead>
              <TableHead className="text-right">Venda</TableHead>
              <TableHead className="text-right">Estoque</TableHead>
              <TableHead>Catálogo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}><Skeleton className="h-6 w-full" /></TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  Nenhum produto encontrado
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.code || "—"}</TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{p.item_type || "produto"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{fmtBRL(p.cost_price)}</TableCell>
                  <TableCell className="text-right">{fmtBRL(p.sale_price)}</TableCell>
                  <TableCell className="text-right">{p.current_stock ?? 0} {p.unit || ""}</TableCell>
                  <TableCell>
                    <button
                      onClick={() => toggleCatalogo(p)}
                      className="inline-flex items-center gap-1.5 text-xs"
                    >
                      {p.ativo_no_catalogo ? (
                        <Badge className="gap-1"><Eye className="h-3 w-3" />Publicado</Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1"><EyeOff className="h-3 w-3" />Oculto</Badge>
                      )}
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="mx-auto w-full max-w-[1600px] p-4 md:p-6">
          <ModuleShell
            moduleKey="produtos"
            title="Produtos"
            description="Cadastro mestre de produtos. Fonte única para catálogo, estoque, pedidos e produção."
            icon={<Package className="h-5 w-5" />}
            headerActions={
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleImport}>
                  <Upload className="h-4 w-4 mr-1.5" />Importar CSV
                </Button>
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-1.5" />Exportar
                </Button>
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-1.5" />Novo Produto
                </Button>
              </div>
            }
            overview={overview}
            records={records}
          />

          <NewProductDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            categories={categories || []}
            onCreated={() => queryClient.invalidateQueries({ queryKey: ["produtos-list"] })}
          />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function NewProductDialog({
  open,
  onOpenChange,
  categories,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categories: { id: string; name: string }[];
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    code: "",
    name: "",
    descricao_curta: "",
    description: "",
    category_id: "",
    item_type: "produto_acabado",
    cost_price: 0,
    sale_price: 0,
    prazo_producao_dias: 0,
    peso: 0,
    ativo_no_catalogo: false,
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.name.trim()) return toast.error("Nome obrigatório");
    setSaving(true);
    const payload: any = {
      code: form.code || null,
      name: form.name,
      descricao_curta: form.descricao_curta || null,
      description: form.description || null,
      category_id: form.category_id || null,
      item_type: form.item_type,
      cost_price: form.cost_price,
      sale_price: form.sale_price,
      prazo_producao_dias: form.prazo_producao_dias,
      peso: form.peso || null,
      ativo_no_catalogo: form.ativo_no_catalogo,
      active: true,
    };
    const { error } = await supabase.from("products").insert(payload);
    setSaving(false);
    if (error) return toast.error("Erro: " + error.message);
    toast.success("Produto criado");
    onCreated();
    onOpenChange(false);
    setForm({ ...form, code: "", name: "", descricao_curta: "", description: "" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo Produto</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>SKU</Label>
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </div>
          <div>
            <Label>Nome *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label>Descrição curta</Label>
            <Input
              value={form.descricao_curta}
              onChange={(e) => setForm({ ...form, descricao_curta: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <Label>Descrição longa</Label>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div>
            <Label>Categoria</Label>
            <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={form.item_type} onValueChange={(v) => setForm({ ...form, item_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="produto_acabado">Produto acabado</SelectItem>
                <SelectItem value="materia_prima">Matéria-prima</SelectItem>
                <SelectItem value="servico">Serviço</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Preço de custo</Label>
            <Input
              type="number"
              step="0.01"
              value={form.cost_price}
              onChange={(e) => setForm({ ...form, cost_price: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>Preço de venda</Label>
            <Input
              type="number"
              step="0.01"
              value={form.sale_price}
              onChange={(e) => setForm({ ...form, sale_price: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>Prazo de produção (dias)</Label>
            <Input
              type="number"
              value={form.prazo_producao_dias}
              onChange={(e) => setForm({ ...form, prazo_producao_dias: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>Peso (kg)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.peso}
              onChange={(e) => setForm({ ...form, peso: Number(e.target.value) })}
            />
          </div>
          <div className="md:col-span-2 flex items-center gap-3 pt-2">
            <Switch
              checked={form.ativo_no_catalogo}
              onCheckedChange={(v) => setForm({ ...form, ativo_no_catalogo: v })}
            />
            <Label>Publicar no catálogo público</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Salvando..." : "Criar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
