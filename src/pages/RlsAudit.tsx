import { useState } from "react";
import { CheckCircle2, AlertTriangle, ShieldCheck, Loader2, Play } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface MissingHelperRow {
  schemaname: string;
  tablename: string;
  policyname: string;
  cmd: string;
  reason: string;
  qual: string | null;
  with_check: string | null;
}

interface DirectReadRow {
  schemaname: string;
  tablename: string;
  policyname: string;
  cmd: string;
  snippet: string;
}

export default function RlsAudit() {
  const { profile } = useAuth();
  const isOwner = !!profile?.is_owner;

  const [running, setRunning] = useState(false);
  const [ranAt, setRanAt] = useState<Date | null>(null);
  const [missing, setMissing] = useState<MissingHelperRow[] | null>(null);
  const [direct, setDirect] = useState<DirectReadRow[] | null>(null);

  const runAudit = async () => {
    setRunning(true);
    try {
      const [a, b] = await Promise.all([
        supabase.rpc("audit_tenant_rls_policies" as any),
        supabase.rpc("audit_tenant_rls_direct_profile_reads" as any),
      ]);
      if (a.error) throw a.error;
      if (b.error) throw b.error;
      setMissing((a.data as MissingHelperRow[]) ?? []);
      setDirect((b.data as DirectReadRow[]) ?? []);
      setRanAt(new Date());
      toast.success("Auditoria concluída");
    } catch (err: any) {
      toast.error("Falha ao executar auditoria", { description: err?.message });
    } finally {
      setRunning(false);
    }
  };

  if (!isOwner) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Apenas o owner da plataforma pode executar a auditoria de RLS.
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const totalIssues = (missing?.length ?? 0) + (direct?.length ?? 0);
  const passed = ranAt && totalIssues === 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShieldCheck className="h-6 w-6" />
              Auditoria de RLS multi-tenant
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Valida que todas as policies de tabelas com <code>tenant_id</code> roteiam
              pelo helper <code>tenant_rls_check()</code> (que respeita o tenant ativo em
              <code> profiles.current_tenant_id</code>) e que nenhuma policy lê
              <code> profiles.tenant_id</code> diretamente.
            </p>
          </div>
          <Button onClick={runAudit} disabled={running} className="gap-2">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Executar auditoria
          </Button>
        </div>

        {ranAt && (
          <Card className={passed ? "border-emerald-500/40" : "border-destructive/40"}>
            <CardContent className="py-4 flex items-center gap-3">
              {passed ? (
                <>
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                  <div>
                    <div className="font-medium">Tudo certo</div>
                    <div className="text-xs text-muted-foreground">
                      Todas as policies tenant-scoped usam <code>tenant_rls_check</code>.
                      Última execução: {ranAt.toLocaleString()}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                  <div>
                    <div className="font-medium">{totalIssues} problema(s) encontrado(s)</div>
                    <div className="text-xs text-muted-foreground">
                      Última execução: {ranAt.toLocaleString()}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              Policies sem <code>tenant_rls_check</code>
              <Badge variant={missing?.length ? "destructive" : "secondary"}>
                {missing?.length ?? "—"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!missing ? (
              <p className="text-sm text-muted-foreground">Execute a auditoria.</p>
            ) : missing.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma policy não conforme.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tabela</TableHead>
                    <TableHead>Policy</TableHead>
                    <TableHead>Cmd</TableHead>
                    <TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {missing.map((r) => (
                    <TableRow key={`${r.tablename}.${r.policyname}.${r.cmd}`}>
                      <TableCell className="font-mono text-xs">{r.tablename}</TableCell>
                      <TableCell className="text-xs">{r.policyname}</TableCell>
                      <TableCell><Badge variant="outline">{r.cmd}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.reason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              Policies que leem <code>profiles.tenant_id</code> direto
              <Badge variant={direct?.length ? "destructive" : "secondary"}>
                {direct?.length ?? "—"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!direct ? (
              <p className="text-sm text-muted-foreground">Execute a auditoria.</p>
            ) : direct.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma policy contorna o switch de tenant.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tabela</TableHead>
                    <TableHead>Policy</TableHead>
                    <TableHead>Cmd</TableHead>
                    <TableHead>Trecho</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {direct.map((r) => (
                    <TableRow key={`${r.tablename}.${r.policyname}.${r.cmd}`}>
                      <TableCell className="font-mono text-xs">{r.tablename}</TableCell>
                      <TableCell className="text-xs">{r.policyname}</TableCell>
                      <TableCell><Badge variant="outline">{r.cmd}</Badge></TableCell>
                      <TableCell className="text-xs font-mono max-w-md truncate" title={r.snippet}>
                        {r.snippet}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
