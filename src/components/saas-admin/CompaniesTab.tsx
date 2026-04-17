import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useCompanyOverview, useAllPlans, useTenantInsights, type CompanyOverview } from "@/hooks/useSaasAdmin";
import { Building2, MoreHorizontal, Pause, Play, Sparkles, Search } from "lucide-react";
import { AdminActionDialog } from "./AdminActionDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const healthVariant = (c: string | null): "default" | "secondary" | "destructive" | "outline" => {
  if (c === "healthy") return "default";
  if (c === "attention") return "secondary";
  if (c === "risk" || c === "critical") return "destructive";
  return "outline";
};

const subStatusLabel: Record<string, string> = {
  trial: "Trial", active: "Ativo", past_due: "Inadimplente", suspended: "Suspenso", cancelled: "Cancelado",
};

export function CompaniesTab() {
  const { data: companies = [], isLoading } = useCompanyOverview();
  const { data: plans = [] } = useAllPlans();
  const insights = useTenantInsights();

  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<{ action: string; tenant: CompanyOverview; title: string; description: string; payload?: Record<string, unknown> } | null>(null);
  const [insightTenant, setInsightTenant] = useState<CompanyOverview | null>(null);

  const filtered = companies.filter((c) =>
    c.tenant_name.toLowerCase().includes(search.toLowerCase()) ||
    c.tenant_slug.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar empresa por nome ou slug..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
        <span className="text-sm text-muted-foreground ml-auto">{filtered.length} empresas</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />Centro de Controle de Empresas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead>Usuários</TableHead>
                  <TableHead>Inadimplência</TableHead>
                  <TableHead>Módulos</TableHead>
                  <TableHead>Último login</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.tenant_id}>
                    <TableCell>
                      <div className="font-medium">{c.tenant_name}</div>
                      <div className="text-xs text-muted-foreground">{c.tenant_slug}</div>
                    </TableCell>
                    <TableCell>{c.plan_name ?? <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>
                      <Badge variant={c.active ? "default" : "destructive"}>
                        {subStatusLabel[c.subscription_status ?? ""] ?? (c.active ? "Ativa" : "Inativa")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {c.health_score !== null ? (
                        <Badge variant={healthVariant(c.health_classification)}>
                          {Number(c.health_score).toFixed(0)} • {c.health_classification}
                        </Badge>
                      ) : <span className="text-muted-foreground text-xs">N/A</span>}
                    </TableCell>
                    <TableCell>{c.active_users}/{c.max_users}</TableCell>
                    <TableCell>
                      {c.overdue_invoices > 0 ? <Badge variant="destructive">{c.overdue_invoices}</Badge> : <span className="text-muted-foreground">0</span>}
                    </TableCell>
                    <TableCell>{c.active_modules}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.last_user_login ? format(new Date(c.last_user_login), "dd/MM/yy HH:mm", { locale: ptBR }) : "Nunca"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuItem onClick={() => { setInsightTenant(c); insights.mutate(c.tenant_id); }}>
                            <Sparkles className="h-4 w-4 mr-2" />Insights de IA
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {c.active ? (
                            <DropdownMenuItem onClick={() => setDialog({ action: "suspend_tenant", tenant: c, title: `Suspender ${c.tenant_name}`, description: "A empresa ficará inacessível e a assinatura entrará em status 'suspenso'." })}>
                              <Pause className="h-4 w-4 mr-2" />Suspender empresa
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => setDialog({ action: "activate_tenant", tenant: c, title: `Reativar ${c.tenant_name}`, description: "A empresa voltará a ter acesso e a assinatura entrará em status 'ativo'." })}>
                              <Play className="h-4 w-4 mr-2" />Reativar empresa
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <div className="px-2 py-1.5 text-xs text-muted-foreground">Trocar plano:</div>
                          {plans.filter((p) => p.id !== c.plan_id).map((p) => (
                            <DropdownMenuItem key={p.id} onClick={() => setDialog({ action: "change_plan", tenant: c, title: `Mudar para ${p.name}`, description: `Plano atual: ${c.plan_name ?? "—"} → ${p.name} (R$ ${p.price})`, payload: { new_plan_id: p.id } })}>
                              {p.name} — R$ {p.price}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {insightTenant && (insights.data || insights.isPending) && (
        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />Insights IA: {insightTenant.tenant_name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {insights.isPending ? (
              <p className="text-muted-foreground text-sm">Analisando...</p>
            ) : (
              <div className="text-sm whitespace-pre-line">{insights.data?.insights}</div>
            )}
          </CardContent>
        </Card>
      )}

      {dialog && (
        <AdminActionDialog
          open={!!dialog}
          onOpenChange={(v) => !v && setDialog(null)}
          action={dialog.action}
          title={dialog.title}
          description={dialog.description}
          target_tenant_id={dialog.tenant.tenant_id}
          payload={dialog.payload}
        />
      )}
    </div>
  );
}
