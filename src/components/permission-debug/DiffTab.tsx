import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useAllProfileTypes, useProfileDiff } from "@/hooks/usePermissionDebug";

export function DiffTab() {
  const { data: profiles } = useAllProfileTypes();
  const [a, setA] = useState<string>("");
  const [b, setB] = useState<string>("");
  const { data: diff, isLoading } = useProfileDiff(a, b);

  const onlyDiff = diff?.filter((d) => d.allowed_a !== d.allowed_b) ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Diferenças entre perfis</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Perfil A</label>
            <Select value={a} onValueChange={setA}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {profiles?.map((p) => <SelectItem key={p.id} value={p.id}>{p.display_name ?? p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Perfil B</label>
            <Select value={b} onValueChange={setB}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {profiles?.map((p) => <SelectItem key={p.id} value={p.id}>{p.display_name ?? p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading && <Loader2 className="h-6 w-6 animate-spin mx-auto" />}

      {diff && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Diferenças encontradas: {onlyDiff.length} de {diff.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {onlyDiff.length === 0 && (
              <p className="text-sm text-muted-foreground">Os perfis têm permissões críticas idênticas.</p>
            )}
            {onlyDiff.map((d) => (
              <div key={d.permission_key} className="flex items-center justify-between p-3 rounded-md border bg-card">
                <div>
                  <p className="text-sm font-medium">{d.label}</p>
                  <p className="text-xs text-muted-foreground">{d.module} • {d.permission_key}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={d.allowed_a ? "default" : "outline"}>A: {d.allowed_a ? "✓" : "✗"}</Badge>
                  <Badge variant={d.allowed_b ? "default" : "outline"}>B: {d.allowed_b ? "✓" : "✗"}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
