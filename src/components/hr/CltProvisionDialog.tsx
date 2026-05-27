// Diálogo de composição de provisões CLT (férias OU 13º) com encargos.
// Mostra base, cada encargo (FGTS, INSS/CPP, RAT, Terceiros) e o TOTAL.

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  brl, computeVacationProvision, computeThirteenthProvision,
  applyCharges, type PayrollCharges,
} from "@/lib/clt-provisions";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  kind: "vacation" | "thirteenth";
  employeeName: string;
  baseSalary: number;
  admissionDate?: string | null;
  charges?: PayrollCharges | null;
}

export function CltProvisionDialog({ open, onOpenChange, kind, employeeName, baseSalary, admissionDate, charges }: Props) {
  const isVac = kind === "vacation";
  const v = isVac ? computeVacationProvision({ baseSalary, admissionDate }) : null;
  const t = !isVac ? computeThirteenthProvision({ baseSalary, admissionDate }) : null;

  const accrued = isVac ? v!.accruedBalance : t!.accruedBalance;
  const full = isVac ? v!.fullVacation : t!.fullThirteenth;
  const accruedCharged = applyCharges(accrued, charges);
  const fullCharged = applyCharges(full, charges);

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
          <Row label="Data de admissão" value={admissionDate ?? "—"} />

          {isVac && v && (
            <>
              <Row label="Meses no período aquisitivo atual" value={`${v.monthsInPeriod} / 12`} />
              <Sep />
              <Row label="Provisão mensal" value={brl(v.monthlyProvision)} hint="(salário ÷ 12) × (1 + 1/3)" />
              <Row label="Saldo acumulado (base)" value={brl(v.accruedBalance)} hint="provisão × meses" />
            </>
          )}
          {!isVac && t && (
            <>
              <Row label="Meses trabalhados no ano" value={`${t.monthsInYear} / 12`} />
              <Sep />
              <Row label="Provisão mensal" value={brl(t.monthlyProvision)} hint="salário ÷ 12" />
              <Row label="Saldo acumulado (base)" value={brl(t.accruedBalance)} />
            </>
          )}

          <Sep />
          <div className="text-xs uppercase text-muted-foreground tracking-wide pt-1">
            Encargos sobre o acumulado
            {charges?.simples_optante && <span className="ml-2 normal-case text-[10px] opacity-70">(Simples: CPP zerado)</span>}
          </div>
          {accruedCharged.charges.map(c => (
            <Row key={c.label} label={`${c.label} (${c.pct.toFixed(2)}%)`} value={brl(c.amount)} />
          ))}
          <Row label="Total de encargos" value={brl(accruedCharged.totalCharges)} />
          <Row label="TOTAL provisionado (custo empregador)" value={brl(accruedCharged.total)} strong />

          <Sep />
          <div className="text-xs uppercase text-muted-foreground tracking-wide pt-1">
            {isVac ? "Férias integrais previstas" : "13º integral"}
          </div>
          <Row label="Base" value={brl(full)} />
          <Row label="+ Encargos" value={brl(fullCharged.totalCharges)} />
          <Row label="Total com encargos" value={brl(fullCharged.total)} strong />

          <p className="text-xs text-muted-foreground pt-2 border-t mt-3">
            {isVac ? v?.notes : t?.notes} Alíquotas configuráveis em Configurações &gt; RH.
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
