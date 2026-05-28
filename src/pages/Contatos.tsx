import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useActiveTenant } from "@/hooks/useActiveTenant";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleShell } from "@/components/layout/ModuleShell";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, Users, Truck, ExternalLink } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateClientDialog } from "@/components/crm/CreateClientDialog";
import CreateSupplierDialog from "@/components/suppliers/CreateSupplierDialog";

type ContatoRow = {
  tipo: "cliente" | "fornecedor";
  id: string;
  tenant_id: string | null;
  nome: string;
  nome_fantasia: string | null;
  cpf_cnpj: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  created_at: string;
};

function normalize(s: string | null | undefined) {
  return (s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function onlyDigits(s: string | null | undefined) {
  return (s ?? "").replace(/\D+/g, "");
}

export default function Contatos() {
  const { activeTenantId } = useActiveTenant();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"clientes" | "fornecedores" | "ambos">("ambos");
  const [search, setSearch] = useState("");
  const [openClient, setOpenClient] = useState(false);
  const [openSupplier, setOpenSupplier] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["contatos-unified", activeTenantId],
    enabled: !!activeTenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_contatos_unified" as any)
        .select("*")
        .order("nome", { ascending: true })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as ContatoRow[];
    },
  });

  const filtered = useMemo(() => {
    const all = data ?? [];
    const byTab = all.filter((r) =>
      tab === "ambos" ? true : tab === "clientes" ? r.tipo === "cliente" : r.tipo === "fornecedor"
    );
    const q = normalize(search.trim());
    const qDigits = onlyDigits(search);
    if (!q && !qDigits) return byTab;
    return byTab.filter((r) => {
      const matchName =
        normalize(r.nome).includes(q) || normalize(r.nome_fantasia).includes(q);
      const matchDoc = qDigits && onlyDigits(r.cpf_cnpj).includes(qDigits);
      const matchEmail = normalize(r.email).includes(q);
      return matchName || matchDoc || matchEmail;
    });
  }, [data, tab, search]);

  const counts = useMemo(() => {
    const all = data ?? [];
    return {
      clientes: all.filter((r) => r.tipo === "cliente").length,
      fornecedores: all.filter((r) => r.tipo === "fornecedor").length,
      total: all.length,
    };
  }, [data]);

  const openOriginal = (r: ContatoRow) => {
    if (r.tipo === "cliente") navigate(`/clientes?focus=${r.id}`);
    else navigate(`/fornecedores?focus=${r.id}`);
  };

  const renderRows = (rows: ContatoRow[]) => {
    if (isLoading) {
      return Array.from({ length: 6 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell colSpan={6}>
            <Skeleton className="h-6 w-full" />
          </TableCell>
        </TableRow>
      ));
    }
    if (rows.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
            Nenhum contato encontrado para essa busca.
          </TableCell>
        </TableRow>
      );
    }
    return rows.map((r) => (
      <TableRow key={`${r.tipo}-${r.id}`} className="cursor-pointer" onClick={() => openOriginal(r)}>
        <TableCell>
          {r.tipo === "cliente" ? (
            <Badge variant="secondary" className="gap-1">
              <Users className="h-3 w-3" /> Cliente
            </Badge>
          ) : (
            <Badge className="gap-1 bg-amber-600 hover:bg-amber-600 text-white">
              <Truck className="h-3 w-3" /> Fornecedor
            </Badge>
          )}
        </TableCell>
        <TableCell className="font-medium">
          {r.nome}
          {r.nome_fantasia && r.nome_fantasia !== r.nome && (
            <span className="text-xs text-muted-foreground ml-2">({r.nome_fantasia})</span>
          )}
        </TableCell>
        <TableCell className="font-mono text-xs">{r.cpf_cnpj ?? "—"}</TableCell>
        <TableCell className="text-sm">{r.email ?? "—"}</TableCell>
        <TableCell className="text-sm">
          {r.city ? `${r.city}${r.state ? "/" + r.state : ""}` : "—"}
        </TableCell>
        <TableCell className="text-right">
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              openOriginal(r);
            }}
          >
            <ExternalLink className="h-3.5 w-3.5 mr-1" /> Abrir
          </Button>
        </TableCell>
      </TableRow>
    ));
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <ModuleShell
          title="Contatos"
          description="Hub unificado de clientes e fornecedores. Os cadastros continuam separados — esta visão apenas reúne ambos para busca rápida."
          actions={
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" /> Novo
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setOpenClient(true)}>
                    <Users className="h-4 w-4 mr-2" /> Novo Cliente
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setOpenSupplier(true)}>
                    <Truck className="h-4 w-4 mr-2" /> Novo Fornecedor
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          }
        >
          <Card className="p-4 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
                <TabsList>
                  <TabsTrigger value="clientes">
                    Clientes <Badge variant="secondary" className="ml-2">{counts.clientes}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="fornecedores">
                    Fornecedores <Badge variant="secondary" className="ml-2">{counts.fornecedores}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="ambos">
                    Ambos <Badge variant="secondary" className="ml-2">{counts.total}</Badge>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, CNPJ/CPF ou email…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Tipo</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>CNPJ/CPF</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Cidade/UF</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>{renderRows(filtered)}</TableBody>
              </Table>
            </div>
          </Card>
        </ModuleShell>

        <CreateClientDialog
          open={openClient}
          onOpenChange={setOpenClient}
          onSuccess={() => {
            setOpenClient(false);
            refetch();
          }}
        />
        <CreateSupplierDialog
          open={openSupplier}
          onOpenChange={setOpenSupplier}
          onSuccess={() => {
            setOpenSupplier(false);
            refetch();
          }}
        />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
