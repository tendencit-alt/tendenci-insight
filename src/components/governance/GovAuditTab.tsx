import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { usePermissionAudit, useAccessLogs } from "@/hooks/useGovernanceData";
import { History, Shield } from "lucide-react";

export default function GovAuditTab() {
  const { data: auditPerms = [], isLoading: lPerms } = usePermissionAudit();
  const { data: accessLogs = [], isLoading: lAccess } = useAccessLogs();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <History className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Auditoria de Acesso & Permissões</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Permission changes audit */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Alterações de Permissão</CardTitle></CardHeader>
          <CardContent>
            {lPerms ? <p className="text-sm text-muted-foreground">Carregando...</p> : (
              <div className="max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Evento</TableHead><TableHead>Perfil</TableHead><TableHead>Detalhe</TableHead><TableHead>Data</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {auditPerms.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhum registro</TableCell></TableRow>}
                    {auditPerms.map((a: any) => (
                      <TableRow key={a.id}>
                        <TableCell><Badge variant="outline" className="text-[10px]">{a.event_type}</Badge></TableCell>
                        <TableCell className="text-sm">{a.profile_type_name || "—"}</TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate">{a.change_detail || "—"}</TableCell>
                        <TableCell className="text-xs">{a.created_at ? new Date(a.created_at).toLocaleString("pt-BR") : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Access logs */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4" />Log de Ações</CardTitle></CardHeader>
          <CardContent>
            {lAccess ? <p className="text-sm text-muted-foreground">Carregando...</p> : (
              <div className="max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Evento</TableHead><TableHead>Tabela</TableHead><TableHead>Registro</TableHead><TableHead>Data</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {accessLogs.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhum registro</TableCell></TableRow>}
                    {accessLogs.slice(0, 50).map((l: any) => (
                      <TableRow key={l.id}>
                        <TableCell><Badge variant="outline" className="text-[10px]">{l.event_type}</Badge></TableCell>
                        <TableCell className="text-sm">{l.table_name}</TableCell>
                        <TableCell className="text-xs font-mono truncate max-w-[120px]">{l.record_id?.slice(0, 8)}...</TableCell>
                        <TableCell className="text-xs">{l.created_at ? new Date(l.created_at).toLocaleString("pt-BR") : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
