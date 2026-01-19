import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DeletedRecordsTab } from "@/components/settings/DeletedRecordsTab";

const Excluidos = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
            🗑️ Registros Excluídos
          </h1>
          <p className="text-muted-foreground text-lg">
            Visualize e rastreie todos os registros excluídos do sistema
          </p>
        </div>

        <DeletedRecordsTab />
      </div>
    </DashboardLayout>
  );
};

export default Excluidos;
