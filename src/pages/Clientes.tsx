import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveTenant } from "@/hooks/useActiveTenant";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleShell } from "@/components/layout/ModuleShell";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Users,
  Plus,
  Upload,
  Download,
  Search,
  Building2,
  User as UserIcon,
  MoreHorizontal,
  Pencil,
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
import { Button as BtnUI } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { QuickCreateClientDialog } from "@/components/financeiro/QuickCreateClientDialog";
import { EditClientDialog as FullEditClientDialog } from "@/components/crm/EditClientDialog";
import { DeleteClientDialog } from "@/components/clients/DeleteClientDialog";
import { useCostCenters } from "@/hooks/useCostCenters";
import { Can } from "@/components/auth/Can";
import { ClientesFornecedoresTabs } from "@/components/layout/ClientesFornecedoresTabs";
import { OwnerTenantEmptyState, MASTER_OWNER_TENANT_ID } from "@/components/tenant/OwnerTenantEmptyState";

interface ClientRow {
  id: string;
  name: string;
  cpf_cnpj: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  tipo_pessoa: string | null;
  razao_social: string | null;
  nome_fantasia: string | null;
  created_at: string;
}

export default function Clientes() {
  const queryClient = useQueryClient();
  const { activeTenantId } = useActiveTenant();
  const { costCenters } = useCostCenters();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientRow | null>(null);
  const [deletingClient, setDeletingClient] = useState<ClientRow | null>(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    tipo: "all",
    status: "all",
    responsavel: "all",
    centroCusto: "all",
  });

  const { data: clients, isLoading } = useQuery({
    queryKey: ["clients-list", activeTenantId],
    enabled: !!activeTenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select(
          "id, name, cpf_cnpj, email, phone, city, state, tipo_pessoa, razao_social, nome_fantasia, created_at"
        )
        .eq("tenant_id", activeTenantId!)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data || []) as ClientRow[];
    },
  });


  const filtered = useMemo(() => {
    let rows = clients || [];
    if (filters.tipo !== "all") {
      rows = rows.filter((r) => (r.tipo_pessoa || "PF") === filters.tipo);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.name?.toLowerCase().includes(q) ||
          r.cpf_cnpj?.toLowerCase().includes(q) ||
          r.email?.toLowerCase().includes(q) ||
          r.phone?.toLowerCase().includes(q)
      );
    }
    return rows;
  }, [clients, filters, search]);

  const kpis = useMemo(() => {
    const total = clients?.length || 0;
    const pf = clients?.filter((c) => (c.tipo_pessoa || "PF") === "PF").length || 0;
    const pj = clients?.filter((c) => c.tipo_pessoa === "PJ").length || 0;
    const last30 =
      clients?.filter(
        (c) =>
          new Date(c.created_at).getTime() >
          Date.now() - 30 * 24 * 60 * 60 * 1000
      ).length || 0;
    return { total, pf, pj, last30 };
  }, [clients]);

  const handleExport = () => {
    if (!filtered.length) {
      toast.error("Nada para exportar");
      return;
    }
    const headers = [
      "Nome",
      "CPF/CNPJ",
      "Tipo",
      "Email",
      "Telefone",
      "Cidade",
      "UF",
    ];
    const rows = filtered.map((c) => [
      c.name,
      c.cpf_cnpj || "",
      c.tipo_pessoa || "PF",
      c.email || "",
      c.phone || "",
      c.city || "",
      c.state || "",
    ]);
    const csv = [headers, ...rows]
      .map((r) =>
        r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");
    const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clientes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exportados ${filtered.length} clientes`);
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
          if (!cols || !cols[0]) return null;
          return {
            name: cols[0],
            cpf_cnpj: cols[1] || null,
            tipo_pessoa: cols[2] || "PF",
            email: cols[3] || null,
            phone: cols[4] || null,
            city: cols[5] || null,
            state: cols[6] || null,
          };
        })
        .filter(Boolean) as any[];
      if (!parsed.length) {
        toast.error("Nenhuma linha válida encontrada");
        return;
      }
      const { error } = await supabase.from("clients").insert(parsed);
      if (error) {
        toast.error("Erro ao importar: " + error.message);
        return;
      }
      toast.success(`${parsed.length} clientes importados`);
      queryClient.invalidateQueries({ queryKey: ["clients-list"] });
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
        <p className="text-xs text-muted-foreground">Pessoa Física</p>
        <p className="text-2xl font-bold">{kpis.pf}</p>
      </Card>
      <Card className="p-4">
        <p className="text-xs text-muted-foreground">Pessoa Jurídica</p>
        <p className="text-2xl font-bold">{kpis.pj}</p>
      </Card>
      <Card className="p-4">
        <p className="text-xs text-muted-foreground">Novos (30d)</p>
        <p className="text-2xl font-bold">{kpis.last30}</p>
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
              placeholder="Buscar por nome, CPF/CNPJ, e-mail..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            value={filters.tipo}
            onValueChange={(v) => setFilters({ ...filters, tipo: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="PF">Pessoa Física</SelectItem>
              <SelectItem value="PJ">Pessoa Jurídica</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.status}
            onValueChange={(v) => setFilters({ ...filters, status: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="inativo">Inativo</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.centroCusto}
            onValueChange={(v) => setFilters({ ...filters, centroCusto: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Centro de Custo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {costCenters.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>CPF/CNPJ</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Cidade/UF</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  Nenhum cliente encontrado
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((c) => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => setEditingClient(c)}>
                  <TableCell className="font-medium">
                    {c.nome_fantasia || c.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="gap-1">
                      {c.tipo_pessoa === "PJ" ? (
                        <Building2 className="h-3 w-3" />
                      ) : (
                        <UserIcon className="h-3 w-3" />
                      )}
                      {c.tipo_pessoa || "PF"}
                    </Badge>
                  </TableCell>
                  <TableCell>{c.cpf_cnpj || "—"}</TableCell>
                  <TableCell>{c.email || "—"}</TableCell>
                  <TableCell>{c.phone || "—"}</TableCell>
                  <TableCell>
                    {[c.city, c.state].filter(Boolean).join("/") || "—"}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <BtnUI variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </BtnUI>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingClient(c)}>
                          <Pencil className="h-4 w-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeletingClient(c)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
          <ClientesFornecedoresTabs />
          <ModuleShell
            moduleKey="clientes"
            title="Clientes / Fornecedores"
            description="Gerencie sua base de clientes em um só lugar."
            icon={<Users className="h-5 w-5" />}
            headerActions={
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleImport}>
                  <Upload className="h-4 w-4 mr-1.5" />
                  Importar CSV
                </Button>
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-1.5" />
                  Exportar
                </Button>
                <Can module="comercial" action="create">
                  <Button size="sm" onClick={() => setCreateOpen(true)}>
                    <Plus className="h-4 w-4 mr-1.5" />
                    Novo Cliente
                  </Button>
                </Can>
              </div>
            }
            overview={overview}
            records={records}
          />

          <QuickCreateClientDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            onCreated={() =>
              queryClient.invalidateQueries({ queryKey: ["clients-list"] })
            }
          />

          <FullEditClientDialog
            open={!!editingClient}
            onOpenChange={(v) => !v && setEditingClient(null)}
            clientId={editingClient?.id ?? ""}
            onSuccess={() => {
              setEditingClient(null);
              queryClient.invalidateQueries({ queryKey: ["clients-list"] });
            }}
          />


          <DeleteClientDialog
            client={deletingClient}
            onClose={() => setDeletingClient(null)}
            onDeleted={() => {
              setDeletingClient(null);
              queryClient.invalidateQueries({ queryKey: ["clients-list"] });
            }}
          />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
