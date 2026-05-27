// Diálogo de composição de provisões CLT (férias OU 13º) — APENAS BASE.
// Mostra base, saldo acumulado, integral e os VENCIMENTOS legais com base na admissão.

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  brl, fmtDate, computeVacationProvision, computeThirteenthProvision,
} from "@/lib/clt-provisions";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  kind: "vacation" | "thirteenth";
  employeeName: string;
  baseSalary: number;
  admissionDate?: string | null;
}

export function CltProvisionDialog({ open, onOpenChange, kind, employeeName, baseSalary, admissionDate }: Props) {
  const isVac = kind === "vacation";
  const v = isVac ? computeVacationProvision({ baseSalary, admissionDate }) : null;
  const t = !isVac ? computeThirteenthProvision({ baseSalary, admissionDate }) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Composição — {isVac ? "Férias" : "13º Salário"} ({employeeName})
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-1 text-sm">
          <Row label="Salário base" value={brl(baseSalary)} />
          <Row label="Data de admissão" value={admissionDate ? fmtDate(admissionDate) : "—"} />

          {isVac && v && (
            <>
              <Row label="Meses no período aquisitivo atual" value={`${v.monthsInPeriod} / 12`} />
              <Sep />
              <Row label="Provisão mensal" value={brl(v.monthlyProvision)} hint="(salário ÷ 12) × (1 + 1/3)" />
              <Row label="Saldo acumulado" value={brl(v.accruedBalance)} hint="provisão × meses" strong />
              <Sep />
              <div className="text-xs uppercase text-muted-foreground tracking-wide pt-1">Férias integrais previstas</div>
              <Row label="Salário + 1/3" value={brl(v.fullVacation)} strong />
              <Sep />
              <div className="text-xs uppercase text-muted-foreground tracking-wide pt-1">Vencimentos</div>
              <Row label="Início do período aquisitivo atual" value={fmtDate(v.due.currentCycleStart)} />
              <Row label="Próximas férias vencem em" value={fmtDate(v.due.currentCycleEnd)} strong />
              <Row label="Limite de concessão" value={fmtDate(v.due.grantDeadline)} hint="vencimento + 12 meses (CLT art. 134)" />
            </>
          )}
          {!isVac && t && (
            <>
              <Row label="Meses trabalhados no ano" value={`${t.monthsInYear} / 12`} />
              <Sep />
              <Row label="Provisão mensal" value={brl(t.monthlyProvision)} hint="salário ÷ 12" />
              <Row label="Saldo acumulado" value={brl(t.accruedBalance)} strong />
              <Sep />
              <div className="text-xs uppercase text-muted-foreground tracking-wide pt-1">13º integral</div>
              <Row label="1 salário" value={brl(t.fullThirteenth)} strong />
              <Sep />
              <div className="text-xs uppercase text-muted-foreground tracking-wide pt-1">
                Vencimentos do ano · proporcional a {t.due.proportionalMonths}/12 meses
              </div>
              <Row label="13º proporcional do ano" value={brl(t.due.proportionalAmount)} />
              <Row label="1ª parcela (até 30/11)" value={`${fmtDate(t.due.firstInstallmentDue)} · ${brl(t.due.firstAmount)}`} strong />
              <Row label="2ª parcela (até 20/12)" value={`${fmtDate(t.due.secondInstallmentDue)} · ${brl(t.due.secondAmount)}`} strong />
            </>
          )}

          <p className="text-xs text-muted-foreground pt-2 border-t mt-3">
            {isVac ? v?.notes : t?.notes}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, hint, strong }: { label: string; value: string; hint?: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <div className="text-muted-foreground">
        {label}
        {hint && <div className="text-[10px] opacity-70">{hint}</div>}
      </div>
      <div className={strong ? "font-semibold tabular-nums" : "tabular-nums"}>{value}</div>
    </div>
  );
}
function Sep() { return <div className="border-t my-1" />; }
