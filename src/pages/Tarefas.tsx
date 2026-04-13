import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CentralOperacional } from "@/components/central-operacional/CentralOperacional";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Tarefas() {
  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-[1600px] space-y-4 p-4 md:p-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Central Operacional</h1>
          <p className="text-xs text-muted-foreground">
            {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })} — Seu cockpit de execução diária
          </p>
        </div>
        <CentralOperacional />
      </div>
    </DashboardLayout>
  );
}
