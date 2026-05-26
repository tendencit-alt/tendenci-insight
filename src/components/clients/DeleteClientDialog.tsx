import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Loader2, Trash2, Link2 } from "lucide-react";

interface ClientLite {
  id: string;
  name: string;
  nome_fantasia?: string | null;
}

interface Props {
  client: ClientLite | null;
  onClose: () => void;
  onDeleted: () => void;
}

// Mapping of related tables -> { label, fk column, behavior on delete }
// behavior: "cascade" (the row is also removed), "detach" (FK set to null, record kept), "block" (would prevent delete)
const RELATIONS: Array<{
  table: string;
  column: string;
  label: string;
  behavior: "cascade" | "detach" | "block";
  detail: string;
}> = [
  { table: "projects", column: "client_id", label: "Projetos", behavior: "cascade", detail: "serão excluídos junto com o cliente" },
  { table: "orders", column: "client_id", label: "Pedidos", behavior: "detach", detail: "manterão o histórico, mas ficarão sem cliente vinculado" },
  { table: "quotes", column: "client_id", label: "Orçamentos", behavior: "detach", detail: "manterão o histórico, sem cliente vinculado" },
  { table: "contracts", column: "client_id", label: "Contratos", behavior: "detach", detail: "manterão o histórico, sem cliente vinculado" },
  { table: "leads", column: "client_id", label: "Leads (CRM)", behavior: "detach", detail: "permanecerão, sem cliente vinculado" },
  { table: "production_orders", column: "client_id", label: "Ordens de Produção", behavior: "detach", detail: "permanecerão, sem cliente vinculado" },
  { table: "fin_receivables", column: "customer_id", label: "Contas a Receber", behavior: "detach", detail: "permanecerão no financeiro, sem cliente vinculado" },
  { table: "fin_ledger_entries", column: "client_id", label: "Lançamentos financeiros", behavior: "detach", detail: "permanecerão, sem cliente vinculado" },
];

type Counts = Record<string, number>;

export function DeleteClientDialog({ client, onClose, onDeleted }: Props) {
  const [counts, setCounts] = useState<Counts>({});
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!client) {
      setCounts({});
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const results: Counts = {};
      await Promise.all(
        RELATIONS.map(async (r) => {
          const { count } = await supabase
            .from(r.table as any)
            .select("id", { count: "exact", head: true })
            .eq(r.column, client.id);
          results[r.table] = count || 0;
        })
      );
      if (!cancelled) {
        setCounts(results);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client]);

  const totalImpact = RELATIONS.reduce((sum, r) => sum + (counts[r.table] || 0), 0);
  const impacted = RELATIONS.filter((r) => (counts[r.table] || 0) > 0);
  const cascadeRows = impacted.filter((r) => r.behavior === "cascade");
  const detachRows = impacted.filter((r) => r.behavior === "detach");

  function describePgError(err: any): { title: string; details: string[] } {
    const code = err?.code;
    const msg: string = err?.message || "";
    const details: string[] = [];

    // FK violation
    if (code === "23503") {
      const tableMatch = msg.match(/table "([^"]+)"/);
      const constraintMatch = msg.match(/constraint "([^"]+)"/);
      const refTable = tableMatch?.[1];
      const knownRel = RELATIONS.find((r) => r.table === refTable);
      details.push(
        knownRel
          ? `A tabela "${knownRel.label}" ainda possui registros vinculados que impedem a exclusão (constraint ${constraintMatch?.[1] || "FK"}).`
          : `Há registros em "${refTable || "outra tabela"}" referenciando este cliente (constraint ${constraintMatch?.[1] || "FK"}).`
      );
      details.push("Correção: remova ou desvincule os registros listados acima antes de excluir.");
      return { title: "Não foi possível excluir: existem vínculos protegidos", details };
    }

    // RLS
    if (code === "42501" || /row-level security|permission denied/i.test(msg)) {
      details.push("Seu perfil não tem permissão para excluir clientes deste tenant.");
      details.push("Correção: solicite a um Administrador/Owner que execute a exclusão ou ajuste suas permissões em Configurações → Usuários.");
      return { title: "Permissão negada", details };
    }

    // Not found
    if (code === "PGRST116") {
      details.push("O cliente não foi encontrado — talvez já tenha sido removido por outro usuário.");
      return { title: "Cliente não encontrado", details };
    }

    details.push(msg || "Erro desconhecido ao excluir o cliente.");
    if (err?.hint) details.push(`Sugestão do banco: ${err.hint}`);
    if (err?.details) details.push(err.details);
    return { title: "Erro ao excluir cliente", details };
  }

  async function handleDelete() {
    if (!client) return;
    setDeleting(true);
    const { error } = await supabase.from("clients").delete().eq("id", client.id);
    setDeleting(false);
    if (error) {
      const parsed = describePgError(error);
      toast.error(parsed.title, {
        description: parsed.details.join(" • "),
        duration: 10000,
      });
      return;
    }
    toast.success("Cliente excluído", {
      description: cascadeRows.length
        ? `${cascadeRows.reduce((s, r) => s + counts[r.table], 0)} registro(s) relacionado(s) também foram removidos.`
        : detachRows.length
        ? `${detachRows.reduce((s, r) => s + counts[r.table], 0)} registro(s) foram desvinculados (histórico preservado).`
        : undefined,
    });
    onDeleted();
  }

  const displayName = client?.nome_fantasia || client?.name || "";

  return (
    <AlertDialog open={!!client} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Excluir cliente "{displayName}"?
          </AlertDialogTitle>
        </AlertDialogHeader>

        <div className="space-y-3 text-sm">
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Verificando vínculos…
            </div>
          ) : impacted.length === 0 ? (
            <p className="text-muted-foreground">
              Nenhum vínculo encontrado. O cliente será removido permanentemente.
            </p>
          ) : (
            <>
              <p className="text-muted-foreground">
                Este cliente possui <strong>{totalImpact}</strong> registro(s) relacionado(s). Veja o que
                acontecerá com cada um:
              </p>

              {cascadeRows.length > 0 && (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
                  <div className="mb-1 flex items-center gap-2 font-medium text-destructive">
                    <Trash2 className="h-4 w-4" /> Serão excluídos em cascata
                  </div>
                  <ul className="ml-6 list-disc space-y-0.5">
                    {cascadeRows.map((r) => (
                      <li key={r.table}>
                        <strong>{counts[r.table]}</strong> {r.label} — {r.detail}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {detachRows.length > 0 && (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
                  <div className="mb-1 flex items-center gap-2 font-medium text-amber-600 dark:text-amber-400">
                    <Link2 className="h-4 w-4" /> Serão desvinculados (histórico preservado)
                  </div>
                  <ul className="ml-6 list-disc space-y-0.5">
                    {detachRows.map((r) => (
                      <li key={r.table}>
                        <strong>{counts[r.table]}</strong> {r.label} — {r.detail}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          <p className="text-xs text-muted-foreground">Esta ação não pode ser desfeita.</p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={loading || deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Excluindo…
              </>
            ) : (
              "Excluir"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
