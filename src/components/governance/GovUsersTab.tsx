import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useUsersWithProfiles } from "@/hooks/useGovernanceData";
import { Users } from "lucide-react";

export default function GovUsersTab() {
  const { data: users = [], isLoading } = useUsersWithProfiles();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Users className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Usuários & Vínculos de Perfil</h3>
        <Badge variant="outline">{users.length} usuários</Badge>
      </div>

      <Card>
        <CardContent className="pt-4">
          {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Perfil Tipo</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum usuário</TableCell></TableRow>}
                {users.map((u: any) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                    <TableCell className="text-sm">{u.email || "—"}</TableCell>
                    <TableCell><Badge variant="outline">{u.role || "—"}</Badge></TableCell>
                    <TableCell className="text-sm">{(u.profile_types as any)?.display_name || "Não atribuído"}</TableCell>
                    <TableCell>
                      {u.is_owner ? <Badge className="text-[10px]">Owner</Badge> : <Badge variant="secondary" className="text-[10px]">Ativo</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
