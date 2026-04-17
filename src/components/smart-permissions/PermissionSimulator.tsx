import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { usePermissionSimulation } from "@/contexts/PermissionSimulationContext";

export function PermissionSimulatorTrigger() {
  const sim = usePermissionSimulation();
  const [open, setOpen] = useState(false);

  if (!sim.isOwner) return null;

  return (
    <>
      <Button
        variant={sim.state.active ? "default" : "ghost"}
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        {sim.state.active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        <span className="text-xs">
          {sim.state.active
            ? `Simulando: ${sim.effectiveProfileName ?? sim.state.targetProfileName ?? "—"}`
            : "Simular permissões"}
        </span>
      </Button>
      <PermissionSimulatorDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

function PermissionSimulatorDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const sim = usePermissionSimulation();
  const [selectedProfile, setSelectedProfile] = useState<string | undefined>();
  const [selectedUser, setSelectedUser] = useState<string | undefined>();

  const { data: profiles = [] } = useQuery({
    queryKey: ["sim-profile-types"],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase
        .from("profile_types")
        .select("id,name,display_name,description")
        .eq("is_active", true)
        .order("display_name");
      return data ?? [];
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ["sim-users"],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id,full_name,email,profile_type_id")
        .order("full_name")
        .limit(200);
      return data ?? [];
    },
  });

  const profileById = new Map(profiles.map((p: any) => [p.id, p]));

  const startProfileSim = () => {
    if (!selectedProfile) return;
    const p: any = profileById.get(selectedProfile);
    sim.startSimulation({
      profileTypeId: selectedProfile,
      profileName: p?.display_name ?? p?.name,
    });
    onOpenChange(false);
  };

  const startUserSim = () => {
    if (!selectedUser) return;
    const u: any = users.find((x: any) => x.id === selectedUser);
    const p: any = profileById.get(u?.profile_type_id);
    sim.startSimulation({
      userId: selectedUser,
      userName: u?.full_name ?? u?.email,
      profileTypeId: u?.profile_type_id,
      profileName: p?.display_name ?? p?.name,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Simular permissões
          </DialogTitle>
          <DialogDescription>
            Modo exclusivo Owner. A UI passará a refletir o que esse perfil/usuário enxergaria.
            Não altera dados — apenas a interface.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="profile">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="profile">Por perfil</TabsTrigger>
            <TabsTrigger value="user">Por usuário</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-3 pt-3">
            <Select value={selectedProfile} onValueChange={setSelectedProfile}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um perfil" />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.display_name ?? p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              {sim.state.active && (
                <Button variant="outline" size="sm" onClick={() => { sim.stopSimulation(); onOpenChange(false); }}>
                  Sair da simulação
                </Button>
              )}
              <Button size="sm" onClick={startProfileSim} disabled={!selectedProfile}>
                Iniciar simulação
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="user" className="space-y-3 pt-3">
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um usuário" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u: any) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.full_name ?? u.email ?? u.id.slice(0, 8)}
                    {u.profile_type_id && (
                      <Badge variant="secondary" className="ml-2 text-[10px]">
                        {(profileById.get(u.profile_type_id) as any)?.display_name ?? "—"}
                      </Badge>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              {sim.state.active && (
                <Button variant="outline" size="sm" onClick={() => { sim.stopSimulation(); onOpenChange(false); }}>
                  Sair da simulação
                </Button>
              )}
              <Button size="sm" onClick={startUserSim} disabled={!selectedUser}>
                Iniciar simulação
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
