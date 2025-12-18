import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Edit, ArrowRight, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LeadDetailSheet } from "./LeadDetailSheet";
import { EditLeadDialog } from "./EditLeadDialog";
import { ConvertToDealDialog } from "./ConvertToDealDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface LeadsTableProps {
  filters: any;
}

export function LeadsTable({ filters }: LeadsTableProps) {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<any>(null);

  useEffect(() => {
    fetchLeads();
  }, [filters]);

  const fetchLeads = async () => {
    setLoading(true);
    let query = supabase
      .from("leads")
      .select(`
        *,
        client:clients(name, phone, email, notes),
        architect:architects(name),
        source:lead_sources(name)
      `)
      .order("created_at", { ascending: false });

    if (filters.status !== "Todos") {
      query = query.eq("status", filters.status);
    }

    if (filters.search) {
      query = query.or(`client.name.ilike.%${filters.search}%,client.phone.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;
    
    if (!error && data) {
      setLeads(data);
    }
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
      novo: "default",
      qualificando: "secondary",
      fechado: "outline",
      perdido: "destructive"
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const getTemperatureBadge = (temp: string) => {
    const colors: Record<string, string> = {
      quente: "bg-orange-500 text-white",
      morno: "bg-yellow-500 text-white",
      frio: "bg-blue-500 text-white"
    };
    return <Badge className={colors[temp] || ""}>{temp || "N/A"}</Badge>;
  };

  const handleView = (lead: any) => {
    setSelectedLead(lead);
    setDetailOpen(true);
  };

  const handleEdit = (lead: any) => {
    setSelectedLead(lead);
    setDetailOpen(false);
    setEditOpen(true);
  };

  const handleConvert = (lead: any) => {
    setSelectedLead(lead);
    setConvertOpen(true);
  };

  const handleDelete = (lead: any) => {
    setLeadToDelete(lead);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!leadToDelete) return;

    try {
      // Delete attachments from storage first
      const { data: attachments } = await supabase
        .from('lead_attachments')
        .select('file_path')
        .eq('lead_id', leadToDelete.id);

      if (attachments) {
        for (const attachment of attachments) {
          await supabase.storage
            .from('lead-attachments')
            .remove([attachment.file_path]);
        }
      }

      // Delete lead (cascade will handle lead_attachments and related records)
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadToDelete.id);

      if (error) throw error;

      toast.success('Lead excluído com sucesso! Todo o histórico foi removido.');
      fetchLeads();
      setDeleteOpen(false);
      setLeadToDelete(null);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir lead');
    }
  };

  return (
    <>
      <Card className="overflow-hidden">
        <div className="p-6 border-b bg-gradient-to-r from-background to-muted/20">
          <h2 className="text-xl font-semibold">Leads Ativos</h2>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Temperatura</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Última Atualização</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Carregando leads...
                  </TableCell>
                </TableRow>
              ) : leads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhum lead encontrado
                  </TableCell>
                </TableRow>
              ) : (
                leads.map((lead) => (
                  <TableRow key={lead.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium">{lead.client?.name || "N/A"}</TableCell>
                    <TableCell>{lead.client?.phone || "N/A"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{lead.source?.name || lead.utm_source || "N/A"}</Badge>
                    </TableCell>
                    <TableCell>{getTemperatureBadge("quente")}</TableCell>
                    <TableCell>{getStatusBadge(lead.status)}</TableCell>
                    <TableCell>{lead.architect?.name || "Não atribuído"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true, locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => handleView(lead)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(lead)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleConvert(lead)}>
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => handleDelete(lead)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {selectedLead && (
        <>
          <LeadDetailSheet 
            lead={selectedLead} 
            open={detailOpen} 
            onOpenChange={setDetailOpen}
            onEdit={() => handleEdit(selectedLead)}
          />
          <EditLeadDialog lead={selectedLead} open={editOpen} onOpenChange={setEditOpen} onSuccess={fetchLeads} />
          <ConvertToDealDialog lead={selectedLead} open={convertOpen} onOpenChange={setConvertOpen} onSuccess={fetchLeads} />
        </>
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente excluir o lead <strong>{leadToDelete?.client?.name}</strong> e todo o histórico? 
              Esta ação não pode ser desfeita e todos os dados relacionados serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Excluir Definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
