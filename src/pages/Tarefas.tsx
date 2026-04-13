import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { TaskCenter } from "@/components/tarefas/TaskCenter";

export default function Tarefas() {
  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-[1600px] space-y-4 p-4 md:p-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Central de Tarefas</h1>
          <p className="text-xs text-muted-foreground">
            Gerencie pendências e ações que exigem sua atenção.
          </p>
        </div>
        <TaskCenter />
      </div>
    </DashboardLayout>
  );
}
