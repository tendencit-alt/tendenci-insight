import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProfileTypes, useProfileTypePermissions, useUpdateProfilePermission } from "@/hooks/useGovernanceData";
import { Shield, Users } from "lucide-react";

const ACTIONS = [
  { key: "can_view", label: "Visualizar" },
  { key: "can_create", label: "Criar" },
  { key: "can_edit", label: "Editar" },
  { key: "can_delete", label: "Excluir" },
  { key: "can_approve", label: "Aprovar" },
  { key: "can_conciliate", label: "Conciliar" },
  { key: "can_export", label: "Exportar" },
  { key: "can_admin", label: "Configurar" },
];

export default function GovProfilesTab() {
  const { data: profiles = [], isLoading } = useProfileTypes();
  const [selectedProfile, setSelectedProfile] = useState<string>("");
  const { data: perms = [] } = useProfileTypePermissions(selectedProfile || undefined);
  const updateMut = useUpdateProfilePermission();

  const handleToggle = (permId: string, key: string, current: boolean) => {
    updateMut.mutate({ id: permId, [key]: !current });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Users className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Perfis & Matriz de Permissões</h3>
      </div>

      {/* Profile list */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {profiles.map((p: any) => (
          <Card key={p.id} className={`cursor-pointer transition-all ${selectedProfile === p.id ? "ring-2 ring-primary" : "hover:shadow-md"}`} onClick={() => setSelectedProfile(p.id)}>
            <CardContent className="pt-4 flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${p.color || "bg-primary"}`} />
              <div>
                <p className="text-sm font-medium">{p.display_name || p.name}</p>
                <p className="text-[10px] text-muted-foreground">{p.description || (p.is_system ? "Sistema" : "Empresa")}</p>
              </div>
              {p.is_system && <Badge variant="outline" className="text-[9px] ml-auto">Sistema</Badge>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Permission matrix */}
      {selectedProfile && perms.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Matriz de Permissões — {profiles.find((p: any) => p.id === selectedProfile)?.display_name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Módulo</TableHead>
                    {ACTIONS.map(a => <TableHead key={a.key} className="text-center text-xs">{a.label}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {perms.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium text-sm">{p.module}</TableCell>
                      {ACTIONS.map(a => (
                        <TableCell key={a.key} className="text-center">
                          <Checkbox checked={!!p[a.key]} onCheckedChange={() => handleToggle(p.id, a.key, !!p[a.key])} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedProfile && perms.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhuma permissão configurada para este perfil</p>
      )}
    </div>
  );
}
