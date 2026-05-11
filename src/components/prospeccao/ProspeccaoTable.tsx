import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { ArchitectProspeccaoSheet } from "./ArchitectProspeccaoSheet";

interface ProspeccaoTableProps {
  filters?: any;
  showNaoContactados?: boolean;
}

export function ProspeccaoTable({ filters = {}, showNaoContactados = false }: ProspeccaoTableProps) {
  const [selectedArchitectId, setSelectedArchitectId] = useState<string | null>(null);
  
  // Buscar stages dinâmicos
  const { data: stages } = useQuery({
    queryKey: ["prospec-stages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tendenci_prospec_arq_stages")
        .select("*")
        .eq("ativa", true)
        .order("position");

      if (error) throw error;
      return data || [];
    },
  });

  // Criar mapeamento de stages
  const stageMap = stages?.reduce((acc, stage) => {
    acc[stage.slug] = { nome: stage.nome, cor: stage.cor };
    return acc;
  }, {} as Record<string, { nome: string; cor: string }>) || {};
  
  const { data: architects, isLoading } = useQuery({
    queryKey: ["prospeccao-architects-table", filters, showNaoContactados],
    queryFn: async () => {
      let query = supabase
        .from("architects")
        .select(`
          *,
          vendedor:profiles!architects_vendedor_responsavel_fkey(full_name, email),
          projects:projects(id)
        `)
        .eq("active", true);

      // Aplicar filtro de não contactados
      if (showNaoContactados) {
        query = query.is("data_primeiro_contato", null);
      }

      // Aplicar filtros
      if (filters.vendedor && filters.vendedor !== "todos") {
        query = query.eq("vendedor_responsavel", filters.vendedor);
      }
      if (filters.status && filters.status !== "todos") {
        query = query.eq("status_funil", filters.status);
      }
      if (filters.cidade && filters.cidade !== "todas") {
        query = query.eq("city", filters.cidade);
      }
      if (filters.tier && filters.tier !== "todos") {
        query = query.eq("tier", filters.tier);
      }
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,company.ilike.%${filters.search}%,city.ilike.%${filters.search}%`);
      }
      if (filters.phone) {
        query = query.ilike("phone", `%${filters.phone}%`);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <>
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead>Cidade/UF</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead>Status Funil</TableHead>
              <TableHead>Projetos</TableHead>
              <TableHead>Último Contato</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {architects?.map((architect) => (
              <TableRow key={architect.id}>
                <TableCell className="font-medium">{architect.name}</TableCell>
                <TableCell>{architect.phone || "-"}</TableCell>
                <TableCell>{architect.city || "-"}</TableCell>
                <TableCell>
                  <Badge variant="outline">{architect.tier || "B"}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {architect.vendedor?.full_name || architect.vendedor?.email || "-"}
                </TableCell>
                <TableCell>
                  <Badge className={stageMap[architect.status_funil || "novo_arquiteto"]?.cor || "bg-gray-500"}>
                    {stageMap[architect.status_funil || "novo_arquiteto"]?.nome || "Novo Parceiro Profissional"}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">{architect.projects?.length || 0}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {architect.data_ultimo_contato 
                    ? format(new Date(architect.data_ultimo_contato), "dd/MM/yyyy")
                    : "-"
                  }
                </TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setSelectedArchitectId(architect.id)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ArchitectProspeccaoSheet
        architectId={selectedArchitectId || ""}
        open={!!selectedArchitectId}
        onOpenChange={(open) => !open && setSelectedArchitectId(null)}
      />
    </>
  );
}
