import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useCompanyOverview, useTenantUsers } from "@/hooks/useSaasAdmin";
import { Users, MoreHorizontal, Mail, UserX, UserCheck, KeyRound } from "lucide-react";
import { AdminActionDialog } from "./AdminActionDialog";

export function UsersTab() {
  const { data: companies = [] } = useCompanyOverview();
  const [tenantId, setTenantId] = useState<string | undefined>();
  const { data: users = [], isLoading } = useTenantUsers(tenantId);
  const [dialog, setDialog] = useState<{ action: string; user_id: string; title: string; description: string } | null>(null);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Administração de Usuários</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={tenantId} onValueChange={setTenantId}>
            <SelectTrigger className="max-w-md"><SelectValue placeholder="Selecione uma empresa..." /></SelectTrigger>
            <SelectContent>
              {companies.map((c) => (
                <SelectItem key={c.tenant_id} value={c.tenant_id}>{c.tenant_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {tenantId && (
            isLoading ? <p className="text-muted-foreground">Carregando...</p> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.full_name ?? "—"}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell><Badge variant="outline">{u.role ?? "user"}</Badge></TableCell>
                      <TableCell>{u.is_owner && <Badge>Owner</Badge>}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setDialog({ action: "reset_user_password", user_id: u.id, title: "Enviar reset de senha", description: `Será enviado um email de recuperação para ${u.email}.` })}>
                              <KeyRound className="h-4 w-4 mr-2" />Resetar senha
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDialog({ action: "deactivate_user", user_id: u.id, title: "Desativar usuário", description: `${u.email} será banido e não poderá mais fazer login.` })}>
                              <UserX className="h-4 w-4 mr-2" />Desativar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDialog({ action: "reactivate_user", user_id: u.id, title: "Reativar usuário", description: `${u.email} voltará a ter acesso.` })}>
                              <UserCheck className="h-4 w-4 mr-2" />Reativar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nenhum usuário</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            )
          )}
          {!tenantId && (
            <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-2">
              <Mail className="h-8 w-8 opacity-40" />
              Selecione uma empresa para ver os usuários
            </div>
          )}
        </CardContent>
      </Card>

      {dialog && (
        <AdminActionDialog
          open={!!dialog}
          onOpenChange={(v) => !v && setDialog(null)}
          action={dialog.action}
          title={dialog.title}
          description={dialog.description}
          target_user_id={dialog.user_id}
          target_tenant_id={tenantId}
        />
      )}
    </div>
  );
}
