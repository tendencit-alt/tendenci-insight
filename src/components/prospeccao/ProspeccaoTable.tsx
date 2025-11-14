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

const STATUS_LABELS: Record<string, string> = {
  novo_arquiteto: "Novo Arquiteto",
  contato_iniciado: "Contato Iniciado",
  em_conversa: "Em Conversa",
  interessado: "Interessado",
  reuniao_agendada: "Reunião Agendada",
  parceiro_ativo: "Parceiro Ativo",
  sem_interesse: "Sem Interesse",
};

const STATUS_COLORS: Record<string, string> = {
  novo_arquiteto: "bg-gray-500",
  contato_iniciado: "bg-blue-500",
  em_conversa: "bg-cyan-500",
  interessado: "bg-orange-500",
  reuniao_agendada: "bg-purple-500",
  parceiro_ativo: "bg-green-500",
  sem_interesse: "bg-red-500",
};

interface ProspeccaoTableProps {
  filters?: any;
  showNaoContactados?: boolean;
}

export function ProspeccaoTable({ filters = {}, showNaoContactados = false }: ProspeccaoTableProps) {
  const [selectedArchitectId, setSelectedArchitectId] = useState<string | null>(null);
  
  const { data: architects, isLoading } = useQuery({
    queryKey: ["prospeccao-architects-table", filters, showNaoContactados],
    queryFn: async () => {
      let query = supabase
        .from("architects")
        .select(`
          *,
          vendedor:profiles!architects_vendedor_responsavel_fkey(full_name, email)
        `)
        .eq("active", true);

      // Aplicar filtro de não contactados
      if (showNaoContactados) {
        query = query.or("data_primeiro_contato.is.null,status_funil.eq.novo_arquiteto");
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
                  <Badge 
                    className={`${STATUS_COLORS[architect.status_funil || "novo_arquiteto"]} text-white`}
                  >
                    {STATUS_LABELS[architect.status_funil || "novo_arquiteto"]}
                  </Badge>
                </TableCell>
                <TableCell>0</TableCell>
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
