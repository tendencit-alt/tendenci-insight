// Diálogo de composição de provisões CLT (férias OU 13º).
// Mostra TODOS os números que entraram no cálculo — transparência total.

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { brl, computeVacationProvision, computeThirteenthProvision } from "@/lib/clt-provisions";

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
  const v = isVac
    ? computeVacationProvision({ baseSalary, admissionDate })
    : null;
  const t = !isVac
    ? computeThirteenthProvision({ baseSalary, admissionDate })
    : null;

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
              <Row label="Saldo acumulado" value={brl(v.accruedBalance)} hint="provisão × meses" strong />
              <Sep />
              <Row label="Adicional de 1/3 (constitucional)" value={brl(v.oneThirdAdditional)} />
              <Row label="Férias integrais previstas" value={brl(v.fullVacation)} hint="salário × (1 + 1/3)" strong />
            </>
          )}

          {!isVac && t && (
            <>
              <Row label="Meses trabalhados no ano" value={`${t.monthsInYear} / 12`} />
              <Sep />
              <Row label="Provisão mensal" value={brl(t.monthlyProvision)} hint="salário ÷ 12" />
              <Row label="Saldo acumulado" value={brl(t.accruedBalance)} hint="provisão × meses" strong />
              <Sep />
              <Row label="13º integral" value={brl(t.fullThirteenth)} hint="1 salário" strong />
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
