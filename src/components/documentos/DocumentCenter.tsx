import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Search, Loader2, FileText, Download, Trash2, Upload, Eye } from "lucide-react";
import { format } from "date-fns";
import { DocumentUploadDialog } from "./DocumentUploadDialog";

const MODULES = [
  { value: "", label: "Todos" },
  { value: "comercial", label: "Comercial" },
  { value: "financeiro", label: "Financeiro" },
  { value: "operacional", label: "Operacional" },
  { value: "estrutural", label: "Estrutural" },
  { value: "producao", label: "Produção" },
  { value: "aprovacao", label: "Aprovação" },
];

const DOC_TYPES = [
  { value: "", label: "Todos" },
  { value: "fiscal", label: "Fiscal" },
  { value: "financeiro", label: "Financeiro" },
  { value: "contratual", label: "Contratual" },
  { value: "operacional", label: "Operacional" },
  { value: "comercial", label: "Comercial" },
  { value: "comprovante", label: "Comprovante" },
  { value: "imagem", label: "Imagem" },
  { value: "arquivo_tecnico", label: "Arquivo Técnico" },
];

const TYPE_COLORS: Record<string, string> = {
  fiscal: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  financeiro: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  contratual: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  operacional: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  comercial: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  comprovante: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  imagem: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  arquivo_tecnico: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
};

export function DocumentCenter() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [moduleFilter, setModuleFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);

  const { data: documents, isLoading } = useQuery({
    queryKey: ["erp-documents", moduleFilter, typeFilter],
    queryFn: async () => {
      let query = supabase
        .from("erp_documents")
        .select("*")
        .eq("is_deleted", false)
        .is("replaced_by", null)
        .order("created_at", { ascending: false })
        .limit(300);

      if (moduleFilter) query = query.eq("module", moduleFilter);
      if (typeFilter) query = query.eq("document_type", typeFilter);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const handleDownload = async (doc: any) => {
    try {
      const { data, error } = await supabase.storage
        .from("erp-documents")
        .download(doc.file_path);
      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.file_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error("Erro ao baixar: " + e.message);
    }
  };

  const handleSoftDelete = async (doc: any) => {
    if (!confirm("Deseja excluir logicamente este documento?")) return;
    try {
      const { error } = await supabase
        .from("erp_documents")
        .update({
          is_deleted: true,
          deleted_by: user?.id,
          deleted_at: new Date().toISOString(),
        })
        .eq("id", doc.id);
      if (error) throw error;
      toast.success("Documento excluído");
      queryClient.invalidateQueries({ queryKey: ["erp-documents"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const filtered = (documents || []).filter((d) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return d.file_name?.toLowerCase().includes(s) || d.entity_table?.toLowerCase().includes(s) || d.notes?.toLowerCase().includes(s);
  });

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  };

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold">{(documents || []).length}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{(documents || []).filter(d => d.document_type === "fiscal").length}</p>
          <p className="text-xs text-muted-foreground">Fiscais</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{(documents || []).filter(d => d.document_type === "financeiro").length}</p>
          <p className="text-xs text-muted-foreground">Financeiros</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">{(documents || []).filter(d => d.document_type === "contratual").length}</p>
          <p className="text-xs text-muted-foreground">Contratuais</p>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar documento..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={moduleFilter} onValueChange={setModuleFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Módulo" /></SelectTrigger>
          <SelectContent>{MODULES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>{DOC_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
        </Select>
        <Button size="sm" onClick={() => setUploadOpen(true)}>
          <Upload className="h-4 w-4 mr-1" /> Anexar
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Arquivo</TableHead>
                <TableHead>Módulo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>Versão</TableHead>
                <TableHead>Tamanho</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum documento encontrado</TableCell></TableRow>
              ) : filtered.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm truncate max-w-[200px]">{doc.file_name}</span>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{doc.module}</Badge></TableCell>
                  <TableCell><Badge className={`text-xs ${TYPE_COLORS[doc.document_type] || ""}`}>{doc.document_type}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{doc.entity_table}</TableCell>
                  <TableCell className="text-xs">v{doc.version}</TableCell>
                  <TableCell className="text-xs">{formatSize(doc.file_size || 0)}</TableCell>
                  <TableCell className="text-xs">{format(new Date(doc.created_at), "dd/MM/yy")}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => handleDownload(doc)} title="Baixar">
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleSoftDelete(doc)} title="Excluir">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DocumentUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["erp-documents"] })}
      />
    </div>
  );
}
