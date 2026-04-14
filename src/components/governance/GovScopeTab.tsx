import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useProfileTypes, useScopeRestrictions, useCriticalPermissions } from "@/hooks/useGovernanceData";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, Eye } from "lucide-react";

export default function GovScopeTab() {
  const { data: profiles = [] } = useProfileTypes();
  const [selectedProfile, setSelectedProfile] = useState<string>("");
  const { data: scopes = [] } = useScopeRestrictions(selectedProfile || undefined);
  const { data: critical = [] } = useCriticalPermissions(selectedProfile || undefined);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Eye className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Escopo de Dados & Permissões Críticas</h3>
      </div>

      <div>
        <Select value={selectedProfile} onValueChange={setSelectedProfile}>
          <SelectTrigger className="w-[280px]"><SelectValue placeholder="Selecione um perfil..." /></SelectTrigger>
          <SelectContent>
            {profiles.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.display_name || p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {selectedProfile && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Scope Restrictions */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Restrições de Escopo</CardTitle></CardHeader>
            <CardContent>
              {scopes.length === 0 ? <p className="text-sm text-muted-foreground">Sem restrições (acesso total)</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Tipo</TableHead><TableHead>Modo</TableHead><TableHead>IDs</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {scopes.map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell><Badge variant="outline">{s.scope_type}</Badge></TableCell>
                        <TableCell className="text-sm">{s.scope_mode}</TableCell>
                        <TableCell className="text-xs font-mono">{s.allowed_ids?.length || 0} IDs</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Critical Permissions */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Lock className="h-4 w-4" />Permissões Críticas</CardTitle></CardHeader>
            <CardContent>
              {critical.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma permissão crítica configurada</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Permissão</TableHead><TableHead>Grupo</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {critical.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="text-sm">{c.permission_label || c.permission_key}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{c.permission_group || "—"}</Badge></TableCell>
                        <TableCell>
                          <Badge variant={c.allowed ? "default" : "destructive"} className="text-[10px]">
                            {c.allowed ? "Permitido" : "Bloqueado"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
